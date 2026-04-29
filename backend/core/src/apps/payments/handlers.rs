use actix_web::{web, HttpResponse, HttpRequest, Error as ActixError};
use uuid::Uuid;
use sqlx::PgPool;
use serde::{Deserialize, Serialize};
use serde_json::json;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use hex;
use crate::apps::auth::jwt::UserClaims;
use crate::apps::payments::service::confirm_payment_tx;

// Важливо: Додай ці структури, щоб serde знав, як парсити відповідь від Lemon
#[derive(Deserialize)]
struct LemonWebhookPayload {
    data: WebhookData,
    meta: WebhookMeta,
}

#[derive(Deserialize)]
struct WebhookData {
    attributes: WebhookAttributes,
}

#[derive(Deserialize)]
struct WebhookAttributes {
    variant_id: serde_json::Value, 
    item_count: i64,
}

#[derive(Deserialize)]
struct WebhookMeta {
    event_name: String,
    custom_data: CustomData,
}

#[derive(Deserialize)]
struct CustomData {
    tx_id: Uuid,
}

#[derive(Deserialize)]
pub struct OrderRequest {
    pub niche: String,
    pub rank: String,
    pub qty: i32, // Додаємо кількість
}

// 1. Створення замовлення
// ... (імпорти залишаються ті самі)

pub async fn create_order_handler(
    pool: web::Data<PgPool>,
    payload: web::Json<OrderRequest>,
    user: UserClaims, 
) -> Result<HttpResponse, ActixError> {
    // Вставляємо замовлення
    let tx_id: Uuid = sqlx::query_scalar!(
        "INSERT INTO transactions (user_id, status, niche, rank, amount) VALUES ($1, 'pending', $2, $3, $4) RETURNING id",
        user.id, 
        payload.niche, 
        payload.rank, 
        payload.qty // i32
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e.to_string()))?;

    let variant_id = get_variant_id(&payload.rank);
    
    // Правильний формат для Lemon Squeezy
    // Використовуй параметр quantity= замість checkout[quantity]
    let checkout_url = format!(
        "https://leadhunterosn.lemonsqueezy.com/checkout/buy/{}?quantity={}&checkout[custom][tx_id]={}",
        variant_id, 
        payload.qty,
        tx_id
    );

    Ok(HttpResponse::Ok().json(json!({ "url": checkout_url })))
}


// 2. Обробник Вебхука
pub async fn lemon_webhook(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    body: web::Bytes, // Зберігаємо сирі байти
) -> HttpResponse {
    
    // 1. Беремо підпис із заголовків
    let signature = req.headers()
        .get("X-Signature")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");

    let secret = std::env::var("LEMON_WEBHOOK_SECRET").unwrap_or_default();

    // 2. ВАЖЛИВО: Перевіряємо підпис САМЕ по сирих байтах (body)
    if !verify_signature(&body, signature, &secret) {
        log::warn!("SECURITY: Спроба фейкового вебхука!");
        return HttpResponse::Unauthorized().finish();
    }

    // 3. І ТІЛЬКИ ПІСЛЯ ЦЬОГО парсимо JSON
    let data: LemonWebhookPayload = match serde_json::from_slice(&body) {
        Ok(d) => d,
        Err(_) => return HttpResponse::BadRequest().finish(),
    };

    if data.meta.event_name == "order_created" {
        let tx_id = data.meta.custom_data.tx_id;
        // Перетворюємо будь-яке значення variant_id на рядок для мапінгу
        let variant_id = data.data.attributes.variant_id.to_string().replace('"', ""); 
        let qty = data.data.attributes.item_count;

        // Передаємо qty четвертим аргументом
        match confirm_payment_tx(&pool, tx_id, &variant_id, qty).await {
            Ok(_) => return HttpResponse::Ok().finish(),
            Err(e) => return HttpResponse::InternalServerError().body(e),
        }
    }

    HttpResponse::Ok().finish()
}

// 3. Безпечна перевірка підпису
fn verify_signature(payload: &[u8], signature: &str, secret: &str) -> bool {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;

    type HmacSha256 = Hmac<Sha256>;

    // Створюємо мак-інстанс з твоїм секретом
    let mut mac = match HmacSha256::new_from_slice(secret.as_bytes()) {
        Ok(m) => m,
        Err(_) => return false,
    };

    // Оновлюємо мак даними, які прийшли в тілі запиту
    mac.update(payload);

    // Отримуємо результат у байтах
    let result = mac.finalize().into_bytes();
    
    // Перетворюємо підпис з заголовка (hex) назад у байти для порівняння
    let signature_bytes = match hex::decode(signature) {
        Ok(b) => b,
        Err(_) => return false,
    };

    // Порівнюємо байти (це безпечніше, ніж порівнювати стрінги)
    // Використовуємо constant time comparison, якщо бібліотека дозволяє, 
    // або просто порівнюємо результати:
    result.as_slice() == signature_bytes.as_slice()
}

// Заглушка мапінгу (допиши свої ID)
fn get_variant_id(rank: &str) -> &str {
    match rank {
        "silver" => "61e53ba2-789e-4412-9653-4b3304e464ed",
        "gold" => "f9aaec65-f201-47fc-ac94-f0aed1664b10",
        "platinum" => "46b8b264-fe58-4626-bb05-27fff988a13e",
        _ => "61e53ba2-789e-4412-9653-4b3304e464ed",
    }
}