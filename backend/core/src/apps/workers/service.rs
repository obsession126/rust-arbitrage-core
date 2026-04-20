use redis::{AsyncCommands, Client};
use serde_json::json;
use uuid::Uuid;

pub async fn create_osint_task(
    redis: &Client,
    name: String,
    url: Option<String>,
) -> Result<String, Box<dyn std::error::Error>> {
    let mut conn = redis.get_async_connection().await?;
    let task_id = Uuid::new_v4().to_string();

    let task = json!({
        "lead_id": task_id,
        "payload": {
            "name": name,
            "target_url": url.unwrap_or_else(|| "".to_string())
        }
    });

    // Кидаємо в чергу 'osint_tasks', яку слухає твій Python воркер
    let _: () = conn.lpush("osint_tasks", task.to_string()).await?;
    Ok(task_id)
}

pub async fn create_maps_task(
    redis: &Client,
    niche: String,    // Змінив назву для ясності
    location: String, // Змінив назву для ясності
    limit: i32,
) -> Result<String, Box<dyn std::error::Error>> {
    let mut conn = redis.get_multiplexed_async_connection().await?; // Використовуй multiplexed
    let task_id = Uuid::new_v4().to_string();

    let task = json!({
        "task_id": task_id,
        "name": niche,       // Тепер Python знайде 'name'
        "location": location, // Тепер Python знайде 'location'
        "limit": limit
    });

    let _: () = conn.lpush("maps_tasks", task.to_string()).await?;
    Ok(task_id)
}