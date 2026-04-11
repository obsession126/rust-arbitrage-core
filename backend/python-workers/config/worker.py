import asyncio
import json
import re
import os
import redis.asyncio as redis
import whois
from datetime import datetime
from playwright.async_api import async_playwright
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")
QUEUE_NAME = "osint_tasks"

# Регулярні вирази для пошуку контактів
EMAIL_REGEX = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
PHONE_REGEX = r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3}[-.\s]?\d{2,4}[-.\s]?\d{2,4}'

async def get_domain_age(domain):
    try:
        loop = asyncio.get_event_loop()
        w = await loop.run_in_executor(None, whois.whois, domain)
        res = w.creation_date
        if isinstance(res, list): res = res[0]
        if res: return (datetime.now() - res).days
        return 9999
    except: return 0

async def check_social_activity(page, url, platform):
    """Заходить у соцмережу та шукає ознаки постів/активності"""
    print(f"🔗 Перевірка активності {platform}: {url}")
    try:
        await page.goto(url, timeout=15000, wait_until="domcontentloaded")
        await asyncio.sleep(3) # Чекаємо завантаження постів
        content = await page.content()
        
        if platform == "instagram":
            return "posts" in content.lower() or "followers" in content.lower()
        if platform == "tiktok":
            return "video" in content.lower() or "likes" in content.lower()
        return True
    except:
        return False
    
def clean_phones(found_phones):
    cleaned = set()
    # Коди країн, які ми очікуємо (PL, UA, US)
    trusted_prefixes = ('+48', '48', '+38', '38', '0', '+1')

    for ph in found_phones:
        raw = ph.strip()
        
        if '.' in raw:
            continue

        digits = re.sub(r'[^\d]', '', raw)
        if not (9 <= len(digits) <= 12):
            continue
        if digits.startswith(('11', '17', '18', '19')):
            if not raw.startswith('+'):
                continue

        # 5. Перевірка префікса
        if raw.startswith(trusted_prefixes):
            cleaned.add(raw)

    return list(cleaned)

async def process_osint_task(task):
    url = task['payload']['target_url']
    domain = url.split("//")[-1].split("/")[0]
    
    print(f"🕵️ [OSINT] Глибокий аналіз: {domain}")
    domain_age = await get_domain_age(domain)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Важливо: додаємо реалістичний User-Agent для соцмереж
        context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36")
        page = await context.new_page()
        
        ads_data = {"google": False, "fb": False, "tiktok": False}
        contacts = {"emails": [], "phones": [], "socials": {}}

        page.on("request", lambda req: check_ads_request(req.url, ads_data))

        try:
            await page.goto(url, timeout=30000, wait_until="domcontentloaded")
            
            await asyncio.sleep(5) 

            await page.mouse.wheel(0, 3000)
            await asyncio.sleep(2)

            html_content = await page.content()
            contacts["emails"] = list(set(re.findall(EMAIL_REGEX, html_content)))
            raw_phones = re.findall(PHONE_REGEX, html_content)

            tel_links = await page.query_selector_all("a[href^='tel:']")
            for link in tel_links:
                href = await link.get_attribute("href")
                if href:
                    raw_phones.append(href.replace("tel:", ""))

            contacts["phones"] = clean_phones(raw_phones)

            links = await page.query_selector_all("a")
            for link in links:
                href = await link.get_attribute("href")
                if not href: continue
                if "instagram.com" in href: contacts["socials"]["instagram"] = href
                if "tiktok.com" in href: contacts["socials"]["tiktok"] = href
                if "t.me" in href or "telegram.me" in href: contacts["socials"]["telegram"] = href

            social_status = {}
            for platform, s_url in contacts["socials"].items():
                if platform in ["instagram", "tiktok"]:
                    is_active = await check_social_activity(page, s_url, platform)
                    social_status[platform] = "Active" if is_active else "Empty/Hidden"

            # Результати
            print(f"--- РЕЗУЛЬТАТ ДЛЯ {domain} ---")
            print(f"📅 Вік: {domain_age} днів")
            print(f"📧 Пошти: {contacts['emails']}")
            print(f"📞 Телефони: {contacts['phones']}")
            print(f"📱 Соцмережі: {social_status}")
            print(f"💰 Реклама: {ads_data}")

        except Exception as e:
            print(f"❌ Помилка: {e}")
        finally:
            await browser.close()

def check_ads_request(url, ads_data):
    u = url.lower()
    if "googleadservices" in u or "doubleclick" in u: ads_data["google"] = True
    if "facebook.com/tr" in u: ads_data["fb"] = True
    if "analytics.tiktok.com" in u: ads_data["tiktok"] = True

# ... (main функція залишається такою ж)


async def main():
    # Підключення до Redis
    r = redis.from_url(REDIS_URL, decode_responses=True)
    print(f"🤖 Воркер запущений. Слухаю чергу '{QUEUE_NAME}'...")

    while True:
        try:
            result = await r.brpop(QUEUE_NAME)
            if not result:
                continue
                
            _, raw_data = result
            task = json.loads(raw_data)

            if "target" in task:
                await process_parse_task(task)
            elif "command" in task and task["command"] == "START_OSINT":
                await process_osint_task(task)
            else:
                print("⚠️ Отримано невідомий формат задачі")

        except Exception as e:
            print(f"🔥 Критична помилка воркера: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())