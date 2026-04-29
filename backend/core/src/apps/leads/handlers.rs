use actix_web::{web, HttpResponse, HttpRequest};
use sqlx::PgPool;
use crate::apps::leads::dto::CatalogItem;
use crate::apps::leads::dto::ClaimFreeLeadRequest;
use crate::apps::leads::dto::Stock;
use crate::apps::leads::dto::Dashboard;
use crate::apps::leads::dto::LeadRow;
use crate::apps::leads::service::claim_free_platinum;
use crate::apps::auth::jwt::decode_jwt;
use crate::apps::leads::dto::LeadIntelResponse;
use uuid::Uuid;

pub async fn claim_free_lead(
    pool: web::Data<PgPool>,
    body: web::Json<ClaimFreeLeadRequest>,
) -> HttpResponse {
    // Calling the updated service with 2 arguments (pool and i64)
    match claim_free_platinum(pool.get_ref(), body.user_id).await {
        Ok((url, name, raw)) => HttpResponse::Ok().json(vec![
            serde_json::json!(url),
            serde_json::json!(name),
            raw
        ]),
        Err(e) => HttpResponse::BadRequest().json(serde_json::json!({ "error": e })),
    }
}


pub async fn get_lead_intel(
    path: web::Path<Uuid>,
    req: HttpRequest, // Потрібен для ручного витягування токена, якщо немає AuthUser extractor
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let lead_id = path.into_inner();
    
    // --- Ручне отримання user_id з токена (як у твоєму dashboard handler) ---
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".into());
    let token = match req.headers().get("Authorization")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.replace("Bearer ", "")) {
            Some(t) => t,
            None => return HttpResponse::Unauthorized().finish(),
        };

    let claims = match decode_jwt(&token, &secret) {
        Ok(c) => c,
        Err(_) => return HttpResponse::Unauthorized().finish(),
    };
    
    let user_uuid = Uuid::parse_str(&claims.sub).unwrap();

    // Запит: перевіряємо чи лід належить юзеру (або через транзакцію, або напряму)
    let lead = sqlx::query_as::<_, LeadRow>(
        r#"
        SELECT id, target_name, target_url, category, rank::text, status, raw_data, created_at
        FROM leads 
        WHERE id = $1 AND user_id = $2
        "#
    )
    .bind(lead_id)
    .bind(user_uuid)
    .fetch_optional(pool.get_ref())
    .await;

    match lead {
        Ok(Some(l)) => {
            let raw = l.raw_data.unwrap_or(serde_json::json!({}));
            
            // Динамічно витягуємо дані, які спарсив Playwright
            let emails = raw["emails"].as_array();
            let phones = raw["phones"].as_array();
            
            HttpResponse::Ok().json(serde_json::json!({
                "id": l.id,
                "company_name": l.target_name,
                "industry": l.category,
                "url": l.target_url,
                "rank": l.rank,
                "email": emails.and_then(|e| e.get(0)).and_then(|v| v.as_str()).unwrap_or("N/A"),
                "phone": phones.and_then(|p| p.get(0)).and_then(|v| v.as_str()).unwrap_or("N/A"),
                "intel": {
                    "pain_points": if raw["ads"]["google"].as_bool().unwrap_or(false) {
                        "Виявлено активну рекламу. Бюджет витрачається, але чи є конверсія?"
                    } else {
                        "Реклама не виявлена. Це ідеальний момент для входу з пропозицією."
                    },
                    "tech_stack": raw["tech_stack"].as_array().unwrap_or(&vec![]),
                    "ads_active": raw["ads"]["google"].as_bool().unwrap_or(false),
                    "domain_age": raw["domain_age_days"].as_i64().unwrap_or(0)
                },
                "socials": raw["socials"]
            }))
        },
        Ok(None) => HttpResponse::Forbidden().body("Access Denied: You don't own this intelligence"),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}



pub async fn dashboard(
    pool: web::Data<PgPool>,
    req: HttpRequest,
) -> HttpResponse {
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".into());

    let auth_header = req.headers().get("Authorization")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.replace("Bearer ", ""));

    let token = match auth_header {
        Some(t) => t,
        None => return HttpResponse::Unauthorized().finish(),
    };

    // 1. Отримуємо рядок з токена
    let sub = match decode_jwt(&token, &secret) {
        Ok(claims) => claims.sub,
        Err(_) => return HttpResponse::Unauthorized().finish(),
    };

    // 2. Конвертуємо String у Uuid (це виправить помилку mismatched types)
    let user_uuid = match Uuid::parse_str(&sub) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().body("Invalid UUID format in token"),
    };

    // 3. Робимо запит
    // Використовуємо звичайний метод без макроса для обходу жорсткої перевірки типів sqlx
    let rows = sqlx::query_as::<_, LeadRow>(
        r#"
        SELECT 
            id, 
            target_name, 
            target_url, 
            category, 
            rank::text as rank, -- Прибрали "rank!"
            status,
            created_at
        FROM leads
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
        "#
    )
    .bind(user_uuid)
    .fetch_all(pool.get_ref())
    .await;

    match rows {
        Ok(leads) => HttpResponse::Ok().json(leads),
        Err(e) => {
            eprintln!("DB Error: {:?}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

pub async fn catalog_handler(
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let rows = sqlx::query!(
        r#"
        SELECT 
            category,
            COUNT(*) FILTER (WHERE rank = 'silver') as silver_count,
            COUNT(*) FILTER (WHERE rank = 'gold') as gold_count,
            COUNT(*) FILTER (WHERE rank = 'platinum') as platinum_count
        FROM leads
        WHERE user_id IS NULL AND is_active = true
        GROUP BY category
        "#
    )
    .fetch_all(pool.get_ref())
    .await;

    match rows {
        Ok(data) => {
            let catalog: Vec<CatalogItem> = data.into_iter().map(|r| CatalogItem {
                category: r.category,
                stock: Stock {
                    silver: r.silver_count.unwrap_or(0),
                    gold: r.gold_count.unwrap_or(0),
                    platinum: r.platinum_count.unwrap_or(0),
                },
            }).collect();

            HttpResponse::Ok().json(catalog)
        }
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}