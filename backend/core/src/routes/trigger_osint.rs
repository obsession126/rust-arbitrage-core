use serde::Serialize;
use chrono::Utc;
use uuid::Uuid;
use redis::AsyncCommands;

#[derive(Serialize)]
struct OsintTask {
    command: String,
    metadata: TaskMetadata,
    payload: TaskPayload,
}

#[derive(Serialize)]
struct TaskMetadata {
    task_id: String,
    created_at: i64,
    priority: String,
}

#[derive(Serialize)]
struct TaskPayload {
    target_url: String,
    scan_type: String,      
    max_search_depth: i32,   
}

pub async fn exec(
    redis_client: &redis::Client,
    url: String,
    s_type: String,
) -> Result<(), redis::RedisError> {
    let mut conn = redis_client.get_async_connection().await?;
    let task = OsintTask {
        command: "START_OSINT".to_string(),
        metadata: TaskMetadata {
            task_id: Uuid::new_v4().to_string(),
            created_at: Utc::now().timestamp(),
            priority: "high".to_string(),
        },
        payload: TaskPayload {
            target_url: url,
            scan_type: s_type, 
            max_search_depth: 3,
        },
    };
    let json_task = serde_json::to_string(&task).unwrap();
    let _: () = conn.lpush("osint_tasks", json_task).await?;
    Ok(())
}