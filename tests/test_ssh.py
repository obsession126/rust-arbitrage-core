import psycopg2 # або sqlalchemy

try:
    conn = psycopg2.connect(
        host="localhost",
        port="5433",
        database="refinery",
        user="user",
        password="admin"
    )
    print("✅ Кайф! Тунель працює, база на зв'язку.")
    conn.close()
except Exception as e:
    print(f"❌ Щось не так: {e}")