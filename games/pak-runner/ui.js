import { MicInput } from "./mic.js";
import { PakRunnerGame } from "./game.js";

console.log("[ui.js] file loaded");

const startOverlay = document.getElementById("startOverlay");
const calibrationOverlay = document.getElementById("calibrationOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");

const startBtn = document.getElementById("startBtn");
const calibrationBtn = document.getElementById("calibrationBtn");
const restartBtn = document.getElementById("restartBtn");

const calibrationText = document.getElementById("calibrationText");
const meterBar = document.getElementById("meterBar");
const micStatus = document.getElementById("micStatus");
const gameOverText = document.getElementById("gameOverText");

const hud = {
  score: document.getElementById("scoreValue"),
  coins: document.getElementById("coinValue"),
  best: document.getElementById("bestValue"),
  action: document.getElementById("actionValue"),
};

console.log("[ui.js] DOM refs", {
  startBtn,
  calibrationBtn,
  restartBtn,
  startOverlay,
  calibrationOverlay,
  gameOverOverlay,
  hud,
});

let mic = null;
let game = null;
let meterLoop = null;

function show(el) {
  console.log("[ui.js] show", el?.id);
  el.classList.add("show");
}

function hide(el) {
  console.log("[ui.js] hide", el?.id);
  el.classList.remove("show");
}

async function startFlow() {
  console.log("[ui.js] startFlow entered");
  try {
    micStatus.textContent = "Mic: Requesting permission...";
    mic = new MicInput();
    console.log("[ui.js] MicInput created", mic);

    await mic.init();
    console.log("[ui.js] mic.init success");

    micStatus.textContent = "Mic: Ready";
    hide(startOverlay);
    show(calibrationOverlay);
    startMeter();
  } catch (err) {
    console.error("[ui.js] mic init failed", err);
    micStatus.textContent = "Mic: Permission denied or unavailable";
    alert(err.message || "Mic permission is required for Pak Runner.");
  }
}

function startMeter() {
  console.log("[ui.js] startMeter");
  stopMeter();
  meterLoop = setInterval(() => {
    if (!mic?.isReady) return;
    const level = mic.getLevel();
    const pct = Math.min(100, Math.round(level * 500));
    meterBar.style.width = `${pct}%`;
  }, 50);
}

function stopMeter() {
  if (meterLoop) {
    console.log("[ui.js] stopMeter");
    clearInterval(meterLoop);
    meterLoop = null;
  }
}

async function runCalibration() {
  console.log("[ui.js] runCalibration started");
  calibrationBtn.disabled = true;

  const phases = [
    { label: "Stay silent for 2 seconds...", type: "silence", duration: 2000 },
    { label: "Say soft pak...", type: "soft", duration: 2000 },
    { label: "Say normal pak...", type: "medium", duration: 2000 },
    { label: "Say loud PAK...", type: "loud", duration: 2000 },
  ];

  const samples = {
    silence: [],
    soft: [],
    medium: [],
    loud: [],
  };

  for (const phase of phases) {
    console.log("[ui.js] calibration phase", phase);
    calibrationText.textContent = phase.label;
    const started = performance.now();

    while (performance.now() - started < phase.duration) {
      const level = mic.getLevel();
      samples[phase.type].push(level);
      await wait(60);
    }
  }

  const avg = arr => arr.reduce((a, b) => a + b, 0) / Math.max(arr.length, 1);

  const noiseFloor = avg(samples.silence);
  const soft = avg(samples.soft);
  const medium = avg(samples.medium);
  const loud = avg(samples.loud);

  const thresholds = {
    noiseFloor,
    lowThreshold: Math.max(noiseFloor + 0.01, soft * 0.85),
    mediumThreshold: Math.max(noiseFloor + 0.03, medium * 0.85),
    highThreshold: Math.max(noiseFloor + 0.06, loud * 0.8),
  };

  console.log("[ui.js] calibration result", thresholds);

  calibrationText.textContent = "Calibration complete. Entering pak battlefield...";
  await wait(800);

  stopMeter();
  hide(calibrationOverlay);
  bootGame(thresholds);
}

function bootGame(thresholds) {
  console.log("[ui.js] bootGame", thresholds);

  game = new PakRunnerGame({
    containerId: "gameContainer",
    hud,
    mic,
  });

  game.applyCalibration(thresholds);
  game.createGame();
  micStatus.textContent = "Mic: Live";
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

window.addEventListener("pak-runner-gameover", (e) => {
  console.log("[ui.js] pak-runner-gameover event", e.detail);
  const { score, coins, best } = e.detail;
  gameOverText.innerHTML = `
    Distance: <strong>${score}</strong><br>
    Coins: <strong>${coins}</strong><br>
    Best: <strong>${best}</strong><br><br>
    You were defeated by poor pak discipline.
  `;
  show(gameOverOverlay);
  micStatus.textContent = "Mic: Ready";
});

startBtn?.addEventListener("click", async () => {
  console.log("[ui.js] Start button clicked");
  await startFlow();
});

calibrationBtn?.addEventListener("click", async () => {
  console.log("[ui.js] Calibration button clicked");
  await runCalibration();
});

restartBtn?.addEventListener("click", () => {
  console.log("[ui.js] Restart button clicked");
  window.location.reload();
});