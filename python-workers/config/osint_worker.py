import asyncio
import json
import re
import os
import random
import redis.asyncio as redis
import asyncpg
import httpx
from datetime import datetime
from playwright.async_api import async_playwright
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")
REDIS_URL = os.getenv("REDIS_URL")
DATABASE_URL = os.getenv("DATABASE_URL").replace("postgres://", "postgresql://", 1)

EMAIL_REGEX = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
PHONE_REGEX = r'(?:\+?\d{1,4}[\s.-]?)?\(?\d{1,5}\)?[\s.-]?\d{3,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}'


def clean_emails(found_emails):
    cleaned = set()
    excluded_ext = ('.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.pdf', '.css')
    for email in found_emails:
        email = email.lower().strip()
        if not any(email.endswith(ext) for ext in excluded_ext) and len(email) > 5:
            cleaned.add(email)
    return list(cleaned)


def clean_phones(found_phones, country_code="PL"):
    configs = {
        "UA": {"prefixes": ("380", "0"), "lengths": (10, 12), "strict": True},
        "US": {"prefixes": ("1",), "lengths": (10, 11), "strict": False},
        "PL": {"prefixes": ("48",), "lengths": (9, 11), "strict": True},
        "GLOBAL": {"prefixes": None, "lengths": (7, 15), "strict": False}
    }
    
    cfg = configs.get(country_code.upper(), configs["GLOBAL"])
    cleaned = set()

    for ph in found_phones:
        ph = ph.strip()
        
        
        if ph.count('.') > 1: continue
        if '.' in ph and len(ph.split('.')[-1]) > 4: continue
        
        if "0 0 " in ph or ph.startswith("M"): continue

        digits = re.sub(r'[^\d]', '', ph)
        if not (cfg["lengths"][0] <= len(digits) <= cfg["lengths"][1]):
            continue

        if len(digits) > 10 and not any(c in ph for c in ['+', ' ', '(', '-', '/']):
            continue


        if cfg["strict"] and cfg["prefixes"]:
            if not digits.startswith(cfg["prefixes"]):
                continue

        if digits.startswith(('000', '123', '111', '17', '16')):
            # Якщо це не США (де код 1), то ігноруємо
            if not (country_code == "US" and digits.startswith('1')):
                continue

        # --- ФІНАЛЬНЕ ОЧИЩЕННЯ ---
        
        final_ph = ph.rstrip('.,;)]/').lstrip('(')
        if len(digits) >= 7:
            cleaned.add(final_ph)

    return list(cleaned)

def check_ads_request(url, ads_data):
    u = url.lower()
    if "googleadservices" in u or "doubleclick" in u: ads_data["google"] = True
    if "facebook.com/tr" in u or "connect.facebook.net" in u: ads_data["fb"] = True
    if "analytics.tiktok.com" in u: ads_data["tiktok"] = True

async def check_social_activity(page, url, platform):
    try:
        await page.goto(url, timeout=15000, wait_until="domcontentloaded") 
        await asyncio.sleep(3)
        content = (await page.content()).lower()
        if platform == "instagram":
            return "posts" in content or "followers" in content
        if platform == "tiktok":
            return "video" in content or "likes" in content
        return True
    except:
        return False

async def get_domain_age(domain):
    try:
        clean_domain = domain.replace("www.", "")
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"https://rdap.org/domain/{clean_domain}"
            resp = await client.get(url, follow_redirects=True)
            if resp.status_code == 200:
                data = resp.json()
                for e in data.get("events", []):
                    if e.get("eventAction") == "registration":
                        date_str = e.get("eventDate")
                        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                        return (datetime.now(dt.tzinfo) - dt).days
    except Exception as e:
        print(f"⚠️ [RDAP Error] {domain}: {e}")
    return 1000  

async def try_find_site_by_name(name):
    if not name: return None
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        page = await context.new_page()
        try:
            await asyncio.sleep(random.uniform(1, 2))
            search_query = f"{name} official website contact"
            await page.goto(f"https://www.google.com/search?q={search_query.replace(' ', '+')}", timeout=15000)
            
            link_element = await page.query_selector('h3 >> xpath=..') 
            if link_element:
                href = await link_element.get_attribute("href")
                if href and "http" in href and "google.com" not in href:
                    return href
        except Exception as e:
            print(f"⚠️ Помилка пошуку сайту для {name}: {e}")
        finally:
            await browser.close()
    return None

# --- ОСНОВНА ФУНКЦІЯ ОБРОБКИ ---

async def process_osint_task(task):
    lead_id = task.get('lead_id')
    payload = task.get('payload', {})
    url = payload.get('target_url')
    name = payload.get('name') or payload.get('company_name') 
    
    if not url or "no_site_" in url:
        if not name: return
        print(f"🔍 Сайту немає для '{name}', шукаємо...")
        found_url = await try_find_site_by_name(name)
        if found_url: url = found_url
        else: return

    url = url.split('?')[0].rstrip('/')
    if any(x in url for x in ["facebook.com", "instagram.com", "youtube.com"]): return

    domain = url.split("//")[-1].split("/")[0]
    domain_age = await get_domain_age(domain)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
            ignore_https_errors=True
        )
        page = await context.new_page()
        
        ads_data = {"google": False, "fb": False, "tiktok": False}
        found_emails = set()
        found_phones = set()
        contacts = {"socials": {}}

        page.on("request", lambda req: check_ads_request(req.url, ads_data))

        try:
            # ГОЛОВНА СТОРІНКА
            await page.goto(url, timeout=30000, wait_until="domcontentloaded")
            await asyncio.sleep(5) 

            html_content = await page.content()
            found_emails.update(re.findall(EMAIL_REGEX, html_content))
            found_phones.update(re.findall(PHONE_REGEX, html_content))
            
            links = await page.query_selector_all("a")
            contact_page_url = None
            contact_keywords = ['contact', 'kontakt', 'about', 'pro-nas', 'o-nas']

            for link in links:
                href = await link.get_attribute("href")
                if not href: continue
                
                # Пошук прямих контактів в посиланнях (tel:, mailto:)
                if href.startswith('tel:'): found_phones.add(href.replace('tel:', ''))
                if href.startswith('mailto:'): found_emails.add(href.replace('mailto:', ''))

                # Соцмережі
                if "instagram.com" in href: contacts["socials"]["instagram"] = href
                if "tiktok.com" in href: contacts["socials"]["tiktok"] = href
                if "t.me" in href: contacts["socials"]["telegram"] = href

                if not contact_page_url:
                    text = (await link.inner_text()).lower()
                    if any(kw in href.lower() or kw in text for kw in contact_keywords):
                        contact_page_url = href if href.startswith('http') else f"{url.rstrip('/')}/{href.lstrip('/')}"

            # СТОРІНКА КОНТАКТІВ
            if contact_page_url and contact_page_url != url:
                try:
                    await page.goto(contact_page_url, timeout=15000, wait_until="domcontentloaded")
                    await asyncio.sleep(3)
                    contact_html = await page.content()
                    found_emails.update(re.findall(EMAIL_REGEX, contact_html))
                    found_phones.update(re.findall(PHONE_REGEX, contact_html))
                except: pass

            # РАНЖУВАННЯ
            social_status = {}
            for platform, s_url in contacts["socials"].items():
                if platform in ["instagram", "tiktok"]:
                    active = await check_social_activity(page, s_url, platform)
                    social_status[platform] = "Active" if active else "Empty"

            has_ads = any(ads_data.values())
            has_active_social = any(s == "Active" for s in social_status.values())
            
            rank = 'silver'
            if has_ads and has_active_social: rank = 'platinum'
            elif has_ads or has_active_social: rank = 'gold'

            final_emails = clean_emails(list(found_emails))
            final_phones = clean_phones(list(found_phones))

            if not final_emails and not final_phones and not has_ads:
                rank = 'none'

            # Оновлення БД
            conn = await asyncpg.connect(DATABASE_URL)
            await conn.execute("""
                UPDATE leads 
                SET status='completed', rank=$1, raw_data=$2, updated_at=NOW() 
                WHERE id=$3
            """, rank, json.dumps({
                "emails": final_emails, 
                "phones": final_phones,
                "socials": social_status,
                "ads": ads_data,
                "domain_age_days": domain_age,
                "processed_url": url
            }), lead_id)
            await conn.close()
            print(f"✅ [OSINT DONE] {domain} -> {rank}")

        except Exception as e:
            print(f"❌ Помилка на {domain}: {e}")
        finally:
            await browser.close()

async def main():
    r = redis.from_url(REDIS_URL, decode_responses=True)
    print("🕵️ OSINT Worker Online (Listening 'osint_tasks')...")
    while True:
        try:
            res = await r.brpop("osint_tasks", timeout=10)
            if res: 
                task = json.loads(res[1])
                await process_osint_task(task)
        except Exception as e:
            print(f"🔥 Воркер: {e}")
            await asyncio.sleep(2)

if __name__ == "__main__":
    asyncio.run(main())