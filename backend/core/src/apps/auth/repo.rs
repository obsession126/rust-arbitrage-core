use sqlx::PgPool;
use crate::apps::auth::model::User;

pub async fn find_by_email(pool: &PgPool, email: &str) -> Option<User> {
    sqlx::query_as!(
        User,
        r#"
        SELECT id, email, tg_id, name, provider, is_new as "is_new!", password_hash
        FROM users
        WHERE email = $1
        "#,
        email
    )
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
}

pub async fn find_by_tg(pool: &PgPool, tg_id: i64) -> Option<User> {
    sqlx::query_as!(
        User,
        r#"
        SELECT id, email, tg_id, name, provider, is_new as "is_new!", password_hash
        FROM users
        WHERE tg_id = $1
        "#,
        tg_id
    )
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
}

pub async fn create_user(pool: &PgPool, user: &User) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO users (id, email, tg_id, name, provider, password_hash)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
        user.id,
        user.email,
        user.tg_id,
        user.name,
        user.provider,
        user.password_hash // Додаємо це поле
    )
    .execute(pool)
    .await?;

    Ok(())
}