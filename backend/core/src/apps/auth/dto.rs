use serde::{Serialize, Deserialize};

#[derive(Deserialize)]
pub struct GoogleLoginRequest {
    pub token: String,
}

#[derive(Deserialize)]
pub struct TelegramLoginRequest {
    pub init_data: String,
}

#[derive(Serialize)]
pub struct UserStatusResponse {
    pub tg_id: i64,
    pub can_claim: bool,
    pub last_claim_at: Option<String>,
}


use validator::Validate;

#[derive(Deserialize, Validate)]
pub struct EmailRegisterRequest {
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
    
    #[validate(length(min = 8, message = "Password must be at least 8 characters long"))]
    pub password: String,
    
    #[validate(length(min = 2, max = 50, message = "Name must be between 2 and 50 characters"))]
    pub name: String,
}

#[derive(Deserialize, Validate)]
pub struct EmailLoginRequest {
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
    #[validate(length(min = 1, message = "Password is required"))]
    pub password: String,
}