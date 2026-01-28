// Compatibilidad del navegador para SpeechRecognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    alert("Lo siento, tu navegador no soporta la API de reconocimiento de voz. Por favor usa Google Chrome o Microsoft Edge.");
}

const recognition = SpeechRecognition ? new SpeechRecognition() : null;

// Elementos del DOM
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const statusIndicator = document.getElementById('status-indicator');
const statusText = statusIndicator.querySelector('.status-text');
const transcriptContainer = document.getElementById('transcript-container');
const placeholderText = document.getElementById('placeholder-text');
const finalDiv = document.getElementById('final-text');
const resultsSection = document.getElementById('results-section');
const liveTimer = document.getElementById('live-timer');

// Elementos de resultados
const resWords = document.getElementById('res-words');
const resTime = document.getElementById('res-time');
const resWPM = document.getElementById('res-wpm');

// ESTADO V13: Lógica de Segmentación Anti-Eco
let isListening = false;
let startTime = null;
let timerInterval = null;
let masterTranscript = []; // Lista de palabras únicas validadas
let lastFinalText = ""; // Referencia para detectar duplicados de Android

if (recognition) {
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';

    recognition.onstart = () => {
        isListening = true;
        if (!startTime) startTime = Date.now();
        btnStart.disabled = true;
        btnStart.classList.add('recording');
        btnStop.disabled = false;
        statusIndicator.classList.add('active');
        statusText.innerText = "Escuchando...";
        placeholderText.classList.add('hidden');
    };

    recognition.onresult = (event) => {
        let currentInterim = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript.trim();

            if (event.results[i].isFinal) {
                // LÓGICA V13: Detección de solapamiento
                // Si la frase que llega (transcript) es igual a la última que procesamos, la ignoramos.
                if (transcript !== lastFinalText) {
                    processFinalTranscript(transcript);
                    lastFinalText = transcript;
                }
            } else {
                currentInterim = transcript;
            }
        }

        // Actualizar UI: Mostramos lo validado + el texto intermedio actual
        finalDiv.innerText = masterTranscript.join(" ") + " ";
        document.getElementById('interim-text').innerText = currentInterim;

        transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
    };

    recognition.onerror = (event) => {
        console.warn("Speech recognition notice:", event.error);
    };

    recognition.onend = () => {
        // Reinicio silencioso para mantener la sesión viva en Android
        if (isListening) {
            setTimeout(() => {
                if (isListening) {
                    try { recognition.start(); } catch (e) { }
                }
            }, 150);
        }
    };
}

// Función crítica para limpiar duplicados reales
function processFinalTranscript(newText) {
    const newWords = newText.split(/\s+/).filter(w => w.length > 0);

    if (masterTranscript.length === 0) {
        masterTranscript = newWords;
        return;
    }

    // Buscamos si las primeras palabras de la nueva frase ya están al final de nuestra historia
    // Esto arregla el "Eco" de Samsung
    let overlapCount = 0;
    const maxCheck = Math.min(newWords.length, masterTranscript.length, 5);

    for (let i = 1; i <= maxCheck; i++) {
        const historyTail = masterTranscript.slice(-i).join(" ").toLowerCase();
        const newHead = newWords.slice(0, i).join(" ").toLowerCase();
        if (historyTail === newHead) {
            overlapCount = i;
        }
    }

    // Solo añadimos las palabras que NO se solapan
    const trulyNewWords = newWords.slice(overlapCount);
    masterTranscript = masterTranscript.concat(trulyNewWords);
}

function startListening() {
    if (!recognition) return;
    masterTranscript = [];
    lastFinalText = "";
    finalDiv.innerText = "";
    document.getElementById('interim-text').innerText = "";
    startTime = Date.now();
    resultsSection.classList.add('hidden');

    clearInterval(timerInterval);
    liveTimer.innerText = "00:00";
    timerInterval = setInterval(updateTimer, 1000);

    try {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => recognition.start())
            .catch(() => alert("Por favor permite el acceso al micrófono."));
    } catch (e) { }
}

function stopListening() {
    if (!isListening) return;
    isListening = false;
    clearInterval(timerInterval);

    try { recognition.stop(); } catch (e) { }

    const totalText = masterTranscript.join(" ");
    const durationSec = (Date.now() - startTime) / 1000;
    const wordCount = masterTranscript.length;
    const durationMin = durationSec / 60;
    const wpm = durationMin > 0 ? Math.ceil(wordCount / durationMin) : 0;

    btnStart.disabled = false;
    btnStart.classList.remove('recording');
    btnStop.disabled = true;
    statusIndicator.classList.remove('active');
    statusText.innerText = "Finalizado";

    displayResults(wordCount, durationSec, wpm);
}

function updateTimer() {
    if (!startTime) return;
    const diff = Math.floor((Date.now() - startTime) / 1000);
    const mm = Math.floor(diff / 60).toString().padStart(2, '0');
    const ss = (diff % 60).toString().padStart(2, '0');
    liveTimer.innerText = `${mm}:${ss}`;
}

function displayResults(words, seconds, wpm) {
    resWords.innerText = words;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    resTime.innerText = `${mins > 0 ? mins + 'm ' : ''}${secs}s`;
    resWPM.innerText = wpm;
    resultsSection.classList.remove('hidden');

    const cards = resultsSection.querySelectorAll('.result-item');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

btnStart.addEventListener('click', startListening);
btnStop.addEventListener('click', stopListening);
