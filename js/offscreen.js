let audioElement = null;

document.addEventListener("DOMContentLoaded", () => {
    audioElement = document.getElementById('audioPlayer');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {    
  switch (message.command) {
    case "PLAY_AUDIO":
      playAudio(message.volume);
      sendResponse({ success: true });
      break;

    case "PAUSE_AUDIO":
      pauseAudio();
      sendResponse({ success: true });
      break;

    case "UPDATE_VOLUME":
      updateVolume(message.volume);
      sendResponse({ sucess: true });
      break;
  }
});

function playAudio(volume) {
  audioElement = document.getElementById('audioPlayer');
  audioElement.src = "https://moondigitaledge.radyotvonline.net/standartfm/playlist.m3u8";
  audioElement.volume = volume;
  audioElement.play();
}

function pauseAudio() {
  audioElement.pause();
}

function updateVolume(volume) {
  audioElement.volume = volume;
}