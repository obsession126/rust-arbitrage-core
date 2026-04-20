use actix_web::{post, web, HttpResponse, Responder};
use redis::Client;
use crate::apps::workers::dto::{CreateOsintRequest, CreateParseRequest};
use crate::apps::workers::service::{create_osint_task, create_maps_task};


pub async fn create_osint_request(
    redis: web::Data<Client>,
    body: web::Json<CreateOsintRequest>,
) -> impl Responder {
    match create_osint_task(
        redis.get_ref(),
        body.name.clone(),
        Some(body.url.clone())
    ).await {
        Ok(id) => HttpResponse::Ok().json(serde_json::json!({ "status": "ok", "id": id })),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

pub async fn create_maps_request(
    redis: web::Data<Client>,
    body: web::Json<CreateParseRequest>,
) -> impl Responder {
    match create_maps_task(
        redis.get_ref(),
        body.name.clone(),
        body.location.clone(),
        body.limit
    ).await {
        Ok(id) => HttpResponse::Ok().json(serde_json::json!({ "status": "ok", "id": id })),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}