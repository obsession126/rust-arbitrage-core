use sqlx::postgres::PgPoolOptions; // Цього не вистачало
use sqlx::PgPool;                // І цього

pub async fn init_db(database_url: &str) -> PgPool {
    println!("🔌 Спроба підключення до бази даних...");


    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(std::time::Duration::from_secs(3))
        .connect(database_url)
        .await
        .expect("❌ Не вдалося підключитися до Postgres (перевір чи запущений Docker і чи зупинена служба Windows)"); 

    // 2. Запускаємо міграції
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("❌ Не вдалося запустити міграції (перевір чи існує папка migrations)");

    println!("✅ База даних готова: міграції застосовано");
    
    pool
}