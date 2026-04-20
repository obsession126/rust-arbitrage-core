use uuid::Uuid;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: Uuid,
    pub email: Option<String>,
    pub tg_id: Option<i64>,
    pub name: String,
    pub provider: String,
    pub is_new: bool,
    pub password_hash: Option<String>,
}