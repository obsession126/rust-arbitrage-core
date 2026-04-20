use uuid::Uuid;
use serde::{Serialize, Deserialize};

#[derive(Serialize)]
pub struct CatalogItem {
    pub category: String,
    pub available_count: i64,
    pub ranks: Vec<String>,
}


#[derive(Deserialize)]
pub struct ClaimFreeLeadRequest {
    pub user_id: Uuid,
}