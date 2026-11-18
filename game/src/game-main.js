// SOLMARINA v2 — boot dan satu-satunya loop. Permainan berpindah di antara
// lima layar: judul, bermain, jeda, tertangkap / tumbang, dan cerita selesai.
// Dunia maju dalam langkah tetap 1/60 dtk; renderer membuntuti pemain dan
// HUD melukis state setiap frame.
//
// ?seed=N menetapkan kota. ?shot=chase|walk|drive|mission (dengan &seed=N)
// men-stage adegan itu, bukan menjalankan loop — melukisnya dua kali lalu
// menyetel window.__shotReady untuk screenshot.

import { STEP, PLAYER } from './game-config.js';
import { createSolmarina, stepSolmarina, hudSnapshot, stealPrompt } from './solmarina-world.js';
import { applyProgress, loadProgress } from './save-game.js';
import { createSceneRenderer } from './scene-renderer.js';
import { createKeyboardInput, ACTION_CONFIRM, ACTION_PAUSE } from './keyboard-input.js';
import { createGameHud, showOverlay } from './game-hud.js';
import { stageShot } from './screenshot-staging.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261118;

const canvas = document.getElementById('game');
const hudEl = document.getElementById('hud');
const errEl = document.getElementById('err');

// Saat headless, console tidak terlihat: tampilkan error di DOM.
window.addEventListener('error', (event) => {
  errEl.textContent += `ERROR: ${event.message}\n`;
});
window.addEventListener('unhandledrejection', (event) => {
  errEl.textContent += `REJECTION: ${event.reason}\n`;
});

const renderer = createSceneRenderer(canvas);
const world = createSolmarina(renderer.scene, seed);
const hud = createGameHud();
const input = createKeyboardInput(canvas);

// Diekspos untuk debugging dan play-test otomatis (tampilan state read-only).
window.__solmarina = world;

function unlockAudio() {
  world.audio.unlock();
  world.audio.startMusic();
  world.audio.startEngine();
  world.audio.startSiren();
}
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

// Toast dari dunia: di mode shot, toast bertahan 60 detik supaya tidak
// sempat hilang sebelum screenshot diambil.
world.onEvent = (type, payload) => {
  if (type === 'toast') hud.showToast(payload, shot ? 60000 : 3200);
  else if (type === 'wasted') showOverlay('overlay-wasted');
  else if (type === 'busted') showOverlay('overlay-busted');
  else if (type === 'story') showOverlay('overlay-story');
};

function runShot(name) {
  hudEl.classList.add('on');
  showOverlay(null); // menu judul tidak boleh menutupi adegan
  stageShot(name, world);
  // Jepret kamera ke posisi akhir, lalu lukis dua kali supaya bayangan
  // dan HUD sudah final.
  renderer.snap(world);
  let painted = 0;
  function paint() {
    renderer.follow(world, 1 / 60);
    renderer.draw();
    hud.update(hudSnapshot(world));
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = 'title';
  let accumulator = 0;
  let last = performance.now();
  const save = loadProgress();
  const btnContinue = document.getElementById('btn-continue');
  if (save && (save.money > 0 || save.mission > 0)) btnContinue.style.display = '';

  function startGame(fresh) {
    if (fresh) {
      try {
        window.localStorage.removeItem('solmarina.save.v2');
        window.localStorage.removeItem('solmarina.save.v1');
      } catch {
        // Storage mati: tidak ada yang dibersihkan.
      }
      world.player.money = 0;
      world.player.totalEarned = 0;
      world.player.health = PLAYER.health;
      world.player.pos = { x: 12, z: 12 };
    } else if (save) {
      applyProgress(world, save);
    }
    hudEl.classList.add('on');
    showOverlay(null);
    screen = 'play';
    unlockAudio();
  }

  function pauseGame() {
    if (screen !== 'play') return;
    screen = 'pause';
    showOverlay('overlay-pause');
  }

  function resumeGame() {
    showOverlay(null);
    screen = 'play';
    last = performance.now();
  }

  document.getElementById('btn-start').addEventListener('click', () => startGame(true));
  btnContinue.addEventListener('click', () => startGame(false));
  document.getElementById('btn-resume').addEventListener('click', resumeGame);
  document.getElementById('btn-restart').addEventListener('click', () => startGame(true));
  document.getElementById('btn-busted').addEventListener('click', () => {
    world.player.busted = false;
    world.player.money = Math.max(0, world.player.money - 200);
    world.player.pos = { x: 12, z: 12 };
    world.player.health = Math.max(50, world.player.health);
    world.wanted.wanted = 0;
    world.wanted.cops.length = 0;
    resumeGame();
  });
  document.getElementById('btn-wasted').addEventListener('click', () => {
    world.player.dead = false;
    world.player.health = PLAYER.health;
    world.player.pos = { x: 12, z: 12 };
    world.wanted.wanted = 0;
    resumeGame();
  });
  document.getElementById('btn-story').addEventListener('click', resumeGame);

  function handleActions() {
    // Ambil hanya bit milik menu; dunia mengambil E / F / klik sendiri.
    const actions = input.takeActions(ACTION_PAUSE | ACTION_CONFIRM);
    if (screen === 'title' && (actions & ACTION_CONFIRM)) startGame(true);
    else if (screen === 'play' && (actions & ACTION_PAUSE)) pauseGame();
    else if (screen === 'pause' && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) resumeGame();
  }

  // Input kosong untuk dunia saat layar judul: kota tetap hidup di
  // belakang menu, tapi pemain tidak bergerak.
  const idleInput = {
    takeActions: () => 0,
    takeMouseDelta: () => ({ dx: 0, dy: 0 }),
    throttle: () => 0,
    steer: () => 0,
    sprint: () => false,
    mouseDown: () => false,
    wheelDelta: () => 0,
  };

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === 'play') {
      let guard = 0;
      while (accumulator >= STEP && guard < 8) {
        stepSolmarina(world, STEP, input);
        accumulator -= STEP;
        guard += 1;
      }
      if (guard >= 8) accumulator = 0;
      if (world.player.dead || world.player.busted) screen = 'over';
    } else {
      accumulator = 0;
      if (screen === 'title') stepSolmarina(world, STEP, idleInput);
    }
    renderer.follow(world, Math.min((now - last) / 1000 || 0.016, 0.05));
    renderer.draw();
    if (screen === 'play' || screen === 'over') {
      hud.update(hudSnapshot(world));
      hud.setPrompt(screen === 'play' ? stealPrompt(world) : '');
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') pauseGame();
  });

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
