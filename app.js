const audioInput = document.getElementById('audio-file');
const audioPlayer = document.getElementById('audio-player');
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const eqSliders = document.querySelectorAll('.eq-band');

let audioCtx;
let sourceNode;
let analyser;
let filters = [];

// Resolusi Canvas
canvas.width = 600;
canvas.height = 150;

// Handle Input File
audioInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    audioPlayer.src = url;
    
    // Inisialisasi Web Audio Context jika belum
    if (!audioCtx) {
      initAudioEngine();
    }
  }
});

function initAudioEngine() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  sourceNode = audioCtx.createMediaElementSource(audioPlayer);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;

  // Frekuensi Equalizer (60Hz - 16kHz)
  const frequencies = [60, 250, 1000, 4000, 16000];

  // Buat BiquadFilterNode untuk tiap slider
  filters = frequencies.map((freq) => {
    const filter = audioCtx.createBiquadFilter();
    filter.type = freq <= 60 ? 'lowshelf' : freq >= 16000 ? 'highshelf' : 'peaking';
    filter.frequency.value = freq;
    filter.gain.value = 0;
    return filter;
  });

  // Sambungkan rantai Audio: Source -> Filter1 -> Filter2 ... -> Analyser -> Output
  let prevNode = sourceNode;
  filters.forEach((filter) => {
    prevNode.connect(filter);
    prevNode = filter;
  });
  
  prevNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  // Jalankan Visualizer
  drawVisualizer();
}

// Hubungkan Slider UI ke Gain Filter
eqSliders.forEach((slider, index) => {
  slider.addEventListener('input', (e) => {
    if (filters[index]) {
      filters[index].gain.value = parseFloat(e.target.value);
    }
  });
});

// Fix autoplay policy di browser
audioPlayer.addEventListener('play', () => {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
});

// Render animasi spektrum audio di Canvas
function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const barWidth = (canvas.width / bufferLength) * 2;
  let barHeight;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    barHeight = (dataArray[i] / 255) * canvas.height;

    // Gradien Warna Bar
    const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#8b5cf6');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

    x += barWidth;
  }
}
