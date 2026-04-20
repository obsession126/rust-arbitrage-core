use actix_web::{App, HttpServer, web};
use actix_web::middleware::Logger;
mod config;
mod db;
mod apps;

use db::init_db;
use db::redis::{init_redis, RedisClient};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();
    let config = config::Config::from_env();

    // Замість .expect()
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "fixed_secret_for_dev_only_123".to_string());

    let pool = init_db(&config.database_url).await;
    let redis = init_redis(&config.redis_url);

    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            // 🐘 Postgres
            .app_data(web::Data::new(pool.clone()))

            // 🔴 Redis
            .app_data(web::Data::new(redis.clone()))
            .app_data(web::Data::new(jwt_secret.clone()))

            .configure(apps::init_apps)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}