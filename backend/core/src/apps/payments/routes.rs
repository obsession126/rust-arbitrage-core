use actix_web::web;
// Імпортуємо правильні назви, які ми прописали в handlers.rs
use crate::apps::payments::handlers::{create_order_handler, lemon_webhook};

pub fn routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/payments")
            // .to() має приймати ті самі назви, що й в імпорті вище
            .route("/create", web::post().to(create_order_handler))
            .route("/confirm", web::post().to(lemon_webhook))
    );
}