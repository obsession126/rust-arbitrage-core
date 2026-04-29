use uuid::Uuid;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use sqlx::FromRow;
use sqlx::types::JsonValue;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct LeadResponse {
    pub id: Uuid,
    pub target_name: String,
    pub target_url: String,
    pub category: String,
    pub rank: String, 
    pub status: Option<String>,         // Тут Option, бо status може бути null
    pub created_at: Option<DateTime<Utc>>, // Тут теж Option
}

#[derive(serde::Serialize)]
pub struct Stock {
    pub silver: i64,
    pub gold: i64,
    pub platinum: i64,
}

#[derive(serde::Serialize)]
pub struct CatalogItem {
    pub category: String,
    pub stock: Stock,
}


// dto.rs
#[derive(serde::Deserialize)]
pub struct ClaimFreeLeadRequest {
    pub user_id: i64,
}


#[derive(serde::Deserialize)]
pub struct Dashboard {
    pub user_id: i64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct LeadRow {
    pub id: Uuid,
    pub target_name: String,
    pub target_url: String,
    pub category: String,
    pub rank: String, 
    pub status: Option<String>,
    pub raw_data: Option<serde_json::Value>,
    pub created_at: Option<DateTime<Utc>>,
}


#[derive(Serialize)]
pub struct LeadIntelResponse {
    pub id: i32,
    pub company_name: String,
    pub industry: String,
    pub location: String,
    pub contact_name: String,
    pub phone: String,
    pub email: String,
    pub linkedin: String,
    pub intel: JsonValue, 
}