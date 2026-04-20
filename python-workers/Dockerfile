FROM python:3.11-slim

WORKDIR /app

# Встановлюємо лише базові інструменти для завантаження
RUN apt-get update && apt-get install -y \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- ОСЬ ТУТ МАГІЯ ---
# Спочатку ставимо сам бінарник браузера
RUN playwright install chromium
# Потім ставимо ВСІ системні залежності саме для цього браузера
RUN playwright install-deps chromium

COPY . .

ENV PYTHONPATH=/app

CMD ["python", "dashboard.py"]