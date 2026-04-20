use redis::Client;

pub type RedisClient = Client;

pub fn init_redis(url: &str) -> RedisClient {
    Client::open(url).expect("Invalid Redis URL")
}