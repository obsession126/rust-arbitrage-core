use actix_web::web;
use crate::apps::payments::handlers::{create_payment, confirm_payment};

pub fn routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/payments")
            .route("/create", web::post().to(create_payment))
            .route("/confirm", web::post().to(confirm_payment))
    );
}