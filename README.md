# Real-time Subtitles (Web Version)

Веб-приложение для генерации субтитров в реальном времени: **Словенский → Английский**

## 🎯 Архитектура

- **Frontend** (Vercel): HTML/CSS/JS интерфейс с WebSocket
- **Backend** (Render): FastAPI + Azure Speech/Translator

## 🚀 Быстрый старт

### Backend (локально)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Отредактируйте .env и добавьте Azure ключи
python main.py
```

Backend запустится на http://localhost:8000

### Frontend (локально)

```bash
cd frontend
python -m http.server 3000
```

Откройте http://localhost:3000 в браузере

## 📦 Деплой

### 1. GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ваш-username/subtitles-web.git
git push -u origin main
```

### 2. Backend на Render
1. Зайдите на render.com и подключите GitHub
2. Создайте новый Web Service
3. Root Directory: `backend`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Добавьте Environment Variables (AZURE_SPEECH_KEY и т.д.)
7. Скопируйте URL (например: `https://subtitles-backend.onrender.com`)

### 3. Frontend на Vercel
1. Зайдите на vercel.com и подключите GitHub
2. Root Directory: `frontend`
3. Framework Preset: Other
4. Деплой автоматический
5. **Важно**: После деплоя backend обновите `WS_URL` в `frontend/app.js`:
   ```javascript
   const WS_URL = 'wss://subtitles-backend.onrender.com/ws';
   ```
6. Закоммитьте изменения и запушьте - Vercel автоматически обновится

## 🔑 Azure ключи

Вам нужны:
- Azure Speech Service (для распознавания речи)
- Azure Translator (для перевода)

Получить на https://portal.azure.com

## ✨ Фичи

- ✅ Захват аудио с микрофона в браузере
- ✅ WebSocket стриминг
- ✅ Azure Speech-to-Text (Slovenian)
- ✅ Azure Translator (→ English)
- ✅ Красивый UI с черным фоном
- ✅ Автоскролл
- ✅ Адаптивный дизайн

## 📝 TODO

- [ ] Добавить выбор языков
- [ ] Сохранение истории субтитров
- [ ] Экспорт в SRT/VTT
- [ ] Интеграция с Zoom

---

Made with 🎤 by Vitalij
