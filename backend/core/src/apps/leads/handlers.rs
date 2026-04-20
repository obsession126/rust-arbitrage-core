use actix_web::{web, HttpResponse};
use sqlx::PgPool;
use crate::apps::leads::dto::CatalogItem;
use crate::apps::leads::dto::ClaimFreeLeadRequest;
use crate::apps::leads::service::claim_free_platinum;

pub async fn claim_free_lead(
    pool: web::Data<PgPool>,
    body: web::Json<ClaimFreeLeadRequest>,
) -> HttpResponse {

    match claim_free_platinum(pool.get_ref(), body.user_id).await {
        Ok(url) => HttpResponse::Ok().json(serde_json::json!({
            "url": url
        })),
        Err(e) => HttpResponse::BadRequest().body(e),
    }
}


pub async fn catalog_handler(
    pool: web::Data<PgPool>,
) -> HttpResponse {

    let rows = sqlx::query!(
        r#"
        SELECT 
            category,
            COUNT(*) FILTER (WHERE user_id IS NULL) as available_count,
            ARRAY_AGG(DISTINCT rank::text) as ranks
        FROM leads
        WHERE is_active = true
        GROUP BY category
        "#
    )
    .fetch_all(pool.get_ref())
    .await;

    match rows {
        Ok(data) => {
            let catalog: Vec<CatalogItem> = data.into_iter().map(|r| CatalogItem {
                category: r.category,
                available_count: r.available_count.unwrap_or(0),
                ranks: r.ranks.unwrap_or(vec![]),
            }).collect();

            HttpResponse::Ok().json(catalog)
        }
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}