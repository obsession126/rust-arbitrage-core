use actix_web::web;
use crate::apps::auth::handlers::{google_handler, telegram_handler, user_status_handler, email_register_handler,email_login_handler};

pub fn routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/auth")
            .route("/google", web::post().to(google_handler))
            .route("/telegram", web::post().to(telegram_handler))
            .route("/register", web::post().to(email_register_handler))
            .route("/login", web::post().to(email_login_handler))
            .route("/status/{tg_id}", web::get().to(user_status_handler))
    );
}