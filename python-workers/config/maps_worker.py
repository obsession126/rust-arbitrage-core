import asyncio
import json
import os
import random
import redis.asyncio as redis
import asyncpg
from playwright.async_api import async_playwright
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")
REDIS_URL = os.getenv("REDIS_URL")
DATABASE_URL = os.getenv("DATABASE_URL").replace("postgres://", "postgresql://", 1)

async def run_maps_parser(task):
    niche = task.get("name")
    location = task.get("location")
    target = f"{niche} {location}".strip()
    category = task.get("category", niche)
    
    # ПОМИЛКА 1: У твоєму логу був ключ "limit", а ти шукав "count"
    limit = int(task.get("limit") or task.get("count", 20))

    print(f"📡 [MAPS] Пошук: '{target}' (Ліміт: {limit})")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, args=["--disable-blink-features=AutomationControlled"])
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()
        
        # Використовуємо офіційний домен для редиректу
        await page.goto(f"https://www.google.com/maps/search/{target.replace(' ', '+')}")
        
        try: 
            await page.wait_for_selector('div[role="article"]', timeout=10000)
        except Exception as e: 
            print(f"❌ Об'єкти не знайдені або тайм-аут: {e}")
            await browser.close()
            return

        found_count, processed_names = 0, set()
        
        # ПОМИЛКА 2: Переконайся, що DATABASE_URL вірний
        try:
            conn = await asyncpg.connect(DATABASE_URL)
            print("🐘 Підключено до бази даних")
        except Exception as e:
            print(f"🔥 КРИТИЧНА ПОМИЛКА БД: {e}")
            await browser.close()
            return

        try:
            while found_count < limit:
                items = await page.query_selector_all('div[role="article"]')
                
                # Якщо нових елементів немає після скролу — виходимо
                if not items:
                    break

                for item in items:
                    if found_count >= limit: break
                    
                    try:
                        name = await item.get_attribute('aria-label')
                        if not name or name in processed_names: continue
                        processed_names.add(name)

                        # Клік і деталі
                        await item.click()
                        await asyncio.sleep(2) # Google повільний, дай йому час
                        
                        site_el = await page.query_selector('a[data-item-id="authority"]')
                        website = await site_el.get_attribute('href') if site_el else "Немає"
                        
                        phone_el = await page.query_selector('button[data-item-id^="phone:tel:"]')
                        phone = (await phone_el.get_attribute('data-item-id')).replace('phone:tel:', '') if phone_el else "Немає"

                        # Генеруємо URL для конфілктів, якщо сайту немає
                        final_url = website if website != "Немає" else f"no_site_{name.replace(' ', '_')}"
                        
                        # ПОМИЛКА 3: Прибираємо порожній 'except: continue'
                        # Тут ми виводимо помилку запису, якщо вона є
                        result = await conn.execute('''
                                        INSERT INTO leads (
                                            target_name, 
                                            target_url, 
                                            category, 
                                            rank,        
                                            status, 
                                            raw_data, 
                                            created_at, 
                                            updated_at
                                        )
                                        VALUES ($1, $2, $3, 'bronze', 'new', $4, NOW(), NOW()) 
                                        ON CONFLICT (target_url) DO NOTHING
                                    ''', name, final_url, category, json.dumps({"phone": phone}))
                        
                        if "INSERT 0 1" in result:
                            found_count += 1
                            print(f"✅ [{found_count}/{limit}] Збережено: {name}")
                        else:
                            print(f"⚠️ Пропущено (дублікат): {name}")

                    except Exception as e:
                        print(f"➘ Помилка при обробці елемента: {e}")
                        continue
                
                # Скролінг
                await page.mouse.wheel(0, 4000)
                await asyncio.sleep(3)
                
                # Перевірка на кінець списку
                page_content = await page.content()
                if "You've reached the end" in page_content or "Це кінець списку" in page_content:
                    print("🏁 Досягнуто кінця списку в Google Maps")
                    break
        finally:
            await conn.close()
            await browser.close()
            print(f"📡 Роботу завершено. Знайдено: {found_count}")

async def main():
    # Обов'язково decode_responses=True
    r = redis.from_url(REDIS_URL, decode_responses=True)
    print("🤖 Maps Worker Online...")
    print(f"📡 Очікую на завдання у черзі: 'maps_tasks'...")

    while True:
        try:

            res = await r.brpop("maps_tasks", timeout=30) 
            
            if res:
                queue_name, raw_data = res
                print(f"📥 Отримано нове завдання: {raw_data}")
                
                task = json.loads(raw_data)
                await run_maps_parser(task)
            else:
                print("⏳ Черга порожня, чекаю далі...")
                
        except Exception as e:
            print(f"🔥 Помилка у циклі воркера: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())