let audioElement = null;

document.addEventListener('DOMContentLoaded', () => {
  audioElement = document.getElementById('audioPlayer');
  if (!audioElement) {
    console.error('Audio element not found in offscreen document');
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Offscreen received message:', message);
  
  switch (message.action) {
    case 'PLAY_AUDIO':
      playAudio(message.url, message.volume)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'STOP_AUDIO':
      stopAudio()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'SET_VOLUME':
      setVolume(message.volume)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    default:
      console.warn('Unknown message in offscreen:', message.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

async function playAudio(url, volume = 0.7) {
  return new Promise((resolve, reject) => {
    try {
      if (!audioElement) {
        reject(new Error('Audio element not initialized'));
        return;
      }
      
      stopAudio();
      
      console.log('Playing audio:', url);
      audioElement.src = url;
      audioElement.volume = volume;
      
      audioElement.onplaying = () => {
        chrome.runtime.sendMessage({ action: 'AUDIO_PLAYING' });
      };
      
      audioElement.onpause = () => {
        chrome.runtime.sendMessage({ action: 'AUDIO_STOPPED' });
      };
      
      audioElement.onerror = (e) => {
        console.error('Audio error in offscreen:', audioElement.error);
        chrome.runtime.sendMessage({ 
          action: 'AUDIO_ERROR', 
          error: audioElement.error?.message || 'Unknown audio error'
        });
      };
      
      audioElement.onended = () => {
        chrome.runtime.sendMessage({ action: 'AUDIO_STOPPED' });
      };
      
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            resolve();
          })
          .catch(error => {
            console.error('Playback failed:', error);
            chrome.runtime.sendMessage({ 
              action: 'AUDIO_ERROR', 
              error: error.message 
            });
            reject(error);
          });
      } else {
        resolve();
      }
      
    } catch (error) {
      console.error('Playback failed in offscreen:', error);
      chrome.runtime.sendMessage({ 
        action: 'AUDIO_ERROR', 
        error: error.message 
      });
      reject(error);
    }
  });
}

async function stopAudio() {
  return new Promise((resolve) => {
    if (audioElement) {
      console.log('Stopping audio in offscreen');
      audioElement.pause();
      audioElement.src = '';
      audioElement.currentTime = 0;
      
      audioElement.onplaying = null;
      audioElement.onpause = null;
      audioElement.onerror = null;
      audioElement.onended = null;
    }
    resolve();
  });
}

async function setVolume(volume) {
  return new Promise((resolve) => {
    if (audioElement) {
      console.log('Setting volume in offscreen:', volume);
      audioElement.volume = Math.max(0, Math.min(1, volume));
    }
    resolve();
  });
}

window.addEventListener('beforeunload', () => {
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
  }
});