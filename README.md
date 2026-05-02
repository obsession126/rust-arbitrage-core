# 🔗 SHADOW-LEAD-ENGINE
**High-performance microservice architecture for OSINT, lead generation, and automated data processing.**

[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-leadhunteros.com-39FF14?style=for-the-badge&logo=google-chrome&logoColor=black)](https://leadhunteros.com)
[![Stack](https://img.shields.io/badge/Tech_Stack-Rust%20|%20Next.js%20|%20PostgreSQL-white?style=for-the-badge)](https://leadhunteros.com)
---

### ⚙️ ОСНОВНИЙ ФУНКЦІОНАЛ
* **Multi-source OSINT:** Автоматизований збір даних з Google Maps, LinkedIn та корпоративних сайтів.
* **Data Enrichment:** Пошук та верифікація контактів (Email, Social Media) через перехресний аналіз джерел.
* **Signal Intelligence:** Моніторинг рекламної активності (Google, Meta, TikTok) для визначення ліквідності ліда.
* **Anti-Detection System:** Ротація резидентських проксі, керування Fingerprints та емуляція Human-like поведінки.

---

### 🧠 ФІЛОСОФІЯ ПРОЕКТУ

Проект побудований на принципах **швидкості**, **невидимості** та **автономності**.

* **Ефективність (Rust-first):** Ядро системи на Rust (Axum/Tokio) забезпечує обробку тисяч конкурентних запитів з мінімальним споживанням RAM. Кожен мілісекунд затримки — це ризик виявлення анти-фрод системою.
* **Агностичність до джерел:** Мікросервісна структура дозволяє інтегрувати нові модулі парсингу без втручання в основний оркестратор.
* **Стелс-інженерія:** Ми не зламуємо захист, ми стаємо невидимими для нього через глибоке управління відбитками браузера та динамічну ротацію проксі.
* **Чистота даних (Zero Noise):** Основний акцент на OSINT-збагаченні. На виході система видає готовий бізнес-актив, а не просто "сміттєвий" список контактів.

---

### 🏗️ ARCHITECTURE

```mermaid
graph TD
    %% Фронтенди
    subgraph Clients [Interface Layer]
        TG[Telegram Bot - Rust/Teloxide]
        Web[Future Web Dashboard - Vue/React]
    end

    %% Оркестрація та API
    subgraph Core [Orchestration Layer - Rust]
        Gateway[API Gateway / Auth]
        Logic[Business Logic Engine]
    end

    %% Повідомлення та черги
    subgraph Transport [Message Broker]
        Redis[(Redis Cloud / Streams)]
    end

    %% Воркери
    subgraph Workers [OSINT Intelligence Layer]
        Scanner[Playwright Stealth Scanner]
        AdEngine[Signal Intelligence Module]
        Parser[Python/Rust Data Scrubbers]
    end

    %% Дані
    subgraph Storage [Data Layer]
        Postgres[(PostgreSQL - Main DB)]
    end

    %% Зв'язки
    TG & Web --> Gateway
    Gateway --> Logic
    Logic <--> Redis
    Redis <--> Workers
    Logic <--> Postgres
    Workers --> Postgres
