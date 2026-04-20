# Етап збірки
FROM rust:1.88-slim as builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Копіюємо файли залежностей (Cargo.toml та Cargo.lock)
COPY Cargo.toml Cargo.lock ./

# 2. Попередня збірка залежностей для кешування
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release

# 3. Копіюємо папку .sqlx та вихідний код
# Оскільки у тебе папки з метаданими, копіюємо саме їх
COPY .sqlx ./.sqlx
COPY src ./src

# 4. Налаштовуємо офлайн режим для SQLx
ENV SQLX_OFFLINE=true

# 5. Фінальна збірка
RUN touch src/main.rs && cargo build --release

# Етап запуску
FROM debian:bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Копіюємо бінарник
COPY --from=builder /app/target/release/bot .

CMD ["./bot"]