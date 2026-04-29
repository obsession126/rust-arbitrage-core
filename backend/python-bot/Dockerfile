# Використовуємо легкий образ Python
FROM python:3.11-slim

# Встановлюємо робочу директорію
WORKDIR /app

# Встановлюємо системні залежності (якщо знадобляться для деяких ліб)
# Для більшості aiogram проектів вистачає стандартних
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Копіюємо файл залежностей
COPY requirements.txt .

# Встановлюємо залежності без кешування, щоб зменшити розмір образу
RUN pip install --no-cache-dir -r requirements.txt

# Копіюємо весь код бота
COPY . .

# Команда для запуску
# Переконайся, що твій головний файл називається main.py
CMD ["python", "main.py"]