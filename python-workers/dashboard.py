import streamlit as st
import httpx
import redis
import pandas as pd
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv
import time

# --- НАЛАШТУВАННЯ ---
load_dotenv()

# УВАГА: URL має вказувати на твій Actix-web сервіс
RUST_API_BASE = os.getenv("RUST_API_URL", "http://127.0.0.1:8080/api/create")
REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db")

# Підключення
r = redis.from_url(REDIS_URL, decode_responses=True)
engine = create_engine(DATABASE_URL.replace("postgres://", "postgresql://"))

st.set_page_config(page_title="LeadRefinery OSINT", layout="wide", page_icon="🧪")

# --- СТИЛІЗАЦІЯ ---
st.markdown("""
    <style>
    .stMetric { background-color: #0e1117; padding: 15px; border-radius: 10px; border: 1px solid #31333f; }
    .stButton>button { width: 100%; border-radius: 5px; height: 3em; background-color: #ff4b4b; color: white; font-weight: bold; }
    .stDataFrame { background-color: #0e1117; border-radius: 10px; }
    </style>
""", unsafe_allow_html=True)

# --- ЛОГІКА API ---
def send_request(action, payload):
    """
    action: 'osint' або 'parse'
    """
    try:
        url = f"{RUST_API_BASE}/{action}"
        response = httpx.post(url, json=payload, timeout=10.0)
        if response.status_code == 200:
            return True, response.json()
        return False, f"Error {response.status_code}: {response.text}"
    except Exception as e:
        return False, f"Connection error: {str(e)}"

# --- SIDEBAR: КЕРУВАННЯ ---
with st.sidebar:
    st.title("🛰 Control Center")
    st.info("Керування воркерами через Rust API")
    
    niche = st.text_input("Niche / Category", "Dental clinics")
    location = st.text_input("Location / City", "Warsaw")
    limit = st.number_input("Target Count", min_value=1, max_value=1000, value=50)
    
    st.divider()
    

    # Кнопка для Maps Scraper
    if st.button("🚀 LAUNCH MAPS SCRAPER"):
        payload = {
            "name": niche,
            "location": location,
            "limit": int(limit)
        }
        ok, res = send_request("parse", payload) # res тут містить або JSON, або текст помилки
        if ok: 
            st.success(f"Task Queued! ID: {res.get('id')}")
        else: 
            st.error(res) # Змінено з msg на res

    # Кнопка для Deep OSINT
    if st.button("🕵️ RUN DEEP OSINT"):
        payload = {
            "name": niche,
            "url": None
        }
        ok, res = send_request("osint", payload)
        if ok: 
            st.info(f"OSINT Started! ID: {res.get('id')}")
        else: 
            st.error(res) # Змінено з msg на res

# --- MAIN: МОНІТОР ---
col1, col2, col3 = st.columns(3)

with col1:
    buffer_key = f"buffer:{niche}:platinum" # Можна додати вибір рангу в UI
    try:
        count = r.llen(buffer_key)
        st.metric("Platinum Buffer", f"{count} leads")
    except:
        st.metric("Platinum Buffer", "Offline")

with col2:
    try:
        osint_q = r.llen("osint_tasks")
        maps_q = r.llen("maps_tasks")
        st.metric("Queues (OSINT / Maps)", f"{osint_q} / {maps_q}")
    except:
        st.metric("Queues", "0 / 0")

with col3:
    st.metric("System Status", "RUNNING", delta="API Active")

st.divider()

# --- ТАБЛИЦЯ ДАНИХ ---
st.subheader("📊 Database Live Feed")
try:
    query = """
        SELECT target_name, target_url, category, rank, updated_at 
        FROM leads 
        ORDER BY updated_at DESC 
        LIMIT 50
    """
    df = pd.read_sql(query, engine)

    def color_rank(val):
        colors = {
            'platinum': 'color: #00ffcc; font-weight: bold',
            'gold': 'color: #ffd700; font-weight: bold',
            'silver': 'color: #c0c0c0; font-weight: bold',
            'none': 'color: #ff4b4b;'
        }
        return colors.get(val, '')

    if not df.empty:
        st.dataframe(
            df.style.applymap(color_rank, subset=['rank']),
            use_container_width=True,
            height=450
        )
    else:
        st.info("База даних порожня. Запустіть парсер.")
except Exception as e:
    st.error(f"DB Error: {e}")

# --- AUTO-REFRESH ---
if st.checkbox("Live Update Mode (10s)", value=True):
    time.sleep(10)
    st.rerun()