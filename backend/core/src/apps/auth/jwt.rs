use jsonwebtoken::{encode, decode, Header, EncodingKey, DecodingKey, Validation, Header as JwtHeader};
use serde::{Serialize, Deserialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserClaims {
    pub id: Uuid,          // ID юзера з бази (UUID)
    pub email: String,     // Email юзера
    pub exp: usize,        // Час життя токена (Timestamp)
}
use actix_web::{FromRequest, HttpRequest, dev::Payload, Error as ActixError};
use futures_util::future::{ready, Ready};

impl FromRequest for UserClaims {
    type Error = ActixError;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        // Дістаємо токен із заголовка Authorization: Bearer <token>
        if let Some(auth_header) = req.headers().get("Authorization") {
            if let Ok(auth_str) = auth_header.to_str() {
                if auth_str.starts_with("Bearer ") {
                    let token = &auth_str[7..];
                    // Тут має бути твоя секретна сіль (SECRET KEY)
                    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "fixed_secret_for_dev_only_123".into());
                    
                    // Викликаємо твій decode_jwt (який ми бачили вище)
                    // Тільки врахуй, що decode_jwt має повертати UserClaims, а не Claims
                    match decode::<UserClaims>(
                        token,
                        &jsonwebtoken::DecodingKey::from_secret(secret.as_ref()),
                        &jsonwebtoken::Validation::default(),
                    ) {
                        Ok(data) => return ready(Ok(data.claims)),
                        Err(_) => return ready(Err(actix_web::error::ErrorUnauthorized("Invalid token"))),
                    }
                }
            }
        }
        ready(Err(actix_web::error::ErrorUnauthorized("No token provided")))
    }
}

pub fn create_jwt(user_id: Uuid, email: &str, secret: &str) -> String {
    let exp = (chrono::Utc::now().timestamp() + 86400) as usize;

    let claims = UserClaims {
        id: user_id,
        email: email.to_string(),
        exp,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    ).unwrap()
}

// Виправлено: додано імпорти та правильний тип Result
pub fn decode_jwt(token: &str, secret: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default(),
    ).map(|data| data.claims)
}