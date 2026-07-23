const audioInput = document.getElementById('audio-file');
const audioPlayer = document.getElementById('audio-player');
const trackInfo = document.getElementById('track-info');
const playlistUI = document.getElementById('playlist');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const eqSliders = document.querySelectorAll('.eq-band');

// Web Audio API State
let audioCtx;
let sourceNode;
let analyser;
let filters = [];

// Playlist State
let playlist = [];
let currentTrackIndex = 0;

canvas.width = 600;
canvas.height = 120;

// Handle Upload File Banyak
audioInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  if (files.length > 0) {
    playlist = files;
    currentTrackIndex = 0;
    renderPlaylist();
    loadTrack(currentTrackIndex);
  }
});

// Render List Lagu di UI
function renderPlaylist() {
  playlistUI.innerHTML = '';
  playlist.forEach((file, index) => {
    const li = document.createElement('li');
    li.textContent = `${index + 1}. ${file.name}`;
    if (index === currentTrackIndex) {
      li.classList.add('active');
    }
    li.addEventListener('click', () => {
      currentTrackIndex = index;
      loadTrack(currentTrackIndex);
    });
    playlistUI.appendChild(li);
  });
}

// Load dan Putar Lagu Berdasarkan Indeks
function loadTrack(index) {
  if (playlist.length === 0) return;

  const file = playlist[index];
  const url = URL.createObjectURL(file);
  audioPlayer.src = url;
  trackInfo.textContent = `▶️ ${file.name}`;

  // Update Highlight Playlist
  renderPlaylist();

  // Inisialisasi Audio Engine pada pemutaran pertama
  if (!audioCtx) {
    initAudioEngine();
  }

  audioPlayer.play();
}

// Automatis Putar Lagu Berikutnya Saat Lagu Selesai
audioPlayer.addEventListener('ended', () => {
  nextTrack();
});

// Kontrol Prev & Next
prevBtn.addEventListener('click', () => {
  if (playlist.length === 0) return;
  currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
  loadTrack(currentTrackIndex);
});

nextBtn.addEventListener('click', () => {
  nextTrack();
});

function nextTrack() {
  if (playlist.length === 0) return;
  currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
  loadTrack(currentTrackIndex);
}

// Web Audio API Engine
function initAudioEngine() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  sourceNode = audioCtx.createMediaElementSource(audioPlayer);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;

  const frequencies = [60, 250, 1000, 4000, 16000];

  filters = frequencies.map((freq) => {
    const filter = audioCtx.createBiquadFilter();
    filter.type = freq <= 60 ? 'lowshelf' : freq >= 16000 ? 'highshelf' : 'peaking';
    filter.frequency.value = freq;
    filter.gain.value = 0;
    return filter;
  });

  let prevNode = sourceNode;
  filters.forEach((filter) => {
    prevNode.connect(filter);
    prevNode = filter;
  });

  prevNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  drawVisualizer();
}

// Hubungkan Slider EQ
eqSliders.forEach((slider, index) => {
  slider.addEventListener('input', (e) => {
    if (filters[index]) {
      filters[index].gain.value = parseFloat(e.target.value);
    }
  });
});

// Autoplay Fix
audioPlayer.addEventListener('play', () => {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
});

// Visualizer Animation
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

    const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#8b5cf6');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

    x += barWidth;
  }
}
