use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};



#[derive(Debug, Serialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub tg_id: Option<i64>,
    pub username: String,
    pub referral_code: String,
    pub spins_count: i32,
}


#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,      
    pub exp: usize,    
}


#[derive(Debug, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "lead_status", rename_all = "lowercase")]
pub enum LeadStatus {
    New,
    Processing,
    Completed,
    Failed,
}

#[derive(Debug, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "lead_rank", rename_all = "lowercase")]
pub enum LeadRank {
    Silver,
    Gold,
    Platinum,
    None,
}

// Головна модель ліда
#[derive(Debug, Serialize, FromRow)]
pub struct Lead {
    pub id: Uuid,
    pub target_name: String,
    pub target_url: String,
    pub status: LeadStatus,
    pub rank: LeadRank,
    pub is_active: bool,
    pub raw_data: Option<serde_json::Value>, // JSONB з бази
    pub error_log: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_scanned_at: Option<DateTime<Utc>>,
}



#[derive(Debug, Deserialize)]
pub struct ParseRequest {
    pub target_name: String,
    pub count: i32,
    pub id: String, // Це може бути зовнішній ID або UUID
}