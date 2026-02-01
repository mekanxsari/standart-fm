async function ensureOffscreen() {
  const hasDoc = await chrome.offscreen.hasDocument();
  if (!hasDoc) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Audio playback"
    });
  }
}

chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.set({
        standartfm: {
            status: false,
            volume: 0.7
        }
    });
});

chrome.runtime.onSuspend.addListener(() => {
    chrome.storage.local.set({
        standartfm: {
            status: false,
            volume: 0.7
        }
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "PLAY":
      play(message.volume);
      break;

    case "PAUSE":
      pause(message.volume);
      break;

    case "VOLUME":
      volume(message.status, message.volume);
      break;
  }
});

async function play(volume) {
  await ensureOffscreen();

  chrome.runtime.sendMessage({
    command: "PLAY_AUDIO",
    volume: volume 
  })
  .then((response) => {
    updateState(true, volume);
  })
  .catch((error) => {
    console.log('error in background.js:', error);
  });
}

async function pause(volume) {
  console.log("PAUSE command received from application.js");

  await ensureOffscreen();

  chrome.runtime.sendMessage({
    command: "PAUSE_AUDIO"
  })
  .then((response) => {
    updateState(false, volume);
  })
  .catch((error) => {
    console.log('error in background.js:', error);
  });
}

function updateState(status, volume) {
  chrome.storage.local.set({
    standartfm: {
      status: status,
      volume: volume
    }
  });
}

async function volume(status, volume) {
  await ensureOffscreen();
  
  chrome.runtime.sendMessage({
    command: "UPDATE_VOLUME",
    volume: volume
  })
  .then((response) => {
    updateState(status, volume);
  })
  .catch((error) => {
    console.log('error in background.js:', error);
  });
}