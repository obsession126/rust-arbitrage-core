use jsonwebtoken::{encode, Header, EncodingKey};
use serde::{Serialize, Deserialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

pub fn create_jwt(user_id: Uuid, secret: &str) -> String {
    let exp = chrono::Utc::now().timestamp() + 86400;

    encode(
        &Header::default(),
        &Claims {
            sub: user_id.to_string(),
            exp: exp as usize,
        },
        &EncodingKey::from_secret(secret.as_ref()),
    ).unwrap()
}