let cover = null;
let analyser, audioCtx, source, dataArray;
let timer = 0;
let visualizationInterval = null;
let currentState = null;

async function loadState() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "GET_STATE" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error loading state:", chrome.runtime.lastError);
        resolve(null);
        return;
      }
      
      if (response.success) {
        currentState = response.state;
        resolve(currentState);
      } else {
        resolve(null);
      }
    });
  });
}

async function saveState(updates) {
  if (!currentState) {
    await loadState();
  }
  
  const newState = { ...currentState, ...updates };
  currentState = newState;
  
  return new Promise((resolve) => {
    resolve();
  });
}

function updateUI() {
  if (!currentState) return;
  
  const playBtn = document.getElementById("playBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const volumeSlider = document.querySelector('input[type="range"]');
  const volumeDisplay = document.getElementById("volumeDisplay");
  
  if (currentState.isPlaying) {
    if (playBtn) playBtn.style.display = "none";
    if (pauseBtn) pauseBtn.style.display = "block";
    initVisualization();
  } else {
    if (playBtn) playBtn.style.display = "block";
    if (pauseBtn) pauseBtn.style.display = "none";
    stopVisualization();
  }
  
  if (volumeSlider) {
    volumeSlider.value = Math.round(currentState.volume * 100);
  }
  
  if (volumeDisplay) {
    volumeDisplay.textContent = `${Math.round(currentState.volume * 100)}%`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  cover = document.getElementById("cover");
  
  cover.style.width = `200px`;
  cover.style.height = `200px`;
  cover.style.boxShadow = '0px 0px 30px black';
  cover.style.transition = 'box-shadow 0.2s ease';
  cover.style.borderRadius = '50%';
  cover.style.backgroundColor = '#0f3460';
  
  setInterval(() => {
    cover.style.transform = `rotate(${timer}deg)`;
    timer += 0.5;
  }, 50);
  
  await loadState();
  updateUI();
  
  setupEventListeners();
});

function setupEventListeners() {
  const playBtn = document.getElementById("playBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const volumeSlider = document.querySelector('input[type="range"]');
  
  playBtn.addEventListener("click", async function() {
    chrome.runtime.sendMessage({ action: "PLAY" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success) {
      } else {
        console.error("Failed to play:", response?.error || "Unknown error");
      }
    });
  });
  
  pauseBtn.addEventListener("click", function() {
    chrome.runtime.sendMessage({ action: "STOP" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success) {
      }
    });
  });
  
  if (volumeSlider) {
    volumeSlider.addEventListener("input", function() {
      const volume = this.value / 100;
      
      const volumeDisplay = document.getElementById("volumeDisplay");
      if (volumeDisplay) {
        volumeDisplay.textContent = `${this.value}%`;
      }
      
      if (currentState) {
        currentState.volume = volume;
      }
      
      chrome.runtime.sendMessage({ 
        action: "SET_VOLUME", 
        volume: volume 
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error setting volume:", chrome.runtime.lastError);
        }
      });
    });
  }
}

function initVisualization() {
  if (visualizationInterval) {
    clearInterval(visualizationInterval);
  }
  
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const vizAudio = new Audio();
    vizAudio.crossOrigin = "anonymous";
    vizAudio.src = currentState?.station?.url || "https://moondigitaledge.radyotvonline.net/standartfm/playlist.m3u8";
    vizAudio.volume = 0;
    
    source = audioCtx.createMediaElementSource(vizAudio);
    analyser = audioCtx.createAnalyser();
    
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    vizAudio.play().catch(e => {
      console.log("Visualization audio failed:", e.message);
      startSimulatedVisualization();
    });
    
    animateCoverGlow();
    
  } catch (error) {
    console.error("AudioContext failed:", error);
    startSimulatedVisualization();
  }
}

function startSimulatedVisualization() {
  if (visualizationInterval) {
    clearInterval(visualizationInterval);
  }
  
  visualizationInterval = setInterval(() => {
    const simulatedValue = Math.random() * 150 + 50;
    updateCoverGlow(simulatedValue);
  }, 100);
}

function animateCoverGlow() {
  if (!analyser || !cover) {
    startSimulatedVisualization();
    return;
  }
  
  requestAnimationFrame(animateCoverGlow);
  analyser.getByteFrequencyData(dataArray);
  
  let total = 0;
  for (let i = 0; i < dataArray.length; i++) {
    total += dataArray[i];
  }
  const avgVal = total / dataArray.length;
  
  updateCoverGlow(avgVal);
}

function updateCoverGlow(avgVal) {
  const R = 255, G = 255, B = 255;
  const opacity = 0.1 + (avgVal / 255) * 0.8;
  const blurRadius = 15 + (avgVal / 255) * 35;
  const spreadRadius = 5 + (avgVal / 255) * 25;
  
  cover.style.boxShadow = `0px 0px 30px black, 0 0 ${blurRadius}px ${spreadRadius}px rgba(${R},${G},${B},${opacity})`;
  cover.style.transition = `box-shadow ${0.05 + (avgVal / 255) * 0.15}s ease`;
}

function stopVisualization() {
  if (visualizationInterval) {
    clearInterval(visualizationInterval);
    visualizationInterval = null;
  }
  
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
    analyser = null;
    source = null;
  }
  
  if (cover) {
    cover.style.boxShadow = '0px 0px 30px black';
    cover.style.transition = 'box-shadow 0.2s ease';
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "STATE_CHANGED") {
    currentState = message.state;
    updateUI();
  }
  
  if (sendResponse) {
    sendResponse({ received: true });
  }
});