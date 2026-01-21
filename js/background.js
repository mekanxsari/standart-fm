const RADIO_STATION = {
  name: "Standart FM",
  url: "https://moondigitaledge.radyotvonline.net/standartfm/playlist.m3u8",
};

const DEFAULT_STATE = {
  isPlaying: false,
  volume: 0.7,
  station: RADIO_STATION
};

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Radio Player Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    await saveState(DEFAULT_STATE);
  }
  
  const state = await getState();
  if (!state) {
    await saveState(DEFAULT_STATE);
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  const state = await getState();
  await togglePlayback(!state.isPlaying);
  console.log('Extension icon clicked. Toggling playback.');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.action) {
    case 'GET_STATE':
      getState().then(state => {
        sendResponse({ success: true, state: state });
      });
      return true;
      
    case 'TOGGLE_PLAYBACK':
      getState().then(state => {
        togglePlayback(!state.isPlaying)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
      });
      return true;
      
    case 'PLAY':
      togglePlayback(true)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'STOP':
      togglePlayback(false)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'SET_VOLUME':
      setVolume(message.volume)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    default:
      console.warn('Unknown message action:', message.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

async function getState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['radioState'], (result) => {
      resolve(result.radioState || { ...DEFAULT_STATE });
    });
  });
}

async function saveState(state) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ radioState: state }, () => {
      chrome.runtime.sendMessage({
        action: 'STATE_CHANGED',
        state: state
      }).catch(() => {
      });
      resolve();
    });
  });
}

async function setupOffscreenDocument() {
  const hasDocument = await chrome.offscreen.hasDocument();
  
  if (!hasDocument) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Audio playback requires DOM APIs'
    });
    console.log('Offscreen document created');
  }
}

async function togglePlayback(play) {
  try {
    const state = await getState();
    
    if (play && !state.isPlaying) {
      await startPlayback(state);
    } else if (!play && state.isPlaying) {
      await stopPlayback(state);
    }
    
    return true;
  } catch (error) {
    console.error('Error toggling playback:', error);
    throw error;
  }
}

async function startPlayback(currentState) {
  try {
    await setupOffscreenDocument();
    
    chrome.runtime.sendMessage({
      action: 'PLAY_AUDIO',
      url: currentState.station.url,
      volume: currentState.volume
    });
    
    const newState = { ...currentState, isPlaying: true };
    await saveState(newState);
    
    console.log('Playback started:', currentState.station.name);
    
  } catch (error) {
    console.error('Error starting playback:', error);
    const errorState = { ...currentState, isPlaying: false };
    await saveState(errorState);
    throw error;
  }
}

async function stopPlayback(currentState) {
  try {
    const hasDocument = await chrome.offscreen.hasDocument();
    
    if (hasDocument) {
      chrome.runtime.sendMessage({
        action: 'STOP_AUDIO'
      });
    }
    
    const newState = { ...currentState, isPlaying: false };
    await saveState(newState);
    
    console.log('Playback stopped');
    
  } catch (error) {
    console.error('Error stopping playback:', error);
    throw error;
  }
}

async function setVolume(volume) {
  const normalizedVolume = Math.max(0, Math.min(1, volume));
  
  const state = await getState();
  const newState = { ...state, volume: normalizedVolume };
  await saveState(newState);
  
  const hasDocument = await chrome.offscreen.hasDocument();
  if (hasDocument) {
    chrome.runtime.sendMessage({
      action: 'SET_VOLUME',
      volume: normalizedVolume
    });
  }
  
  console.log('Volume set to:', normalizedVolume);
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'AUDIO_PLAYING') {
    const state = await getState();
    if (!state.isPlaying) {
      await saveState({ ...state, isPlaying: true });
    }
    console.log('Audio is playing (from offscreen)');
  } else if (message.action === 'AUDIO_STOPPED') {
    const state = await getState();
    if (state.isPlaying) {
      await saveState({ ...state, isPlaying: false });
    }
    console.log('Audio stopped (from offscreen)');
  } else if (message.action === 'AUDIO_ERROR') {
    const state = await getState();
    if (state.isPlaying) {
      await saveState({ ...state, isPlaying: false });
    }
    console.error('Audio error from offscreen:', message.error);
  }
});

chrome.runtime.onSuspend.addListener(async () => {
  console.log('Extension suspending, cleaning up...');
  
  try {
    const hasDocument = await chrome.offscreen.hasDocument();
    if (hasDocument) {
      await chrome.runtime.sendMessage({ action: 'STOP_AUDIO' });
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
});

console.log('Radio Player Extension background script loaded');