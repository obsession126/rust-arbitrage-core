use serde::{Serialize, Deserialize};
use uuid::Uuid;

#[derive(serde::Deserialize)]
pub struct CreatePaymentRequest {
    pub tg_id: i64, // Бот шле саме tg_id
    pub category: String,
    pub rank: String,
    pub quantity: i32,
}

#[derive(Deserialize)]
pub struct ConfirmPaymentRequest {
    pub transaction_id: Uuid,
}