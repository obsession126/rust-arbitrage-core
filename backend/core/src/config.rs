use std::env;

pub struct Config {
    pub database_url: String,
    pub host: String,
    pub port: u16,
    pub redis_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        Self {
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL missing"),
            redis_url: env::var("REDIS_URL").unwrap_or("redis://127.0.0.1:6379".into()),
            host: env::var("HOST").unwrap_or("127.0.0.1".into()),
            port: env::var("PORT").unwrap_or("8080".into()).parse().unwrap(),
        }
    }
}