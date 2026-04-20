use sqlx::PgPool;
use uuid::Uuid;


// Якщо у тебе в БД ID це Integer, прибери UUID і використовуй i32
pub async fn claim_free_platinum(
    pool: &PgPool,
    user_id: uuid::Uuid, // Переконайся, що в БД саме UUID. Якщо Serial - став i32
) -> Result<String, String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // 1. Лочимо юзера
    let user = sqlx::query!(
        "SELECT is_new FROM users WHERE id = $1 FOR UPDATE",
        user_id
    )
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("User not found")?;

    if !user.is_new.unwrap_or(false) {
        return Err("Ви вже використали свій бонус".into());
    }

    // 2. Шукаємо лід. Додаємо обробку випадку, коли Platinum немає
    let lead = sqlx::query!(
        r#"
        SELECT id, target_url FROM leads
        WHERE rank = 'platinum'
          AND user_id IS NULL
          AND is_active = true
        LIMIT 1
        FOR UPDATE SKIP LOCKED
        "#
    )
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let lead_data = match lead {
        Some(l) => l,
        None => return Err("На жаль, безкоштовні ліди закінчилися. Зачекайте оновлення бази".into()),
    };

    // 3. Assign + Disable bonus
    sqlx::query!(
        "UPDATE leads SET user_id = $1, status = 'completed' WHERE id = $2",
        user_id,
        lead_data.id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query!(
        "UPDATE users SET is_new = false WHERE id = $1",
        user_id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(lead_data.target_url)
}