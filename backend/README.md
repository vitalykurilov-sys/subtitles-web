# Subtitles Backend

FastAPI backend для обработки аудио и генерации субтитров в реальном времени.

## Установка

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Отредактируйте .env и добавьте Azure ключи
```

## Запуск локально

```bash
python main.py
```

Сервер запустится на http://localhost:8000

## Деплой на Render

1. Зарегистрируйтесь на render.com
2. Подключите GitHub репозиторий
3. Выберите "Web Service"
4. Укажите:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Добавьте переменные окружения (AZURE_*)
