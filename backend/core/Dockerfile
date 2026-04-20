# Етап збірки
FROM rust:1.88-slim as builder

# Встановлюємо системні залежності для Rust та OpenSSL
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Копіюємо конфігурацію залежностей
COPY Cargo.toml Cargo.lock ./

# 2. Попередня збірка для кешування (щоб не перекачувати крейти щоразу)
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release

# 3. Копіюємо метадані SQLx та сирцевий код
# На твоїх скріншотах папка .sqlx, а не файл
COPY .sqlx ./.sqlx 
COPY src ./src
COPY migrations ./migrations

# 4. Вмикаємо офлайн-режим для SQLx
ENV SQLX_OFFLINE=true

# 5. Компілюємо реальний бінарний файл core
RUN touch src/main.rs && cargo build --release

# Етап запуску (Runtime)
FROM debian:bookworm-slim
WORKDIR /app

# Мінімальний набір для роботи мережі та SSL
RUN apt-get update && apt-get install -y \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Копіюємо бінарник core з етапу builder
COPY --from=builder /app/target/release/core .

# Якщо core використовує локальні міграції або конфіги, копіюємо їх сюди
# COPY --from=builder /app/migrations ./migrations

CMD ["./core"]