# Етап збірки (Builder)
FROM rust:1.88-slim as builder

# Встановлюємо системні залежності для збірки (OpenSSL потрібен для sqlx та запитів)
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Кешування залежностей
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release

# 2. Копіюємо метадані SQLx та код
# Використовуємо папку .sqlx для офлайн-компіляції макросів
COPY .sqlx ./.sqlx 
COPY src ./src
COPY migrations ./migrations

# 3. Вмикаємо офлайн-режим
ENV SQLX_OFFLINE=true

# 4. Компілюємо реальний бінарний файл
# touch потрібен, щоб cargo зрозумів, що main.rs змінився після заглушки
RUN touch src/main.rs && cargo build --release

# --- Етап запуску (Runtime) ---
FROM debian:bookworm-slim
WORKDIR /app

# Встановлюємо лише необхідні бібліотеки для роботи
# libssl3 та ca-certificates критичні для HTTPS запитів до API платежів
RUN apt-get update && apt-get install -y \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Копіюємо бінарник з builder
COPY --from=builder /app/target/release/core .

# Якщо твій код шукає папку migrations під час запуску (наприклад, для self-migration)
# розкоментуй рядок нижче:
# COPY --from=builder /app/migrations ./migrations

# Запуск
CMD ["./core"]