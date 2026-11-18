// SOLMARINA — boot and the one loop. The game moves between five screens:
// title, play, paused, busted / wasted, and story done. The world advances
// in fixed 1/60 s steps; the renderer follows the player and the HUD paints
// the state every frame.
//
// ?seed=N fixes the city. ?shot=chase|walk|drive|mission (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { STEP, PLAYER } from './config.js';
import { createWorld, updateWorld, getHudState, interactPrompt, loadSave, applySave } from './world.js';
import { createRenderer } from './render.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE } from './input.js';
import { createHud, showOverlay } from './hud.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261118;

const canvas = document.getElementById('game');
const hudEl = document.getElementById('hud');
const errEl = document.getElementById('err');

// In headless runs the console is invisible: surface errors in the DOM.
window.addEventListener('error', (event) => {
  errEl.textContent += `ERROR: ${event.message}\n`;
});
window.addEventListener('unhandledrejection', (event) => {
  errEl.textContent += `REJECTION: ${event.reason}\n`;
});

const renderer = createRenderer(canvas);
const world = createWorld(renderer.scene, seed);
const hud = createHud();
const input = createInput(canvas);

// Exposed for debugging and automated play-tests (read-only state view).
window.__solmarina = world;

world.onEvent = (type) => {
  if (type === 'toast') return; // toasts are shown below, from the queue
  if (type === 'wasted') showOverlay('overlay-wasted');
  else if (type === 'busted') showOverlay('overlay-busted');
  else if (type === 'story') showOverlay('overlay-story');
};

// Toasts arrive through world events; keep the last one on screen.
const origEmit = world.onEvent;
world.onEvent = (type, payload) => {
  if (type === 'toast') hud.showToast(payload);
  origEmit(type, payload);
};

function unlockAudio() {
  world.audio.unlock();
  world.audio.startMusic();
  world.audio.startEngine();
  world.audio.startSiren();
}
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

function runShot(name) {
  hudEl.classList.add('on');
  showOverlay(null); // the title menu must not cover the staged scene
  stageShot(name, world);
  // Settle the camera, then paint twice so shadows and the HUD are final.
  for (let i = 0; i < 30; i++) renderer.follow(world, 1 / 60);
  let painted = 0;
  function paint() {
    renderer.follow(world, 1 / 60);
    renderer.draw();
    hud.update(getHudState(world));
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
  const save = loadSave();
  const btnContinue = document.getElementById('btn-continue');
  if (save && (save.money > 0 || save.mission > 0)) btnContinue.style.display = '';

  function startGame(fresh) {
    if (fresh) {
      try {
        window.localStorage.removeItem('solmarina.save.v1');
      } catch {
        // Storage off: nothing to clear.
      }
      world.player.money = 0;
      world.player.health = PLAYER.health;
      world.player.pos = { x: 12, z: 12 };
    } else if (save) {
      applySave(world, save);
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
    world.police.wanted = 0;
    world.police.cops.length = 0;
    resumeGame();
  });
  document.getElementById('btn-wasted').addEventListener('click', () => {
    world.player.dead = false;
    world.player.health = PLAYER.health;
    world.player.pos = { x: 12, z: 12 };
    world.police.wanted = 0;
    resumeGame();
  });
  document.getElementById('btn-story').addEventListener('click', resumeGame);

  function handleActions() {
    // Take only the menu's own bits; the world takes E / F / click itself.
    const actions = input.takeActions(ACTION_PAUSE | ACTION_CONFIRM);
    if (screen === 'title' && (actions & ACTION_CONFIRM)) startGame(true);
    else if (screen === 'play' && (actions & ACTION_PAUSE)) pauseGame();
    else if (screen === 'pause' && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) resumeGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === 'play') {
      let guard = 0;
      while (accumulator >= STEP && guard < 8) {
        updateWorld(world, STEP, input);
        accumulator -= STEP;
        guard += 1;
      }
      if (guard >= 8) accumulator = 0;
      if (world.player.dead || world.player.busted) screen = 'over';
    } else {
      accumulator = 0;
      // The title screen still shows the living city behind the menu.
      if (screen === 'title') {
        updateWorld(world, STEP, {
          takeActions: () => 0,
          takeMouseDelta: () => ({ dx: 0, dy: 0 }),
          throttle: () => 0,
          steer: () => 0,
          sprint: () => false,
          mouseDown: () => false,
        });
      }
    }
    renderer.follow(world, Math.min((now - last) / 1000 || 0.016, 0.05));
    renderer.draw();
    if (screen === 'play' || screen === 'over') {
      hud.update(getHudState(world));
      hud.setPrompt(screen === 'play' ? interactPrompt(world) : '');
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') pauseGame();
  });

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
