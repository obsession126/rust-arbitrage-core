use actix_web::{post, web, HttpResponse, Responder};
// Імпортуємо наші модулі
use crate::routes::{trigger_osint, trigger_parse};
use crate::models::ParseRequest; // Переконайся, що шлях вірний

#[post("/parse")]
async fn handle_parse_request(
    redis: web::Data<redis::Client>,
    payload: web::Json<ParseRequest> 
) -> impl Responder {
    match trigger_parse::exec(
        redis.get_ref(), 
        payload.target_name.clone(), 
        payload.count, 
        payload.id.clone()
    ).await {
        Ok(_) => HttpResponse::Ok().body("Parsing started"),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

#[post("/osint")]
async fn handle_osint_request(
    redis: web::Data<redis::Client>,
    payload: web::Json<ParseRequest> 
) -> impl Responder {
    match trigger_osint::exec(
        redis.get_ref(), 
        payload.target_name.clone(), 
        "full_scan".to_string()
    ).await {
        Ok(_) => HttpResponse::Ok().body("OSINT started"),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api") 
            .service(handle_parse_request)
            .service(handle_osint_request)
    );
}