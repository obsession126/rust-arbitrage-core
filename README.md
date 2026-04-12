# 🔗 SHADOW-LEAD-ENGINE
**High-performance microservice architecture for OSINT, lead generation, and automated data processing.**

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

### 🔍 OSINT-МЕХАНІКА: АЛГОРИТМ АНАЛІЗУ

Процес OSINT у системі — це багатоетапне дослідження цифрового відбитка об'єкта, що реалізовано через наступні модулі:

#### 1. Технічна верифікація (WHOIS Intelligence)
Аналіз походження домену. Система визначає дату реєстрації, що дозволяє автоматично оцінити рівень трасту об'єкта та відсіяти "одноденки".

#### 2. Емуляція Human-Behavior (Playwright Engine)
Використання `Playwright` з кастомними User-Agents для обходу JS-захисту. Система рендерить сторінку, імітує скролінг (`mouse.wheel`) та очікує підвантаження асинхронних елементів, витягуючи дані, приховані від звичайних HTTP-клієнтів.

#### 3. Інтелектуальна екстракція контактів
* **Pattern Matching:** Пошук Email та соцмереж через оптимізовані Regex-патерни.
* **Phone Scrubbing:** Розумне очищення телефонів (`clean_phones`) з валідацією префіксів (PL, UA, US, etc.) та фільтрацією системних номерів.
* **Link Mining:** Збір прямих посилань з атрибутів `tel:`, `mailto:` та соціальних медіа-хабів.

#### 4. Signal Intelligence (Ad Monitoring)
Унікальний модуль перехоплення мережевих запитів (`check_ads_request`). Система фіксує активність пікселів:
* **Google Ad Services / DoubleClick**
* **Facebook Pixel**
* **TikTok Analytics**
* *Висновок:* Наявність рекламних скриптів підтверджує фінансову активність та ліквідність об'єкта.

#### 5. Соціальний скоринг
Автоматична перевірка знайдених профілів (Instagram, TikTok, Telegram) на реальну активність. Система аналізує контент сторінок на наявність постів та взаємодій, відсікаючи неактивні лінки.

---

### 🛠 ТЕХНОЛОГІЧНИЙ СТЕК
* **Backend:** `Rust` (Axum, Tokio)
* **Scraping:** `Python` (Playwright, Scrapy, Whois)
* **Message Broker:** `Redis` (Async queues)
* **Database:** `PostgreSQL`
* **Infrastructure:** `Docker`

---

### 🚀 ЗАПУСК
```bash
# Клонування
git clone [https://github.com/your-username/shadow-lead-engine.git](https://github.com/your-username/shadow-lead-engine.git)

# Конфігурація
cp .env.example .env

# Розгортання
docker-compose up -d --build
