use sqlx::PgPool;
use uuid::Uuid;

pub async fn create_tx(
    pool: &PgPool,
    tx_id: Uuid,
    user_id: Uuid,
    amount: i32,
) -> Result<(), sqlx::Error> {

    sqlx::query!(
        "INSERT INTO transactions (id, user_id, amount, status)
         VALUES ($1, $2, $3, 'pending')",
        tx_id,
        user_id,
        amount
    )
    .execute(pool)
    .await?;

    Ok(())
}