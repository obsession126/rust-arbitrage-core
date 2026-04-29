use sqlx::PgPool;
use uuid::Uuid;

pub async fn claim_free_platinum(
    pool: &PgPool,
    user_tg_id: i64,
) -> Result<(String, String, serde_json::Value), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let user = sqlx::query!(
        "SELECT id, is_new FROM users WHERE tg_id = $1 FOR UPDATE",
        user_tg_id
    )
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("User not found")?;

    if !user.is_new.unwrap_or(false) {
        // Явно завершуємо роботу перед поверненням помилки
        return Err("Bonus already claimed".into());
    }

    // 2. Шукаємо вільний лід
    let lead_data = sqlx::query!(
        r#"
        SELECT id, target_url, target_name, raw_data 
        FROM leads 
        WHERE rank = 'platinum'
          AND user_id IS NULL
          AND is_active = true
        LIMIT 1
        FOR UPDATE SKIP LOCKED
        "#
    )
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("Out of stock: No free platinum leads available")?;

    // 3. Оновлюємо лід, приписуючи йому UUID юзера (user.id)
    sqlx::query!(
        "UPDATE leads SET user_id = $1, status = 'completed' WHERE id = $2",
        user.id as Uuid, // Явно вказуємо, що це Uuid
        lead_data.id as Uuid
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Database error (leads update): {}", e))?;

    // 4. Оновлюємо статус юзера за його tg_id (i64)
    sqlx::query!(
        "UPDATE users SET is_new = false WHERE tg_id = $1",
        user_tg_id // Використовуємо вхідний i64
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;
    
    tx.commit().await.map_err(|e| e.to_string())?;


    Ok((
        lead_data.target_url, 
        lead_data.target_name, 
        lead_data.raw_data.unwrap_or_default() // Додай це
    ))
}