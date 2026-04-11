use google_jwt_verify::Client;

#[post("/auth/telegram")]
async fn auth_telegram(
    pool: web::Data<sqlx::PgPool>,
    data: web::Json<TelegramAuthRequest>, // Отримуємо id та username з ТГ
) -> impl Responder {
    // 1. Шукаємо юзера або створюємо нового (UPSERT)
    let user = sqlx::query_as!(
        User,
        r#"
        INSERT INTO users (tg_id, username, referral_code)
        VALUES ($1, $2, encode(gen_random_bytes(6), 'hex'))
        ON CONFLICT (tg_id) DO UPDATE SET username = EXCLUDED.username
        RETURNING id, tg_id, username, referral_code, spins_count
        "#,
        data.tg_id,
        data.username
    )
    .fetch_one(pool.get_ref())
    .await;

    match user {
        Ok(u) => {
            let token = create_jwt(u.id).unwrap();
            HttpResponse::Ok().json(serde_json::json!({ "token": token, "user": u }))
        },
        Err(_) => HttpResponse::InternalServerError().finish(),
    }
}


#[post("/auth/google")]
async fn auth_google(
    pool: web::Data<sqlx::PgPool>,
    payload: web::Json<GoogleAuthRequest>, // Отримуємо id_token з фронта
) -> impl Responder {
    let client_id = std::env::var("GOOGLE_CLIENT_ID").expect("GOOGLE_CLIENT_ID must be set");
    let client = Client::new(&client_id);

    // 1. Перевіряємо токен через сервери Google
    let id_token = match client.verify_id_token(&payload.id_token) {
        Ok(token) => token,
        Err(_) => return HttpResponse::Unauthorized().json("Invalid Google Token"),
    };

    let email = id_token.get_payload().get_email().unwrap();
    let name = id_token.get_payload().get_name().unwrap_or("User");

    // 2. UPSERT юзера (створюємо або оновлюємо)
    let user = sqlx::query_as!(
        User,
        r#"
        INSERT INTO users (email, username, referral_code)
        VALUES ($1, $2, encode(gen_random_bytes(6), 'hex'))
        ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
        RETURNING id, tg_id, username, referral_code, spins_count
        "#,
        email,
        name
    )

    match user {
        Ok(u) => {
            let token = create_jwt(u.id).unwrap();
            HttpResponse::Ok().json(serde_json::json!({ "token": token, "user": u }))
        },
        Err(_) => HttpResponse::InternalServerError().finish(),
    }
}