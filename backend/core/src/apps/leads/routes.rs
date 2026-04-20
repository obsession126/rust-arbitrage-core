use actix_web::web;
use crate::apps::leads::handlers::{claim_free_lead, catalog_handler};

pub fn routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/leads")
            .route("/claim-free", web::post().to(claim_free_lead))
            .route("/catalog", web::get().to(catalog_handler))
    );
    
}