// WebSocket URL
const WS_URL = window.location.hostname === 'localhost'
    ? 'ws://localhost:8000/ws'
    : 'wss://subtitles-backend-rtrg.onrender.com/ws';

let websocket = null;
let audioContext = null;
let audioStream = null;
let processor = null;

const playOverlay = document.getElementById('playOverlay');
const playBtn = document.getElementById('playBtn');
const subtitlesDiv = document.getElementById('subtitles');
const errorMsg = document.getElementById('errorMsg');

// Start recording when play button is clicked
playBtn.addEventListener('click', async () => {
    try {
        // Request microphone access
        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        // Connect to WebSocket
        websocket = new WebSocket(WS_URL);

        websocket.onopen = () => {
            console.log('[WebSocket] Connected');

            // Hide play button, show subtitles
            playOverlay.classList.add('hidden');
            subtitlesDiv.classList.add('visible');

            // Start recording
            startRecording();
        };

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('[WebSocket] Received:', data);
            addSubtitle(data.original, data.translated);
        };

        websocket.onerror = (error) => {
            console.error('[WebSocket] Error:', error);
            showError('Connection error. Please try again.');
        };

        websocket.onclose = () => {
            console.log('[WebSocket] Disconnected');
            stopRecording();
        };

    } catch (error) {
        console.error('Error accessing microphone:', error);
        showError('Microphone access denied. Please allow microphone access.');
    }
});

function startRecording() {
    // Create AudioContext
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
    });

    const source = audioContext.createMediaStreamSource(audioStream);
    // Увеличиваем размер буфера до 8192 для лучшего распознавания фраз
    processor = audioContext.createScriptProcessor(8192, 1, 1);

    processor.onaudioprocess = (e) => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);

            // Convert Float32Array to Int16Array
            const int16Data = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
            }

            // Send audio data via WebSocket
            websocket.send(int16Data.buffer);
        }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
}

function stopRecording() {
    if (processor) {
        processor.disconnect();
        processor = null;
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }
}

function addSubtitle(original, translated) {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'subtitle-line';

    const translatedDiv = document.createElement('div');
    translatedDiv.className = 'translated';
    translatedDiv.textContent = translated;

    lineDiv.appendChild(translatedDiv);

    subtitlesDiv.appendChild(lineDiv);

    // Auto-scroll to bottom
    subtitlesDiv.scrollTop = subtitlesDiv.scrollHeight;

    // Limit to 50 lines
    const lines = subtitlesDiv.getElementsByClassName('subtitle-line');
    if (lines.length > 50) {
        lines[0].remove();
    }
}

function showError(message) {
    errorMsg.textContent = message;
    errorMsg.classList.add('show');
    setTimeout(() => {
        errorMsg.classList.remove('show');
    }, 5000);
}

// Cleanup on window close
window.addEventListener('beforeunload', () => {
    if (websocket) {
        websocket.close();
    }
    stopRecording();
});
