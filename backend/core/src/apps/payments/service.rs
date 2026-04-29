use sqlx::PgPool;
use uuid::Uuid;

#[derive(serde::Deserialize)]
struct RawData {
    emails: Vec<String>,
    phones: Vec<String>,
    socials: std::collections::HashMap<String, String>,
    ads: std::collections::HashMap<String, bool>,
    domain_age_days: Option<i32>,
}


struct LeadPackage {
    rank: String,
    quantity: i64,
}

fn get_rank_from_variant(variant_id: &str) -> Option<String> {
    match variant_id {
        "61e53ba2-789e-4412-9653-4b3304e464ed" => Some("silver".into()),
        "f9aaec65-f201-47fc-ac94-f0aed1664b10" => Some("gold".into()),
        "46b8b264-fe58-4626-bb05-27fff988a13e" => Some("platinum".into()),
        _ => None,
    }
}

pub async fn confirm_payment_tx(
    pool: &PgPool, 
    transaction_id: Uuid, 
    variant_id: &str,
    actual_qty: i64 // Додаємо цей параметр
) -> Result<i64, String> {
    let target_rank = get_rank_from_variant(variant_id)
        .ok_or_else(|| format!("Unknown variant_id: {}", variant_id))?;

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Оновлюємо статус, але кількість тепер беремо ту, за яку реально заплатили
    let order = sqlx::query!(
        "UPDATE transactions SET status = 'paid' WHERE id = $1 RETURNING user_id",
        transaction_id
    )
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("Transaction not found")?;

    let user_uuid = order.user_id.ok_or("No user linked to TX")?;

    // ШУКАЄМО ЛІДИ: використовуємо actual_qty з вебхука!
    let leads = sqlx::query!(
        r#"
        SELECT id FROM leads 
        WHERE user_id IS NULL AND is_active = true AND rank::text = $1
        LIMIT $2
        FOR UPDATE SKIP LOCKED
        "#,
        target_rank,
        actual_qty // ОПЛАТИВ 10 — ШУКАЄМО 10
    )
    .fetch_all(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    if (leads.len() as i64) < actual_qty {
        return Err(format!("Stock error: Paid for {}, but only {} found", actual_qty, leads.len()));
    }

    let lead_ids: Vec<Uuid> = leads.into_iter().map(|l| l.id).collect();

    sqlx::query!(
        "UPDATE leads SET user_id = $1, status = 'completed' WHERE id = ANY($2::uuid[])",
        user_uuid,
        &lead_ids as &[Uuid]
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(lead_ids.len() as i64)
}