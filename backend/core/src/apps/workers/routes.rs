use actix_web::web;
use crate::apps::workers::handlers::{create_osint_request, create_maps_request};

pub fn routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/create")
            .route("/osint", web::post().to(create_osint_request))
            .route("/parse", web::post().to(create_maps_request))
    );
}