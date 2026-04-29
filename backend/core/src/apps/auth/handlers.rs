use actix_web::{web, HttpResponse};
use sqlx::PgPool;

use crate::apps::auth::service::{google_auth, telegram_auth};
use crate::apps::auth::jwt::create_jwt;
use chrono::Utc;

use crate::apps::auth::dto::{UserStatusResponse, EmailRegisterRequest, GoogleLoginRequest, TelegramLoginRequest, EmailLoginRequest};

use bcrypt::{hash, DEFAULT_COST};

use validator::Validate;

pub async fn email_register_handler(
    pool: web::Data<PgPool>,
    jwt_secret: web::Data<String>,
    body: web::Json<EmailRegisterRequest>,
) -> HttpResponse {
    if let Err(e) = body.validate() {
        return HttpResponse::BadRequest().json(e); 
    }

    let secret = jwt_secret.get_ref(); 

    let clean_email = body.email.trim().to_lowercase();
    let clean_name = body.name.trim();

    let password_hash = match hash(&body.password, DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => return HttpResponse::InternalServerError().body("Password hashing failed"),
    };

    let result = sqlx::query!(
        r#"
        INSERT INTO users (email, name, provider, password_hash, is_new)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        "#,
        clean_email,
        clean_name,
        "email",
        password_hash,
        true
    )
    .fetch_one(pool.get_ref())
    .await;

    match result {
        Ok(record) => {
            let token = create_jwt(record.id, &body.email, secret);

            HttpResponse::Ok().json(serde_json::json!({
                "token": token,
                "user_id": record.id,
                "message": "User registered successfully"
            }))
        }
        Err(e) => {
            if let Some(db_err) = e.as_database_error() {
                if db_err.code() == Some(std::borrow::Cow::Borrowed("23505")) {
                    return HttpResponse::BadRequest().body("User with this email already exists");
                }
            }
            HttpResponse::InternalServerError().body("Database error")
        }
    }
}

pub async fn email_login_handler(
    pool: web::Data<PgPool>,
    body: web::Json<EmailLoginRequest>,
) -> HttpResponse {
    if let Err(e) = body.validate() {
        return HttpResponse::BadRequest().json(e);
    }

    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let clean_email = body.email.trim().to_lowercase();

    let user_result = sqlx::query!(
        r#"
        SELECT id, password_hash, provider
        FROM users
        WHERE email = $1
        "#,
        clean_email
    )
    .fetch_optional(pool.get_ref())
    .await;

    match user_result {
        Ok(Some(user)) => {
            let stored_hash = match user.password_hash {
                Some(h) => h,
                None => return HttpResponse::BadRequest().body("This account uses social login. Please sign in with Google/Telegram."),
            };

            match bcrypt::verify(&body.password, &stored_hash) {
                Ok(true) => {
                    let token = create_jwt(user.id, &body.email, &jwt_secret);
                    HttpResponse::Ok().json(serde_json::json!({
                        "token": token,
                        "user_id": user.id
                    }))
                }
                _ => HttpResponse::BadRequest().body("Invalid email or password"),
            }
        }
        Ok(None) => HttpResponse::BadRequest().body("Invalid email or password"),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

pub async fn user_status_handler(
    pool: web::Data<PgPool>,
    path: web::Path<i64>,
) -> HttpResponse {
    let tg_id = path.into_inner();
    let user = sqlx::query!(
        r#"
        SELECT last_free_lead_at
        FROM users
        WHERE tg_id = $1
        "#,
        tg_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    match user {
        Ok(Some(u)) => {
            let can_claim = match u.last_free_lead_at {
                Some(time) => {
                    let diff = Utc::now() - time;
                    diff.num_hours() >= 24
                }
                None => true,
            };

            HttpResponse::Ok().json(UserStatusResponse {
                tg_id,
                can_claim,
                last_claim_at: u.last_free_lead_at.map(|t| t.to_string()),
            })
        }

        Ok(None) => {
            HttpResponse::Ok().json(UserStatusResponse {
                tg_id,
                can_claim: true,
                last_claim_at: None,
            })
        }

        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

pub async fn google_handler(
    pool: web::Data<PgPool>,
    body: web::Json<GoogleLoginRequest>,
) -> HttpResponse {
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    match google_auth(pool.get_ref(), body.token.clone()).await {
        Ok(user) => {
            let email_str = user.email.as_deref().unwrap_or("");
            let token = create_jwt(user.id, email_str, &jwt_secret);

            HttpResponse::Ok().json(serde_json::json!({
                "token": token,
                "user": user
            }))
        }
        Err(e) => HttpResponse::BadRequest().body(e),
    }
}

pub async fn telegram_handler(
    pool: web::Data<PgPool>,
    body: web::Json<TelegramLoginRequest>,
) -> HttpResponse {
    let bot_token = std::env::var("BOT_TOKEN").expect("BOT_TOKEN must be set");
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    match telegram_auth(
        pool.get_ref(),
        body.init_data.clone(),
        &bot_token
    ).await {
        Ok(user) => {
            let email_str = user.email.as_deref().unwrap_or("");
            let token = create_jwt(user.id, email_str, &jwt_secret);

            HttpResponse::Ok().json(serde_json::json!({
                "token": token,
                "user": user
            }))
        }
        Err(e) => HttpResponse::BadRequest().body(e),
    }
}