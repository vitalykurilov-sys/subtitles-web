# Subtitles Frontend

Простой веб-интерфейс для просмотра субтитров в реальном времени.

## Локальный запуск

Просто откройте `index.html` в браузере или используйте простой HTTP сервер:

```bash
cd frontend
python -m http.server 3000
```

Откройте http://localhost:3000

## Деплой на Vercel

1. Зарегистрируйтесь на vercel.com
2. Подключите GitHub репозиторий
3. Выберите папку `frontend` как root
4. После деплоя обновите `WS_URL` в `app.js` на URL вашего backend на Render
5. Vercel автоматически задеплоит при каждом push в GitHub

## Важно

После деплоя backend на Render, обновите `WS_URL` в файле `app.js`:
```javascript
const WS_URL = 'wss://your-backend-name.onrender.com/ws';
```
