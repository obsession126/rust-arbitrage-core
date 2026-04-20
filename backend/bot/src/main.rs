use teloxide::prelude::*;
use teloxide::types::{
    InlineKeyboardButton, InlineKeyboardMarkup, LabeledPrice, PreCheckoutQuery, ParseMode,
};
use reqwest::Client;
use serde_json::Value;
use std::env;
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
struct LeadRawData {
    emails: Vec<String>,
    phones: Vec<String>,
    socials: HashMap<String, String>,
    ads: HashMap<String, bool>,
    domain_age_days: Option<i32>,
    processed_url: String,
}

#[derive(Clone)]
struct AppState {
    api_url: String,
    client: Client,
    db: Pool<Postgres>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    pretty_env_logger::init();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL missing");
    let pool = PgPoolOptions::new()
        .max_connections(15) 
        .acquire_timeout(std::time::Duration::from_secs(3))
        .connect(&database_url)
        .await?;

    let bot = Bot::from_env();
    let state = AppState {
        api_url: env::var("API_URL").expect("API_URL missing"),
        client: Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()?,
        db: pool,
    };

    let handler = dptree::entry()
        .branch(Update::filter_pre_checkout_query().endpoint(pre_checkout_handler))
        .branch(Update::filter_message()
            .chain(dptree::filter(|m: Message| m.successful_payment().is_some()))
            .endpoint(payment_success_handler))
        .branch(Update::filter_callback_query().endpoint(callback_handler))
        .branch(Update::filter_message().endpoint(message_handler));

    Dispatcher::builder(bot, handler)
        .dependencies(dptree::deps![state])
        .enable_ctrlc_handler()
        .build()
        .dispatch()
        .await;

    Ok(())
}

fn main_menu() -> InlineKeyboardMarkup {
    InlineKeyboardMarkup::new(vec![
        vec![InlineKeyboardButton::callback("📂 ОТКРЫТЬ КАТАЛОГ", "catalog")],
        vec![
            InlineKeyboardButton::callback("💳 БАЛАНС", "wallet"),
            InlineKeyboardButton::callback("⚙️ СЕРВИС", "settings"),
        ],
        vec![
            InlineKeyboardButton::callback("🎁 DAILY FREE PLATINUM", "claim_daily"),
        ],
    ])
}

fn clean_md(text: &str) -> String {
    text.replace(".", "\\.")
        .replace("-", "\\-")
        .replace("!", "\\!")
        .replace("_", "\\_")
        .replace("(", "\\(")
        .replace(")", "\\)")
}

async fn message_handler(bot: Bot, msg: Message, state: AppState) -> ResponseResult<()> {
    let tg_id = msg.from().map(|u| u.id.0 as i64).unwrap_or(0);
    let user_name = msg.from()
        .map(|u| u.username.clone().unwrap_or(u.first_name.clone()))
        .unwrap_or_else(|| "Unknown".to_string());

    let _ = sqlx::query!(
        r#"
        INSERT INTO users (tg_id, name, provider, is_new, created_at)
        VALUES ($1, $2, 'telegram', true, NOW())
        ON CONFLICT (tg_id) DO UPDATE SET name = EXCLUDED.name
        "#,
        tg_id,
        user_name
    )
    .execute(&state.db)
    .await;

    bot.send_message(msg.chat.id, "⚡ <b>REFINERY TERMINAL</b>\n\nСистема готова к работе.")
        .parse_mode(ParseMode::Html)
        .reply_markup(main_menu())
        .await?;
    Ok(())
}

pub async fn claim_free_platinum(
    pool: &Pool<Postgres>, 
    user_id: uuid::Uuid, 
    tg_id: i64 
) -> Result<(String, String, serde_json::Value), String> {
    let admin_id: i64 = 5965022336; 

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let user = sqlx::query!("SELECT is_new FROM users WHERE id = $1", user_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|_| "Пользователя не найдено".to_string())?;

    if tg_id != admin_id && !user.is_new.unwrap_or(false) {
        return Err("Вы уже получили свой ежедневный бонус. Возвращайтесь завтра!".to_string());
    }

    let lead = sqlx::query!(
        r#"
        SELECT id, target_url, target_name, raw_data 
        FROM leads 
        WHERE rank::text = 'platinum' AND user_id IS NULL AND is_active = true 
        LIMIT 1 FOR UPDATE SKIP LOCKED
        "#
    )
    .fetch_optional(&mut *tx).await.map_err(|e| e.to_string())?;

    if let Some(l) = lead {
        sqlx::query!("UPDATE leads SET user_id = $1, status = 'completed' WHERE id = $2", user_id, l.id)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        
        sqlx::query!("UPDATE users SET is_new = false WHERE id = $1", user_id)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;

        tx.commit().await.map_err(|e| e.to_string())?;
        
        Ok((
            l.target_url, 
            l.target_name, 
            l.raw_data.unwrap_or(serde_json::json!({}))
        ))
    } else {
        Err("К сожалению, доступные Platinum-лиды на сегодняшний день закончились.".to_string())
    }
}

async fn callback_handler(bot: Bot, q: CallbackQuery, state: AppState) -> ResponseResult<()> {
    let data = q.data.clone().unwrap_or_default();
    let msg = match q.message {
        Some(m) => m,
        None => return Ok(()),
    };
    let chat_id = msg.chat.id;
    let tg_id = q.from.id.0 as i64;

    match data.as_str() {
        "claim_daily" => {
            let user_opt = sqlx::query!("SELECT id FROM users WHERE tg_id = $1", tg_id)
                .fetch_optional(&state.db)
                .await
                .unwrap_or(None);

            if let Some(user) = user_opt {
                match claim_free_platinum(&state.db, user.id, tg_id).await {
                    Ok((url, name, raw_json)) => {
                        let data: LeadRawData = serde_json::from_value(raw_json).unwrap();
                        let emails = if data.emails.is_empty() { "Не найдено".to_string() } else { data.emails.join(", ") };
                        let phones = if data.phones.is_empty() { "Не найдено".to_string() } else { data.phones.join(", ") };
                        
                        let ads_info = format!(
                            "Google: {}, FB: {}, TikTok: {}",
                            if *data.ads.get("google").unwrap_or(&false) { "✅" } else { "❌" },
                            if *data.ads.get("fb").unwrap_or(&false) { "✅" } else { "❌" },
                            if *data.ads.get("tiktok").unwrap_or(&false) { "✅" } else { "❌" }
                        );

                        let message = format!(
                            "✅ <b>БОНУСНЫЙ ЛИД АКТИВИРОВАН</b>\n\
                            ────────────────────\n\
                            🏢 <b>Компания:</b> <code>{}</code>\n\
                            💎 <b>Ранг:</b> <code>PLATINUM</code>\n\n\
                            📞 <b>КОНТАКТЫ:</b>\n\
                            ├ <b>Email:</b> <code>{}</code>\n\
                            └ <b>Тел:</b> <code>{}</code>\n\n\
                            📊 <b>МАРКЕТИНГОВЫЙ АНАЛИЗ:</b>\n\
                            ├ <b>Рекламная активность:</b> {}\n\
                            ├ <b>Возраст домена:</b> <code>{} днів</code>\n\
                            └ <b>Статус:</b> Активный игрок\n\n\
                            👉 <a href='{}'>ОТКРЫТЬ САЙТ ОБЪЕКТА</a>",
                            name, emails, phones, ads_info, data.domain_age_days.unwrap_or(0), url
                        );

                        bot.send_message(chat_id, message).parse_mode(ParseMode::Html).await?;
                    },
                    Err(e) => {
                        bot.answer_callback_query(q.id.clone()).text(format!("❌ {}", e)).show_alert(true).await?;
                    }
                }
            }
        }

        "catalog" | "main_menu" => {
            let categories = sqlx::query!("SELECT DISTINCT category FROM leads WHERE user_id IS NULL AND is_active = true")
                .fetch_all(&state.db).await.unwrap_or_default();

            let mut buttons: Vec<Vec<InlineKeyboardButton>> = categories.iter().map(|row| {
                vec![InlineKeyboardButton::callback(format!("📁 {}", row.category), format!("niche:{}", row.category))]
            }).collect();
            
            buttons.push(vec![InlineKeyboardButton::callback("⬅️ НАЗАД", "main_menu_text")]);

            bot.edit_message_text(chat_id, msg.id, "🎯 <b>КАТАЛОГ ДОСТУПНЫХ НИШ</b>\n\nВыберите категорию:")
                .parse_mode(ParseMode::Html)
                .reply_markup(InlineKeyboardMarkup::new(buttons)).await?;
        }

        d if d.starts_with("niche:") => {
            let niche = d.replace("niche:", "");
            let ranks = ["silver", "gold", "platinum"];
            let mut buttons = vec![];

            for rank in ranks {
                let count = sqlx::query!(
                    "SELECT COUNT(*) FROM leads WHERE category = $1 AND rank::text = $2 AND user_id IS NULL AND is_active = true",
                    niche, rank
                ).fetch_one(&state.db).await.map(|r| r.count.unwrap_or(0)).unwrap_or(0);

                if count > 0 {
                    buttons.push(vec![InlineKeyboardButton::callback(
                        format!("💎 {} ({} шт)", rank.to_uppercase(), count),
                        format!("rank:{}:{}", niche, rank)
                    )]);
                }
            }

            // Додаємо кнопку з поясненням логіки
            buttons.push(vec![InlineKeyboardButton::callback("🔍 КАК МЫ ОЦЕНИВАЕМ?", format!("ranking_logic:{}", niche))]);
            buttons.push(vec![InlineKeyboardButton::callback("⬅️ НАЗАД", "catalog")]);

            bot.edit_message_text(chat_id, msg.id, format!("📈 Ниша: <b>{}</b>\n\nВыберите ранг качества:", niche))
                .parse_mode(ParseMode::Html)
                .reply_markup(InlineKeyboardMarkup::new(buttons)).await?;
        }

        d if d.starts_with("ranking_logic:") => {
            let niche = d.replace("ranking_logic:", "");
            
            let ranking_text = format!(
                "📊 <b>ЛОГИКА РАНЖИРОВАНИЯ [REFINERY]</b>\n\n\
                Мы оцениваем каждый объект по 12 параметрам. Основные уровни:\n\n\
                ⚪️ <b>SILVER</b>\n\
                ├ <i>Домен:</i> от 30 дней\n\
                ├ <i>Контакты:</i> Общие (info@, office@)\n\
                └ <i>Анализ:</i> Низкая активность в рекламе.\n\n\
                🟡 <b>GOLD</b>\n\
                ├ <i>Домен:</i> от 1 года\n\
                ├ <i>Контакты:</i> Прямые e-mail менеджеров\n\
                └ <i>Анализ:</i> Активный Pixel (FB/Google), свежие креативы.\n\n\
                💎 <b>PLATINUM</b>\n\
                ├ <i>Домен:</i> Трастовые старые домены\n\
                ├ <i>Контакты:</i> Личные мобильные + ЛПР (CEO/Owner)\n\
                └ <i>Анализ:</i> Высокие бюджеты, наличие TikTok Ads и сквозной аналитики.\n\n\
                🛡 <b>ПРИНЦИПЫ ТЕРМИНАЛА:</b>\n\
                🤝 <b>ЭКСКЛЮЗИВНОСТЬ:</b> Каждый лид продается <u>строго в одни руки</u>. После покупки он навсегда исчезает из каталога.\n\
                🔥 <b>ОКУПАЕМОСТЬ:</b> Мы парсим только «горячие» ниши с высоким чеком, где закрытие даже одного объекта окупает пакет лидов в 50-100 раз.\n\n\
                <i>Каждый лид проходит валидацию через наш OSINT-парсер перед попаданием в терминал.</i>"
            );

            bot.edit_message_text(chat_id, msg.id, ranking_text)
                .parse_mode(ParseMode::Html)
                .reply_markup(InlineKeyboardMarkup::new(vec![
                    vec![InlineKeyboardButton::callback("⬅️ К ВЫБОРУ РАНГА", format!("niche:{}", niche))]
                ])).await?;
        }

        d if d.starts_with("rank:") => {
            let parts: Vec<&str> = d.split(':').collect();
            let niche = parts[1];
            let rank = parts[2];
            let sizes = [10, 50, 100];
            let mut buttons = vec![];

            let count = sqlx::query!(
                "SELECT COUNT(*) FROM leads WHERE category = $1 AND rank::text = $2 AND user_id IS NULL AND is_active = true",
                niche, rank
            ).fetch_one(&state.db).await.map(|r| r.count.unwrap_or(0)).unwrap_or(0);

            for &s in &sizes {
                if count >= s as i64 {
                    buttons.push(vec![InlineKeyboardButton::callback(
                        format!("📦 ПАКЕТ: {} шт", s), 
                        format!("pay:{}:{}:{}", niche, s, rank)
                    )]);
                }
            }
            buttons.push(vec![InlineKeyboardButton::callback("⬅️ НАЗАД", format!("niche:{}", niche))]);

            bot.edit_message_text(chat_id, msg.id, format!("💎 Ранг: <b>{}</b>\nДоступно лидов: <code>{}</code>\nВыберите объем:", rank.to_uppercase(), count))
                .parse_mode(ParseMode::Html)
                .reply_markup(InlineKeyboardMarkup::new(buttons)).await?;
        }

        d if d.starts_with("pay:") => {
            let parts: Vec<&str> = d.split(':').collect();
            let niche = parts[1];
            let size = parts[2].parse::<i64>().unwrap_or(10);
            let rank = parts[3];

            let _ = bot.answer_callback_query(q.id.clone()).text("Формируем счет...").await;

            let resp = state.client.post(format!("{}/payments/create", state.api_url))
                .json(&serde_json::json!({
                    "tg_id": tg_id, 
                    "category": niche, 
                    "rank": rank, 
                    "quantity": size
                })).send().await;

            match resp {
                Ok(r) => {
                    let status = r.status();
                    let text = r.text().await.unwrap_or_default();
                    println!("DEBUG: Backend status: {}, Response: {}", status, text); 

                    if status.is_success() {
                        if let Ok(json) = serde_json::from_str::<Value>(&text) {
                            if let (Some(tx_id), Some(amount)) = (json["transaction_id"].as_str(), json["amount"].as_i64()) {
                                bot.send_invoice(
                                    chat_id, 
                                    "📦 Оплата лидов", 
                                    format!("Ніша: {} | {} шт.", niche, size),
                                    tx_id.to_string(), 
                                    "", 
                                    "XTR", 
                                    vec![LabeledPrice::new("Stars", amount as i32)],
                                ).await?;
                            }
                        }
                    } else {
                        bot.send_message(chat_id, format!("❌ Ошибка сервера: {}", status)).await?;
                    }
                },
                Err(e) => {
                    println!("DEBUG: Network error: {}", e);
                    bot.send_message(chat_id, "📡 Сервер бэкенда недоступен").await?;
                }
            }
        }
        "main_menu_text" => {
            bot.edit_message_text(chat_id, msg.id, "⚡ <b>REFINERY TERMINAL</b>\n\nВыберите раздел:")
                .parse_mode(ParseMode::Html)
                .reply_markup(main_menu()).await?;
        }
        
        "about" => {
            bot.edit_message_text(chat_id, msg.id, "ℹ️ <b>О НАС</b>\n\n<b>Refinery</b> — инструмент для профессионалов..")
                .parse_mode(ParseMode::Html)
                .reply_markup(InlineKeyboardMarkup::new(vec![vec![InlineKeyboardButton::callback("⬅️ НАЗАД", "main_menu_text")]]))
                .await?;
        }
        
        _ => {}
    }

    let _ = bot.answer_callback_query(q.id).await;
    Ok(())
}

async fn pre_checkout_handler(bot: Bot, q: PreCheckoutQuery) -> ResponseResult<()> {
    bot.answer_pre_checkout_query(q.id, true).await?;
    Ok(())
}

async fn payment_success_handler(bot: Bot, msg: Message, state: AppState) -> ResponseResult<()> {
    if let Some(payment) = msg.successful_payment() {
        let payload = payment.invoice_payload.clone();
        let chat_id = msg.chat.id;

        // 1. Повідомляємо юзера, що ми обробляємо замовлення
        let wait_msg = bot.send_message(chat_id, "⏳ <b>Обрабатываем ваш заказ...</b>\nЭто может занять несколько секунд.").parse_mode(ParseMode::Html).await?;

        // 2. Робимо запит на бекенд для підтвердження та отримання звіту
        let resp = state.client.post(format!("{}/payments/confirm", state.api_url))
            .json(&serde_json::json!({ "transaction_id": payload }))
            .send().await;

        match resp {
            Ok(r) => {
                let text = r.text().await.unwrap_or_default();
                if let Ok(json) = serde_json::from_str::<Value>(&text) {
                    // Дістаємо наш сформований звіт з поля "report"
                    if let Some(report_text) = json["report"].as_str() {
                        
                        // 3. Створюємо файл у пам'яті (без запису на диск)
                        let document = teloxide::types::InputFile::memory(report_text.as_bytes().to_vec())
                            .file_name(format!("leads_{}.txt", payload.chars().take(8).collect::<String>()));

                        bot.send_document(chat_id, document)
                            .caption("✅ <b>ОПЛАТА УСПЕШНА</b>\n\nВаши лиды сформированы в файл выше. Спасибо за покупку!")
                            .parse_mode(ParseMode::Html)
                            .await?;
                        
                        // Видаляємо тимчасове повідомлення "зачекайте"
                        let _ = bot.delete_message(chat_id, wait_msg.id).await;
                    } else {
                        bot.send_message(chat_id, "❌ Ошибка: Не удалось создать отчет. Обратитесь в поддержку.").await?;
                    }
                }
            },
            Err(e) => {
                eprintln!("Error confirming payment: {}", e);
                bot.send_message(chat_id, "📡 Ошибка связи с сервером. Не беспокойтесь, ваши средства сохранены, обратитесь в поддержку.").await?;
            }
        }
    }
    Ok(())
}