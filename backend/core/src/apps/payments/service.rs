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

pub async fn confirm_payment_tx(pool: &PgPool, transaction_id: Uuid) -> Result<String, String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;


    let res = sqlx::query!(
        "UPDATE transactions SET status = 'paid' WHERE id = $1 AND status = 'pending' RETURNING user_id, quantity",
        transaction_id
    )
    .fetch_optional(&mut *tx).await.map_err(|e| e.to_string())?
    .ok_or("Transaction not found or already paid")?;

    let quantity = res.quantity.unwrap_or(10) as i64;


    let leads = sqlx::query!(
        r#"
        SELECT id, target_url, target_name, rank::text as "rank!", raw_data 
        FROM leads 
        WHERE user_id IS NULL AND is_active = true AND status = 'completed'
        LIMIT $1
        FOR UPDATE SKIP LOCKED
        "#,
        quantity
    )
    .fetch_all(&mut *tx)
    .await
    .map_err(|e: sqlx::Error| e.to_string())?;

    if leads.len() < quantity as usize {
        return Err("Not enough processed leads in stock".into());
    }

    // 3. Формуємо ТЕКСТ
    let mut report = String::from("🦾 REFINERY TERMINAL - ПРЕМИУМ ЛИДЫ\n");
    report.push_str(&format!("ID Транзакции: {}\n", transaction_id));
    report.push_str("──────────────────────────────────────────\n\n");

    let mut lead_ids = Vec::new();

    for (i, lead) in leads.iter().enumerate() {
        lead_ids.push(lead.id);
        
        let raw: RawData = serde_json::from_value(lead.raw_data.clone().unwrap_or_default())
            .unwrap_or(RawData { emails: vec![], phones: vec![], socials: Default::default(), ads: Default::default(), domain_age_days: None });

        // Використовуємо target_name замість company_name
        report.push_str(&format!("{}. 🏢 {}\n", i + 1, lead.target_name));
        
        // rank тепер гарантовано String завдяки аліасу "rank!" у запиті
        report.push_str(&format!("💎 РАНГ: {}\n", lead.rank.to_uppercase()));
        
        report.push_str(&format!("🌐 Сайт: {}\n", lead.target_url));
        
        // Для Emails
        let email_text = if raw.emails.is_empty() { "Не найдено".to_string() } else { raw.emails.join(", ") };
        report.push_str(&format!("📧 Emails: {}\n", email_text));

        // Для Телефонів
        let phone_text = if raw.phones.is_empty() { "Не найдено".to_string() } else { raw.phones.join(", ") };
        report.push_str(&format!("📞 Тел: {}\n", phone_text));

        report.push_str("\n📱 Соцсети:\n");
        for (platform, status) in &raw.socials {
            report.push_str(&format!("   └ {}: {}\n", platform, status));
        }

        report.push_str("📈 Маркетинг:\n");
        let ads_info: Vec<String> = raw.ads.iter()
            .map(|(k, v)| format!("{}: {}", k, if *v { "✅" } else { "❌" }))
            .collect();
        report.push_str(&format!("   └ Реклама: {}\n", ads_info.join(" | ")));
        report.push_str(&format!("   └ Возраст домена: {} дней\n", raw.domain_age_days.unwrap_or(0)));
        
        report.push_str("──────────────────────────────────────────\n\n");
    }

    // 4. Закріплюємо ліди за юзером
    sqlx::query!("UPDATE leads SET user_id = $1 WHERE id = ANY($2)", res.user_id, &lead_ids)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(report)
}