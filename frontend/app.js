// WebSocket URL - замените на URL вашего backend на Render
const WS_URL = window.location.hostname === 'localhost'
    ? 'ws://localhost:8000/ws'
    : 'wss://subtitles-backend-xtrg.onrender.com/ws'; // Render backend URL

let websocket = null;
let mediaRecorder = null;
let audioContext = null;
let audioStream = null;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');
const subtitlesDiv = document.getElementById('subtitles');

// Обработчик кнопки Start
startBtn.addEventListener('click', async () => {
    try {
        // Запрашиваем доступ к микрофону
        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        // Подключаемся к WebSocket
        websocket = new WebSocket(WS_URL);

        websocket.onopen = () => {
            console.log('[WebSocket] Connected');
            updateStatus('Recording...', true);
            startBtn.disabled = true;
            stopBtn.disabled = false;

            // Начинаем запись аудио
            startRecording();
        };

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('[WebSocket] Received:', data);
            addSubtitle(data.original, data.translated);
        };

        websocket.onerror = (error) => {
            console.error('[WebSocket] Error:', error);
            updateStatus('Connection error', false);
        };

        websocket.onclose = () => {
            console.log('[WebSocket] Disconnected');
            stopRecording();
        };

    } catch (error) {
        console.error('Error accessing microphone:', error);
        updateStatus('Microphone access denied', false);
        alert('Please allow microphone access to use this app.');
    }
});

// Обработчик кнопки Stop
stopBtn.addEventListener('click', () => {
    stopRecording();
    if (websocket) {
        websocket.close();
    }
});

function startRecording() {
    // Создаем AudioContext для обработки аудио
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000 // Azure Speech требует 16kHz
    });

    const source = audioContext.createMediaStreamSource(audioStream);

    // Используем ScriptProcessorNode для захвата аудио (старый API, но работает везде)
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);

            // Конвертируем Float32Array в Int16Array (требование Azure)
            const int16Data = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
            }

            // Отправляем аудио данные через WebSocket
            websocket.send(int16Data.buffer);
        }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }

    updateStatus('Stopped', false);
    startBtn.disabled = false;
    stopBtn.disabled = true;
}

function updateStatus(text, isRecording) {
    status.textContent = text;
    if (isRecording) {
        status.classList.add('recording');
    } else {
        status.classList.remove('recording');
    }
}

function addSubtitle(original, translated) {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'subtitle-line';

    const originalDiv = document.createElement('div');
    originalDiv.className = 'original';
    originalDiv.textContent = original;

    const translatedDiv = document.createElement('div');
    translatedDiv.className = 'translated';
    translatedDiv.textContent = translated;

    lineDiv.appendChild(originalDiv);
    lineDiv.appendChild(translatedDiv);

    subtitlesDiv.appendChild(lineDiv);

    // Автоскролл вниз
    subtitlesDiv.scrollTop = subtitlesDiv.scrollHeight;

    // Ограничиваем количество строк (макс 50)
    const lines = subtitlesDiv.getElementsByClassName('subtitle-line');
    if (lines.length > 50) {
        lines[0].remove();
    }
}
