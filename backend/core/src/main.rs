use actix_web::{web, App, HttpServer, middleware};
use dotenv::dotenv;
use std::env;

mod routes;
mod db;
mod models;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    
    // 1. Отримуємо конфіги
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let redis_url = env::var("REDIS_URL").expect("REDIS_URL must be set");

    // 2. Ініціалізуємо БД
    let pool = db::init_db(&database_url).await;

    // 3. Ініціалізуємо Redis
    let redis_client = redis::Client::open(redis_url)
        .expect("❌ Не вдалося створити клієнт Redis");

    println!("🚀 Refinery Server started at http://127.0.0.1:8080");

    // 4. Запускаємо сервер
    HttpServer::new(move || {
        App::new()
            // Прокидуємо БД (pool уже загорнутий в Arc/Data всередині sqlx, тому clone тут дешевий)
            .app_data(web::Data::new(pool.clone())) 
            // Прокидуємо Redis
            .app_data(web::Data::new(redis_client.clone()))
            .wrap(middleware::Logger::default())
            .configure(routes::leads::config)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}