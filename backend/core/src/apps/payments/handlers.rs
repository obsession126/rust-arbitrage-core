use actix_web::{web, HttpResponse};
use uuid::Uuid;
use sqlx::PgPool;

use crate::apps::payments::dto::{CreatePaymentRequest, ConfirmPaymentRequest};
use crate::apps::payments::repo::create_tx;
use crate::apps::payments::service::confirm_payment_tx;

pub async fn create_payment(
    pool: web::Data<PgPool>,
    body: web::Json<CreatePaymentRequest>,
) -> HttpResponse {
    let tx_id = Uuid::new_v4();

    // 💰 Ціни (можна винести в константи)
    let unit_price = match body.rank.as_str() {
        "silver" => 2,
        "gold" => 5,
        "platinum" => 10,
        _ => 1,
    };

    let quantity = match body.quantity {
        10 | 50 | 100 => body.quantity,
        _ => 10,
    };

    let discount = match quantity {
        50 => 0.9,
        100 => 0.8,
        _ => 1.0,
    };

    let amount = (unit_price as f32 * quantity as f32 * discount) as i32;

    // Шукаємо внутрішній UUID користувача за його tg_id
    let user = sqlx::query!("SELECT id FROM users WHERE tg_id = $1", body.tg_id)
        .fetch_optional(pool.get_ref())
        .await;

    let user_uuid = match user {
        Ok(Some(u)) => u.id,
        _ => return HttpResponse::BadRequest().body("User not found"),
    };

    // Замість quantity
    let result = sqlx::query!(
        "INSERT INTO transactions (id, user_id, amount, quantity, status)
         VALUES ($1, $2, $3, $4, 'pending')",
        tx_id,
        user_uuid,
        amount,
        quantity as i64
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "transaction_id": tx_id.to_string(),
            "amount": amount,
            "quantity": quantity
        })),
        Err(e) => {
            eprintln!("DB Error: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn confirm_payment(
    pool: web::Data<PgPool>,
    body: web::Json<ConfirmPaymentRequest>,
) -> HttpResponse {
    // Тепер сервіс повертає String (весь текст звіту)
    match confirm_payment_tx(pool.get_ref(), body.transaction_id).await {
        Ok(report_text) => HttpResponse::Ok().json(serde_json::json!({
            "report": report_text
        })),
        Err(e) => HttpResponse::BadRequest().body(e),
    }
}