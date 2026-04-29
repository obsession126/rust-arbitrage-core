import os
import asyncio
import asyncpg
import sys
import logging
import aiohttp
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.utils.keyboard import ReplyKeyboardBuilder, InlineKeyboardBuilder
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties

# ================= CONFIGURATION =================
TOKEN = os.getenv("BOT_TOKEN","7857557403:AAGQQUuXlX5hBfAGkTq0gt0QPJU02xDNBv8")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:admin@127.0.0.1:5433/refinery")
API_URL = os.getenv("API_URL", "http://127.0.0.1:8080/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

bot = Bot(token=TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()
db_pool = None

async def get_db():
    global db_pool
    if db_pool is None:
        db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)
    return db_pool

# ================= CONTENT =================
VALIDATION_TEXT = (
    "📊 <b>RANKING LOGIC [REFINERY]</b>\n\n"
    "We evaluate each target based on 12 parameters. Core tiers:\n\n"
    "⚪️ <b>SILVER</b>\n"
    "├ <i>Domain:</i> 30+ days old\n"
    "├ <i>Contacts:</i> General (info@, office@)\n"
    "└ <i>Analysis:</i> Low ad activity detected.\n\n"
    "🟡 <b>GOLD</b>\n"
    "├ <i>Domain:</i> 1+ year old\n"
    "├ <i>Contacts:</i> Direct manager emails\n"
    "└ <i>Analysis:</i> Active Pixels (FB/Google), fresh creatives.\n\n"
    "💎 <b>PLATINUM</b>\n"
    "├ <i>Domain:</i> High-trust aged domains\n"
    "├ <i>Contacts:</i> Personal mobile + Decision Makers (CEO/Owner)\n"
    "└ <i>Analysis:</i> High budgets, TikTok Ads & full funnel analytics.\n\n"
    "🛡 <b>TERMINAL PRINCIPLES:</b>\n"
    "🤝 <b>EXCLUSIVITY:</b> Every lead is sold <u>strictly to one person</u>.\n"
    "🔥 <b>ROI FOCUSED:</b> We only parse high-ticket, 'hot' niches."
)

# ================= KEYBOARDS =================

def get_main_menu():
    builder = ReplyKeyboardBuilder()
    builder.row(types.KeyboardButton(text="⚡️ TERMINAL"))
    return builder.as_markup(resize_keyboard=True)

# ================= HANDLERS =================

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    pool = await get_db()
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO users (tg_id, name, provider, is_new, created_at) 
               VALUES ($1, $2, 'telegram', true, NOW()) 
               ON CONFLICT (tg_id) DO UPDATE SET name = EXCLUDED.name""",
            message.from_user.id, message.from_user.full_name
        )
    await message.answer("<b>[ ACCESS GRANTED ]</b>\n\nWelcome to <b>LEADHUNTER MAINNET v2.0</b>.", reply_markup=get_main_menu())

@dp.message(F.text == "⚡️ TERMINAL")
async def terminal_handler(message: types.Message):
    builder = InlineKeyboardBuilder()
    builder.row(types.InlineKeyboardButton(text="🌐 BROWSE NICHES", callback_data="catalog_niches"))
    builder.row(types.InlineKeyboardButton(text="🎁 DAILY FREE PLATINUM", callback_data="claim_daily"))
    builder.row(types.InlineKeyboardButton(text="🧪 VALIDATION METHOD", callback_data="info_val_main"))
    await message.answer("<b>🛰 CENTRAL TERMINAL</b>\n\nSelect an action:", reply_markup=builder.as_markup())



@dp.callback_query(F.data == "catalog_niches")
async def process_catalog(callback: types.CallbackQuery):
    pool = await get_db()
    async with pool.acquire() as conn:
        categories = await conn.fetch(
            "SELECT DISTINCT category FROM leads WHERE user_id IS NULL AND is_active = true"
        )
    
    if not categories:
        await callback.answer("Terminal Empty: No available leads.", show_alert=True)
        return

    builder = InlineKeyboardBuilder()
    for cat in categories:
        builder.row(types.InlineKeyboardButton(text=f"📂 {cat['category'].upper()}", callback_data=f"niche:{cat['category']}"))
    
    builder.row(types.InlineKeyboardButton(text="⬅️ BACK", callback_data="back_to_terminal"))
    await callback.message.edit_text("🎯 <b>SELECT A NICHE:</b>", reply_markup=builder.as_markup())


# 1. Підтверджуємо готовність прийняти оплату
@dp.pre_checkout_query()
async def pre_checkout_query_handler(pre_checkout_q: types.PreCheckoutQuery):
    await bot.answer_pre_checkout_query(pre_checkout_q.id, ok=True)

# 2. Обробляємо успішну оплату
@dp.message(F.successful_payment)
async def successful_payment_handler(message: types.Message):
    tx_id = message.successful_payment.invoice_payload
    
    async with aiohttp.ClientSession() as session:
        # Смикаємо Rust бекенд для підтвердження і отримання лідів
        payload = {"transaction_id": tx_id}
        async with session.post(f"{API_URL}/payments/confirm", json=payload) as resp:
            if resp.status == 200:
                data = await resp.json()
                report = data.get("report", "Error generating report")
                # Надсилаємо готовий звіт юзеру
                await message.answer(report, parse_mode=None) # parse_mode=None бо там префікс 🦾
            else:
                err_text = await resp.text()
                await message.answer(f"❌ Payment confirmed, but delivery failed: {err_text}")

@dp.callback_query(F.data.startswith("niche:"))
async def process_ranks(callback: types.CallbackQuery):
    niche = callback.data.split(":")[1]
    pool = await get_db()
    
    builder = InlineKeyboardBuilder()
    ranks = ["silver", "gold", "platinum"]
    
    async with pool.acquire() as conn:
        for rank in ranks:
            count = await conn.fetchval(
                "SELECT COUNT(*) FROM leads WHERE category = $1 AND rank::text = $2 AND user_id IS NULL AND is_active = true",
                niche, rank
            )
            if count > 0:
                builder.row(types.InlineKeyboardButton(
                    text=f"💎 {rank.upper()} ({count} available)", 
                    callback_data=f"rank_select:{niche}:{rank}"
                ))

    builder.row(types.InlineKeyboardButton(text="🔍 HOW WE EVALUATE?", callback_data=f"val_info:{niche}"))
    builder.row(types.InlineKeyboardButton(text="⬅️ BACK", callback_data="catalog_niches"))
    
    await callback.message.edit_text(f"📈 Niche: <b>{niche.upper()}</b>\nSelect quality tier:", reply_markup=builder.as_markup())

@dp.callback_query(F.data.startswith("rank_select:"))
async def process_quantity(callback: types.CallbackQuery):
    _, niche, rank = callback.data.split(":")
    pool = await get_db()
    
    async with pool.acquire() as conn:
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM leads WHERE category = $1 AND rank::text = $2 AND user_id IS NULL AND is_active = true",
            niche, rank
        )

    builder = InlineKeyboardBuilder()
    sizes = [10, 50, 100]
    for s in sizes:
        if count >= s:
            builder.row(types.InlineKeyboardButton(text=f"📦 PACKAGE: {s} PCS", callback_data=f"pay:{niche}:{s}:{rank}"))
    
    builder.row(types.InlineKeyboardButton(text="⬅️ BACK", callback_data=f"niche:{niche}"))
    await callback.message.edit_text(
        f"💎 Rank: <b>{rank.upper()}</b>\nAvailable: <code>{count}</code>\nSelect volume:", 
        reply_markup=builder.as_markup()
    )

# python_bot.py
@dp.callback_query(F.data == "claim_daily")
async def claim_daily_handler(callback: types.CallbackQuery):
    async with aiohttp.ClientSession() as session:
        try:
            payload = {"user_id": callback.from_user.id} 
            
            async with session.post(f"{API_URL}/leads/claim-free", json=payload) as resp:
                response_text = await resp.text()
                
                if resp.status == 200:
                    import json
                    data = json.loads(response_text)
                    url, name, raw = data[0], data[1], data[2]

                    # Parsing contact data
                    emails = ", ".join(raw.get("emails", [])) or "N/A"
                    phones = ", ".join(raw.get("phones", [])) or "N/A"
                    
                    # Marketing intelligence extraction
                    ads = raw.get("ads", {})
                    ads_status = (
                        f"G-Ads: {'✅' if ads.get('google') else '❌'} | "
                        f"FB: {'✅' if ads.get('fb') else '❌'} | "
                        f"TikTok: {'✅' if ads.get('tiktok') else '❌'}"
                    )

                    # Terminal-style output
                    message = (
                        f"✅ <b>BONUS LEAD ACTIVATED</b>\n"
                        f"────────────────────\n"
                        f"🏢 <b>Target:</b> <code>{name}</code>\n"
                        f"💎 <b>Tier:</b> <code>PLATINUM</code>\n\n"
                        f"📞 <b>INTELLIGENCE:</b>\n"
                        f"├ <b>Email:</b> <code>{emails}</code>\n"
                        f"└ <b>Phone:</b> <code>{phones}</code>\n\n"
                        f"📊 <b>MARKETING ANALYSIS:</b>\n"
                        f"├ <b>Ad Activity:</b> {ads_status}\n"
                        f"├ <b>Domain Age:</b> <code>{raw.get('domain_age_days', 0)} days</code>\n"
                        f"└ <b>Status:</b> Active Player\n\n"
                        f"👉 <a href='{url}'>ACCESS TARGET UPLINK</a>"
                    )

                    await callback.message.answer(message, disable_web_page_preview=True)
                
                else:
                    try:
                        import json
                        err_data = json.loads(response_text)
                        msg = err_data.get('error', 'Access Denied')
                    except:
                        msg = "System error"
                    await callback.answer(f"❌ {msg}", show_alert=True)
                    
        except Exception as e:
            logging.error(f"Backend Link Failure: {e}")
            await callback.answer("📡 Terminal Connection Refused", show_alert=True)

# ================= SYSTEM HANDLERS =================

@dp.callback_query(F.data == "back_to_terminal")
async def back_to_terminal(callback: types.CallbackQuery):
    await terminal_handler(callback.message)

@dp.callback_query(F.data == "info_val_main")
async def info_val_main(callback: types.CallbackQuery):
    builder = InlineKeyboardBuilder()
    builder.row(types.InlineKeyboardButton(text="⬅️ BACK", callback_data="back_to_terminal"))
    await callback.message.edit_text(VALIDATION_TEXT, reply_markup=builder.as_markup())

@dp.callback_query(F.data.startswith("val_info:"))
async def val_info_niche(callback: types.CallbackQuery):
    niche = callback.data.split(":")[1]
    builder = InlineKeyboardBuilder()
    builder.row(types.InlineKeyboardButton(text="⬅️ BACK", callback_data=f"niche:{niche}"))
    await callback.message.edit_text(VALIDATION_TEXT, reply_markup=builder.as_markup())

@dp.callback_query(F.data.startswith("pay:"))
async def process_payment(callback: types.CallbackQuery):
    _, niche, qty, rank = callback.data.split(":")
    # Твій стандартний платіж через Stars
    async with aiohttp.ClientSession() as session:
        payload = {"tg_id": callback.from_user.id, "rank": rank, "quantity": int(qty), "category": niche}
        async with session.post(f"{API_URL}/payments/create", json=payload) as resp:
            if resp.status == 200:
                data = await resp.json()
                await bot.send_invoice(
                    chat_id=callback.message.chat.id,
                    title=f"📦 {qty} Leads ({rank.upper()})",
                    description=f"Niche: {niche.upper()}",
                    payload=str(data["transaction_id"]),
                    provider_token="", currency="XTR",
                    prices=[types.LabeledPrice(label="Stars", amount=int(data["amount"]))]
                )

async def main():
    await get_db()
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())