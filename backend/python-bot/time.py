import os
import sys
import json
import asyncio
import logging
import asyncpg
import aiohttp
from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import Command
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, LabeledPrice, BufferedInputFile
from aiogram.utils.keyboard import InlineKeyboardBuilder

# Налаштування логування
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Конфігурація
TOKEN = "7857557403:AAGQQUuXlX5hBfAGkTq0gt0QPJU02xDNBv8"
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:mysecretpassword@localhost:5432/postgres")
API_URL = os.getenv("API_URL", "http://localhost:8080")
ADMIN_ID = 5965022336

# =========================================================
# ВИНОСИМО ІНІЦІАЛІЗАЦІЮ СЮДИ (ГЛОБАЛЬНИЙ РІВЕНЬ)
bot = Bot(token=TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()
# =========================================================

# --- КЛАВІАТУРИ ---
def get_main_menu() -> InlineKeyboardMarkup:
# ... (далі код клавіатур)
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text="📂 ОТКРЫТЬ КАТАЛОГ", callback_data="catalog"))
    builder.row(
        InlineKeyboardButton(text="💳 БАЛАНС", callback_data="wallet"),
        InlineKeyboardButton(text="⚙️ СЕРВИС", callback_data="settings")
    )
    builder.row(InlineKeyboardButton(text="🎁 DAILY FREE PLATINUM", callback_data="claim_daily"))
    return builder.as_markup()

# --- ХЕНДЛЕРИ: СТАРТ ТА МЕНЮ ---

@dp.message(Command("start"))
async def cmd_start(message: types.Message, db_pool: asyncpg.Pool):
    tg_id = message.from_user.id
    user_name = message.from_user.username or message.from_user.first_name or "Unknown"

    async with db_pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO users (tg_id, name, provider, is_new, created_at)
            VALUES ($1, $2, 'telegram', true, NOW())
            ON CONFLICT (tg_id) DO UPDATE SET name = EXCLUDED.name
        """, tg_id, user_name)

    await message.answer(
        "⚡ <b>REFINERY TERMINAL</b>\n\nСистема готова к работе.",
        reply_markup=get_main_menu()
    )

@dp.callback_query(F.data == "main_menu_text")
async def back_to_main(callback: types.CallbackQuery):
    await callback.message.edit_text(
        "⚡ <b>REFINERY TERMINAL</b>\n\nВыберите раздел:",
        reply_markup=get_main_menu()
    )

# --- ХЕНДЛЕРИ: DAILY FREE PLATINUM ---

@dp.callback_query(F.data == "claim_daily")
async def claim_daily_lead(callback: types.CallbackQuery, db_pool: asyncpg.Pool):
    tg_id = callback.from_user.id

    async with db_pool.acquire() as conn:
        # Відкриваємо транзакцію (важливо для SKIP LOCKED)
        async with conn.transaction():
            user = await conn.fetchrow("SELECT id, is_new FROM users WHERE tg_id = $1", tg_id)
            if not user:
                await callback.answer("❌ Пользователь не найден.", show_alert=True)
                return

            if tg_id != ADMIN_ID and not user['is_new']:
                await callback.answer("❌ Вы уже получили свой бонус. Возвращайтесь завтра!", show_alert=True)
                return

            # Шукаємо вільний лід
            lead = await conn.fetchrow("""
                SELECT id, target_url, target_name, raw_data 
                FROM leads 
                WHERE rank::text = 'platinum' AND user_id IS NULL AND is_active = true 
                LIMIT 1 FOR UPDATE SKIP LOCKED
            """)

            if not lead:
                await callback.answer("❌ К сожалению, доступные Platinum-лиды закончились.", show_alert=True)
                return

            # Оновлюємо статуси
            await conn.execute("UPDATE leads SET user_id = $1, status = 'completed' WHERE id = $2", user['id'], lead['id'])
            await conn.execute("UPDATE users SET is_new = false WHERE id = $1", user['id'])

    # Формуємо повідомлення
    raw = lead['raw_data'] or {}
    if isinstance(raw, str):
        raw = json.loads(raw)

    emails = ", ".join(raw.get('emails', [])) if raw.get('emails') else "Не найдено"
    phones = ", ".join(raw.get('phones', [])) if raw.get('phones') else "Не найдено"
    ads = raw.get('ads', {})
    
    ads_info = (f"Google: {'✅' if ads.get('google') else '❌'}, "
                f"FB: {'✅' if ads.get('fb') else '❌'}, "
                f"TikTok: {'✅' if ads.get('tiktok') else '❌'}")

    msg_text = (
        f"✅ <b>БОНУСНЫЙ ЛИД АКТИВИРОВАН</b>\n"
        f"────────────────────\n"
        f"🏢 <b>Компания:</b> <code>{lead['target_name']}</code>\n"
        f"💎 <b>Ранг:</b> <code>PLATINUM</code>\n\n"
        f"📞 <b>КОНТАКТЫ:</b>\n"
        f"├ <b>Email:</b> <code>{emails}</code>\n"
        f"└ <b>Тел:</b> <code>{phones}</code>\n\n"
        f"📊 <b>МАРКЕТИНГОВЫЙ АНАЛИЗ:</b>\n"
        f"├ <b>Рекламная активность:</b> {ads_info}\n"
        f"├ <b>Возраст домена:</b> <code>{raw.get('domain_age_days', 0)} дней</code>\n"
        f"└ <b>Статус:</b> Активный игрок\n\n"
        f"👉 <a href='{lead['target_url']}'>ОТКРЫТЬ САЙТ ОБЪЕКТА</a>"
    )

    await callback.message.answer(msg_text, disable_web_page_preview=True)
    await callback.answer()

# --- ХЕНДЛЕРИ: КАТАЛОГ ТА НАВІГАЦІЯ ---

@dp.callback_query(F.data == "catalog")
async def show_catalog(callback: types.CallbackQuery, db_pool: asyncpg.Pool):
    async with db_pool.acquire() as conn:
        categories = await conn.fetch("SELECT DISTINCT category FROM leads WHERE user_id IS NULL AND is_active = true")

    builder = InlineKeyboardBuilder()
    for row in categories:
        cat = row['category']
        builder.row(InlineKeyboardButton(text=f"📁 {cat.upper()}", callback_data=f"niche:{cat}"))
    
    builder.row(InlineKeyboardButton(text="⬅️ НАЗАД", callback_data="main_menu_text"))

    await callback.message.edit_text("🎯 <b>КАТАЛОГ ДОСТУПНЫХ НИШ</b>\n\nВыберите категорию:", reply_markup=builder.as_markup())

@dp.callback_query(F.data.startswith("niche:"))
async def show_niche_ranks(callback: types.CallbackQuery, db_pool: asyncpg.Pool):
    niche = callback.data.split(":")[1]
    ranks = ["silver", "gold", "platinum"]
    
    builder = InlineKeyboardBuilder()
    async with db_pool.acquire() as conn:
        for rank in ranks:
            count = await conn.fetchval(
                "SELECT COUNT(*) FROM leads WHERE category = $1 AND rank::text = $2 AND user_id IS NULL AND is_active = true",
                niche, rank
            )
            if count > 0:
                builder.row(InlineKeyboardButton(text=f"💎 {rank.upper()} ({count} шт)", callback_data=f"rank:{niche}:{rank}"))
    
    builder.row(InlineKeyboardButton(text="🔍 КАК МЫ ОЦЕНИВАЕМ?", callback_data=f"ranking_logic:{niche}"))
    builder.row(InlineKeyboardButton(text="⬅️ НАЗАД", callback_data="catalog"))

    await callback.message.edit_text(f"📈 Ниша: <b>{niche.upper()}</b>\n\nВыберите ранг качества:", reply_markup=builder.as_markup())

@dp.callback_query(F.data.startswith("ranking_logic:"))
async def show_ranking_logic(callback: types.CallbackQuery):
    niche = callback.data.split(":")[1]
    ranking_text = (
        "📊 <b>ЛОГИКА РАНЖИРОВАНИЯ [REFINERY]</b>\n\n"
        "Мы оцениваем каждый объект по 12 параметрам. Основные уровни:\n\n"
        "⚪️ <b>SILVER</b>\n"
        "├ <i>Домен:</i> от 30 дней\n"
        "├ <i>Контакты:</i> Общие (info@, office@)\n"
        "└ <i>Анализ:</i> Низкая активность в рекламе.\n\n"
        "🟡 <b>GOLD</b>\n"
        "├ <i>Домен:</i> от 1 года\n"
        "├ <i>Контакты:</i> Прямые e-mail менеджеров\n"
        "└ <i>Анализ:</i> Активный Pixel (FB/Google), свежие креативы.\n\n"
        "💎 <b>PLATINUM</b>\n"
        "├ <i>Домен:</i> Трастовые старые домены\n"
        "├ <i>Контакты:</i> Личные мобильные + ЛПР (CEO/Owner)\n"
        "└ <i>Анализ:</i> Высокие бюджеты, наличие TikTok Ads и сквозной аналитики.\n\n"
        "🛡 <b>ПРИНЦИПЫ ТЕРМИНАЛА:</b>\n"
        "🤝 <b>ЭКСКЛЮЗИВНОСТЬ:</b> Каждый лид продается <u>строго в одни руки</u>.\n"
        "🔥 <b>ОКУПАЕМОСТЬ:</b> Мы парсим только «горячие» ниши с высоким чеком.\n"
    )
    
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text="⬅️ К ВЫБОРУ РАНГА", callback_data=f"niche:{niche}"))
    
    await callback.message.edit_text(ranking_text, reply_markup=builder.as_markup())

@dp.callback_query(F.data.startswith("rank:"))
async def show_package_sizes(callback: types.CallbackQuery, db_pool: asyncpg.Pool):
    _, niche, rank = callback.data.split(":")
    sizes = [10, 50, 100]
    
    async with db_pool.acquire() as conn:
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM leads WHERE category = $1 AND rank::text = $2 AND user_id IS NULL AND is_active = true",
            niche, rank
        )

    builder = InlineKeyboardBuilder()
    for s in sizes:
        if count >= s:
            builder.row(InlineKeyboardButton(text=f"📦 ПАКЕТ: {s} шт", callback_data=f"pay:{niche}:{s}:{rank}"))
    
    builder.row(InlineKeyboardButton(text="⬅️ НАЗАД", callback_data=f"niche:{niche}"))

    await callback.message.edit_text(
        f"💎 Ранг: <b>{rank.upper()}</b>\nДоступно лидов: <code>{count}</code>\nВыберите объем:",
        reply_markup=builder.as_markup()
    )

# --- ХЕНДЛЕРИ: ОПЛАТА (TELEGRAM STARS) ---

@dp.callback_query(F.data.startswith("pay:"))
async def process_payment_creation(callback: types.CallbackQuery, http_client: aiohttp.ClientSession):
    _, niche, size, rank = callback.data.split(":")
    size = int(size)
    tg_id = callback.from_user.id

    await callback.answer("Формируем счет...", show_alert=False)

    # Запит до твого Rust API
    try:
        async with http_client.post(f"{API_URL}/payments/create", json={
            "tg_id": tg_id, "category": niche, "rank": rank, "quantity": size
        }) as resp:
            
            if resp.status == 200:
                data = await resp.json()
                tx_id = data.get("transaction_id")
                amount = data.get("amount")

                # Виставляємо рахунок у Telegram Stars (XTR)
                await callback.message.answer_invoice(
                    title="📦 Оплата лидов",
                    description=f"Ниша: {niche.upper()} | {size} шт.",
                    payload=str(tx_id),
                    provider_token="", # Для XTR залишаємо порожнім
                    currency="XTR",
                    prices=[LabeledPrice(label="Stars", amount=amount)]
                )
            else:
                text = await resp.text()
                await callback.message.answer(f"❌ Ошибка сервера: {resp.status}\n{text}")
    except Exception as e:
        logging.error(f"API Error: {e}")
        await callback.message.answer("📡 Сервер бэкенда временно недоступен.")

@dp.pre_checkout_query()
async def pre_checkout_handler(pre_checkout_query: types.PreCheckoutQuery):
    await pre_checkout_query.answer(ok=True)

@dp.message(F.successful_payment)
async def payment_success_handler(message: types.Message, http_client: aiohttp.ClientSession):
    payload = message.successful_payment.invoice_payload
    wait_msg = await message.answer("⏳ <b>Обрабатываем ваш заказ...</b>\nЭто может занять несколько секунд.")

    try:
        # Підтвердження на Rust API
        async with http_client.post(f"{API_URL}/payments/confirm", json={"transaction_id": payload}) as resp:
            if resp.status == 200:
                data = await resp.json()
                report_text = data.get("report", "")
                
                if report_text:
                    # Формуємо txt файл у пам'яті
                    doc = BufferedInputFile(report_text.encode('utf-8'), filename=f"leads_{payload[:8]}.txt")
                    
                    await message.answer_document(
                        document=doc,
                        caption="✅ <b>ОПЛАТА УСПЕШНА</b>\n\nВаши лиды сформированы в файл выше. Спасибо за покупку!"
                    )
                    await wait_msg.delete()
                else:
                    await message.answer("❌ Ошибка: Не удалось создать отчет из ответа сервера.")
            else:
                await message.answer("📡 Ошибка подтверждения на сервере. Обратитесь в поддержку.")
    except Exception as e:
        logging.error(f"Confirmation Error: {e}")
        await message.answer("📡 Ошибка связи с сервером. Обратитесь в поддержку.")



async def main():
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    # bot і dp вже створені зверху, тому тут їх видаляємо!

    # Створюємо пули та сесії при старті
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=15)
    http_client = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5))

    # Передаємо їх в усі хендлери (Dependency Injection)
    dp["db_pool"] = db_pool
    dp["http_client"] = http_client

    try:
        logging.info("Bot started!")
        await dp.start_polling(bot)
    finally:
        # Граціозне закриття при зупинці
        await bot.session.close()
        await http_client.close()
        await db_pool.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Bot stopped manually.")