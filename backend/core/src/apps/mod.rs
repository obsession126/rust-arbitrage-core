use actix_web::web;

pub mod auth;
pub mod leads;
pub mod payments;
pub mod workers;

pub fn init_apps(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api")
            // .configure(users::routes::routes)
            .configure(auth::routes::routes)
            .configure(payments::routes::routes)
            .configure(workers::routes::routes)
            .configure(leads::routes::routes),
    );
}