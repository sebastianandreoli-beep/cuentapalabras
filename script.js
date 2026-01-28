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
const interimDiv = document.getElementById('interim-text');
const finalDiv = document.getElementById('final-text');
const resultsSection = document.getElementById('results-section');
const mainCard = document.querySelector('.main-card');

// Elementos de resultados
const resWords = document.getElementById('res-words');
const resTime = document.getElementById('res-time');
const resWPM = document.getElementById('res-wpm');

// Estado de la aplicación
let isListening = false;
let startTime = null;
let fullTranscript = "";
let timerInterval = null;

if (recognition) {
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES'; // Configurado para español

    recognition.onstart = () => {
        isListening = true;
        startTime = Date.now();
        btnStart.disabled = true;
        btnStart.classList.add('recording');
        btnStop.disabled = false;
        statusIndicator.classList.add('active');
        statusText.innerText = "Escuchando...";
        placeholderText.classList.add('hidden');
        resultsSection.classList.add('hidden');

        // Limpiar transcripción previa
        finalDiv.innerText = "";
        interimDiv.innerText = "";
        fullTranscript = "";
    };

    recognition.onresult = (event) => {
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                fullTranscript += event.results[i][0].transcript + " ";
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        finalDiv.innerText = fullTranscript;
        interimDiv.innerText = interimTranscript;

        // Auto-scroll al final
        transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
    };

    recognition.onerror = (event) => {
        console.error("Error de reconocimiento:", event.error);
        stopListening();
    };

    recognition.onend = () => {
        if (isListening) {
            // Si terminó inesperadamente pero deberíamos estar escuchando, reiniciar
            recognition.start();
        }
    };
}

// Funciones de control
function startListening() {
    if (!recognition) return;
    try {
        recognition.start();
    } catch (e) {
        console.error("Error al iniciar:", e);
    }
}

function stopListening() {
    if (!isListening) return;

    // Capturar lo que hay en el DOM justo antes de detener
    const finalContent = finalDiv.innerText;
    const interimContent = interimDiv.innerText;
    const totalText = (finalContent + " " + interimContent).trim();

    isListening = false;
    recognition.stop();

    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const durationSec = durationMs / 1000;

    // Cálculos
    const wordCount = countWords(totalText);
    const durationMin = durationSec / 60;
    // Redondeo hacia arriba para el promedio si hay palabras
    const wpm = durationMin > 0 ? Math.ceil(wordCount / durationMin) : 0;

    // Actualizar UI
    btnStart.disabled = false;
    btnStart.classList.remove('recording');
    btnStop.disabled = true;
    statusIndicator.classList.remove('active');
    statusText.innerText = "Finalizado";

    displayResults(wordCount, durationSec, wpm);
}

function countWords(str) {
    if (!str) return 0;
    return str.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function displayResults(words, seconds, wpm) {
    resWords.innerText = words;

    // Formatear tiempo (00:00)
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    resTime.innerText = `${mins > 0 ? mins + 'm ' : ''}${secs}s`;

    resWPM.innerText = wpm;
    resultsSection.classList.remove('hidden');

    // Animación de entrada para los resultados
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

// Event Listeners
btnStart.addEventListener('click', startListening);
btnStop.addEventListener('click', stopListening);
