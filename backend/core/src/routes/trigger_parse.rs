use redis::AsyncCommands;
use serde_json::json;

pub async fn exec(
    redis_client: &redis::Client,
    target_name: String,
    target_count: i32,
    lead_id: String
) -> Result<(), redis::RedisError> {
    let mut conn = redis_client.get_async_connection().await?;
    let task = json!({
        "target": target_name,
        "count": target_count,
        "id": lead_id,
        "type": "deep_scan"
    }).to_string();
    let _: () = conn.lpush("osint_tasks", task).await?;
    Ok(())
}