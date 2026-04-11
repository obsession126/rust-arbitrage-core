use actix_web::{dev::Payload, FromRequest, HttpRequest, HttpResponse, Error};
use futures::future::{ready, Ready};
use jsonwebtoken::{decode, DecodingKey, Validation};
use crate::models::Claims;

pub struct AuthenticatedUser(pub uuid::Uuid);

impl FromRequest for AuthenticatedUser {
    type Error = Error;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        let auth = req.headers().get("Authorization");
        
        if let Some(auth_str) = auth.and_then(|h| h.to_str().ok()) {
            if auth_str.starts_with("Bearer ") {
                let token = &auth_str[7..]; 
                let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
                let token = auth_str.trim_start_with("Bearer ");
                let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
                
                if let Ok(token_data) = decode::<Claims>(
                    token,
                    &DecodingKey::from_secret(secret.as_ref()),
                    &Validation::default(),
                ) {
                    return ready(Ok(AuthenticatedUser(token_data.claims.sub)));
                }
            }
        }
        
        ready(Err(actix_web::error::ErrorUnauthorized("❌ Потрібна авторизація")))
    }
}