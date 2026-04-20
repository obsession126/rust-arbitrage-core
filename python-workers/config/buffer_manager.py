import asyncio
import os
import json
import redis.asyncio as redis
import asyncpg
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")
REDIS_URL = os.getenv("REDIS_URL")
DATABASE_URL = os.getenv("DATABASE_URL").replace("postgres://", "postgresql://", 1)

LIMITS = {'platinum': 30, 'gold': 50, 'silver': 100}

async def maintain_buffers():
    r = redis.from_url(REDIS_URL, decode_responses=True)
    conn = await asyncpg.connect(DATABASE_URL)
    print("📦 Buffer Manager Online...")

    while True:
        try:

            categories = await conn.fetch("SELECT DISTINCT category FROM leads")
            
            for cat_row in categories:
                category = cat_row['category']
                for rank, limit in LIMITS.items():
                    buffer_key = f"buffer:{category}:{rank}"
                    current_len = await r.llen(buffer_key)
                    
                    if current_len < limit:

                        needed = limit - current_len
                        leads = await conn.fetch(
                            "SELECT id FROM leads WHERE category=$1 AND rank=$2 AND status='completed' LIMIT $3",
                            category, rank, needed
                        )
                        
                        for b_lead in leads:
                            l_id = str(b_lead['id'])
                            existing = await r.lpos(buffer_key, l_id)
                            if existing is None:
                                await r.rpush(buffer_key, l_id)
            
            await asyncio.sleep(30)
        except Exception as e:
            print(f"🔥 Buffer Error: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(maintain_buffers())