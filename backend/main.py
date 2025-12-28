import os
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import azure.cognitiveservices.speech as speechsdk
import requests

load_dotenv()

app = FastAPI(title="Subtitles API")

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене укажите конкретный домен Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Azure credentials
SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY", "")
SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION", "")
TRANSLATOR_KEY = os.getenv("AZURE_TRANSLATOR_KEY", "")
TRANSLATOR_REGION = os.getenv("AZURE_TRANSLATOR_REGION", "")


def translate_text(text: str, to_lang: str = "en") -> str:
    """Переводит текст с помощью Azure Translator"""
    if not text:
        return ""

    endpoint = "https://api.cognitive.microsofttranslator.com/translate"
    params = {"api-version": "3.0", "to": to_lang}
    headers = {
        "Ocp-Apim-Subscription-Key": TRANSLATOR_KEY,
        "Ocp-Apim-Subscription-Region": TRANSLATOR_REGION,
        "Content-Type": "application/json; charset=UTF-8"
    }
    body = [{"Text": text}]

    try:
        resp = requests.post(endpoint, params=params, headers=headers, json=body, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return data[0]["translations"][0]["text"]
    except Exception as e:
        print(f"[Translator] Error: {e}")
        return text


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Subtitles API is running",
        "status": "ok",
        "endpoints": {
            "websocket": "/ws",
            "health": "/"
        }
    }

@app.get("/health")
async def health():
    """Simple health check"""
    return {"status": "healthy"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket для стриминга аудио и получения субтитров"""
    await websocket.accept()
    print("[WebSocket] Client connected")

    try:
        # Сохраняем event loop для использования в callback
        loop = asyncio.get_running_loop()

        # Настройка Azure Speech
        speech_config = speechsdk.SpeechConfig(subscription=SPEECH_KEY, region=SPEECH_REGION)
        speech_config.speech_recognition_language = "sl-SI"  # Словенский

        # Push stream для аудио от браузера
        push_stream = speechsdk.audio.PushAudioInputStream()
        audio_config = speechsdk.audio.AudioConfig(stream=push_stream)
        recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

        # Очередь для результатов
        results_queue = asyncio.Queue()

        def recognized_callback(evt):
            """Callback для финальных результатов распознавания"""
            if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech and evt.result.text:
                text_sl = evt.result.text
                text_en = translate_text(text_sl, "en")
                print(f"[Azure] Recognized: {text_sl} -> {text_en}")
                asyncio.run_coroutine_threadsafe(
                    results_queue.put({"original": text_sl, "translated": text_en}),
                    loop
                )

        recognizer.recognized.connect(recognized_callback)
        recognizer.start_continuous_recognition()

        # Две асинхронные задачи:
        # 1. Получение аудио от клиента и запись в push_stream
        # 2. Отправка результатов распознавания клиенту

        async def receive_audio():
            """Получаем аудио от браузера"""
            try:
                while True:
                    data = await websocket.receive_bytes()
                    push_stream.write(data)
            except WebSocketDisconnect:
                print("[WebSocket] Client disconnected")
                push_stream.close()
                recognizer.stop_continuous_recognition()

        async def send_results():
            """Отправляем результаты распознавания"""
            while True:
                result = await results_queue.get()
                await websocket.send_json(result)

        # Запускаем обе задачи параллельно
        await asyncio.gather(
            receive_audio(),
            send_results()
        )

    except WebSocketDisconnect:
        print("[WebSocket] Connection closed")
    except Exception as e:
        print(f"[WebSocket] Error: {e}")
        await websocket.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
