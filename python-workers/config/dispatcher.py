import asyncio
import os
import json
import redis.asyncio as redis
import asyncpg
from dotenv import load_dotenv

load_dotenv()
REDIS_URL = os.getenv("REDIS_URL")
DATABASE_URL = os.getenv("DATABASE_URL").replace("postgres://", "postgresql://", 1)

async def dispatch_tasks():
    r = redis.from_url(REDIS_URL, decode_responses=True)
    conn = await asyncpg.connect(DATABASE_URL)
    print("🚦 Диспетчер задач OSINT запущено...")

    while True:
        try:
            # 1. Шукаємо ліди, які ще не пройшли OSINT (статус 'new')
            # Беремо невелику пачку, щоб не перевантажувати чергу
            # У файлі dispatch_tasks.py
            leads = await conn.fetch("""
                SELECT id, target_name, target_url, category  
                FROM leads 
                WHERE status = 'new' 
                LIMIT 10
            """)

            for lead in leads:
                task = {
                    "lead_id": str(lead['id']),
                    "category": lead['category'],
                    "command": "START_OSINT",
                    "payload": {
                        "name": lead['target_name'],          # Додано
                        "target_url": lead['target_url']
                    }
                }

                
                # 2. Кидаємо в чергу для osint_worker
                await r.lpush("osint_tasks", json.dumps(task))
                
                # 3. Тимчасово міняємо статус на 'processing', щоб не взяти його знову
                await conn.execute("UPDATE leads SET status = 'processing' WHERE id = $1", lead['id'])
                
                print(f"📤 Лід {lead['id']} відправлено на OSINT")

            # 4. Пауза між перевірками, щоб дати воркерам подихати
            await asyncio.sleep(10) 

        except Exception as e:
            print(f"🔥 Помилка диспетчера: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(dispatch_tasks())