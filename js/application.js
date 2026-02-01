document.addEventListener("DOMContentLoaded", async () => {
  let wrapper = document.getElementById("wrapper");
  let play = document.getElementById("playBtn");
  let pause = document.getElementById("pauseBtn");
  let cover = document.getElementById("cover");
  let slider = document.getElementById("volume");

  let timer = 0;
  let animId;
  let glowAnimId = null;
  const dataArray = new Uint8Array(128);

  let result = await chrome.storage.local.get("standartfm");
  const state = result.standartfm || { status: false, volume: 0.7 };

  slider.value = state.volume*100;
  
  if (state.status) {
    play.style.display = "none";
    pause.style.display = "block";
    startAnimation();
  } else {
    play.style.display = "block";
    pause.style.display = "none";
    stopAnimation();
  }

  wrapper.style.display = "block";
  let volume = slider.value / 100;

  function startSimulatedVisualization() {
    if (glowAnimId) return;

    function animateSim() {
      glowAnimId = requestAnimationFrame(animateSim);

      for (let i = 0; i < dataArray.length; i++) {
        dataArray[i] = Math.random() * 255;
      }

      let total = 0;
      for (let i = 0; i < dataArray.length; i++) total += dataArray[i];
      const avgVal = total / dataArray.length;

      updateCoverGlow(avgVal);
    }

    animateSim();
  }

  function stopSimulatedVisualization() {
    if (glowAnimId) cancelAnimationFrame(glowAnimId);
    glowAnimId = null;

    cover.style.boxShadow = '0px 0px 30px black';
    cover.style.transition = 'box-shadow 0.2s ease';
  }

  function updateCoverGlow(avgVal) {
    const R = 255, G = 255, B = 255;
    const opacity = 0.1 + (avgVal / 255) * 0.8;
    const blurRadius = 15 + (avgVal / 255) * 35;
    const spreadRadius = 5 + (avgVal / 255) * 10;

    cover.style.boxShadow = `0px 0px 30px black, 0 0 ${blurRadius}px ${spreadRadius}px rgba(${R},${G},${B},${opacity})`;
    cover.style.transition = `box-shadow ${0.05 + (avgVal / 255) * 0.10}s ease`;
  }

  function startAnimation() {
    cover.style.transform = `rotate(${timer}deg)`;
    timer += 0.2;
    animId = requestAnimationFrame(startAnimation);

    startSimulatedVisualization();
  }

  function stopAnimation() {
    cancelAnimationFrame(animId);
    stopSimulatedVisualization();
  }

  play.addEventListener("click", () => {
    play.style.display = "none";
    pause.style.display = "block";

    startAnimation();

    chrome.runtime.sendMessage({
      action: "PLAY",
      volume: volume
    });

  });

  pause.addEventListener("click", () => {
    pause.style.display = "none";
    play.style.display = "block";

    chrome.runtime.sendMessage({
      action: "PAUSE",
      volume: volume
    });

    stopAnimation();
  });

  slider.addEventListener("input", function() {
    let vol = slider.value / 100;
    
    chrome.runtime.sendMessage({
      action: "VOLUME",
      status: state.status,
      volume: vol
    });
  });

});