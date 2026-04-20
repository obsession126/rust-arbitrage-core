use uuid::Uuid;
use crate::apps::auth::model::User;
use crate::apps::auth::repo;
use sqlx::PgPool;
use std::collections::HashMap;

use hmac::{Hmac, Mac};
use sha2::{Sha256, Digest};

type HmacSha256 = Hmac<Sha256>;


pub fn verify_telegram(
    init_data: &str,
    bot_token: &str
) -> Result<HashMap<String, String>, String> {

    let mut data = HashMap::new();

    for pair in init_data.split('&') {
        let mut split = pair.split('=');
        if let (Some(k), Some(v)) = (split.next(), split.next()) {
            data.insert(k.to_string(), v.to_string());
        }
    }

    let hash = data.get("hash").ok_or("No hash")?.clone();

    let mut data_check: Vec<String> = data
        .iter()
        .filter(|(k, _)| *k != "hash")
        .map(|(k, v)| format!("{}={}", k, v))
        .collect();

    data_check.sort();
    let data_check_string = data_check.join("\n");

    let secret = Sha256::digest(bot_token.as_bytes());

    let mut mac = HmacSha256::new_from_slice(&secret)
        .map_err(|e| e.to_string())?;

    mac.update(data_check_string.as_bytes());

    let result = hex::encode(mac.finalize().into_bytes());

    if result != hash {
        return Err("Invalid telegram signature".into());
    }

    Ok(data)
}

pub async fn telegram_auth(
    pool: &PgPool,
    init_data: String,
    bot_token: &str
) -> Result<User, String> {

    let data = verify_telegram(&init_data, bot_token)?;

    let tg_id = data
        .get("id")
        .ok_or("No id")?
        .parse::<i64>()
        .map_err(|_| "Invalid id")?;

    let name = data
        .get("first_name")
        .cloned()
        .unwrap_or("Telegram User".into());

    if let Some(user) = repo::find_by_tg(pool, tg_id).await {
        return Ok(user);
    }

    let user = User {
        id: Uuid::new_v4(),
        email: None,
        tg_id: Some(tg_id),
        name,
        provider: "telegram".into(),
        password_hash: None,
        is_new: true,
    };

    repo::create_user(pool, &user)
        .await
        .map_err(|e| e.to_string())?;

    Ok(user)
}

use reqwest;
use serde_json::Value;

pub async fn google_auth(
    pool: &PgPool,
    token: String
) -> Result<User, String> {

    let url = format!(
        "https://oauth2.googleapis.com/tokeninfo?id_token={}",
        token
    );

    let resp: Value = reqwest::get(url)
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let email = resp["email"]
        .as_str()
        .ok_or("No email")?
        .to_string();

    let name = resp["name"]
        .as_str()
        .unwrap_or("Google User")
        .to_string();

    if let Some(user) = repo::find_by_email(pool, &email).await {
        return Ok(user);
    }

    let user = User {
        id: Uuid::new_v4(),
        email: Some(email),
        tg_id: None,
        name,
        provider: "google".into(),
        password_hash: None,
        is_new: true,
    };

    repo::create_user(pool, &user)
        .await
        .map_err(|e| e.to_string())?;

    Ok(user)
}