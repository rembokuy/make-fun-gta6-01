// SOLMARINA — Sun Coast Getaway. Entry point: builds the city, wires every
// system together, and runs the fixed-step simulation at 60 Hz. Play with
// WASD + mouse, E to interact, Space to punch, F to shoot. ?shot=chase|walk|
// drive|mission stages one frozen, deterministic screenshot scene instead.

import { CONFIG } from './game-config.js';
import { SeededRandom } from './seeded-random.js';
import { buildWorld } from './solmarina-world.js';
import { buildCoastalCity } from './coastal-city.js';
import { createTraffic } from './street-traffic.js';
import { createCrowd } from './sidewalk-crowd.js';
import { createVehicles } from './driveable-vehicles.js';
import { createPlayer } from './player-character.js';
import { createInput } from './keyboard-input.js';
import { createWanted } from './wanted-police.js';
import { createCombat } from './street-combat.js';
import { createMissions } from './missions-story.js';
import { createRushHour } from './rush-hour.js';
import { createHud } from './game-hud.js';
import { createRenderer } from './scene-renderer.js';
import { createEffects } from './visual-effects.js';
import { createAudio } from './synth-audio.js';
import { createSave } from './save-game.js';
import { stageShot } from './screenshot-staging.js';

window.__shotReady = false;

const params = new URLSearchParams(window.location.search);
const seed = Number.parseInt(params.get('seed') || String(CONFIG.seed), 10) || CONFIG.seed;
const shotName = params.get('shot');

const rng = new SeededRandom(seed);
const canvas = document.getElementById('game-canvas');
const renderer = createRenderer(canvas);
const world = buildWorld(rng);
const city = buildCoastalCity(renderer.scene, world, rng);
const traffic = createTraffic(renderer.scene, world, rng);
const crowd = createCrowd(renderer.scene, world, rng);
const input = createInput();
const wanted = createWanted(renderer.scene, world, rng);
const hud = createHud();
const effects = createEffects(renderer.scene, rng);
const audio = createAudio();
const save = createSave();
const rush = createRushHour(renderer.scene, world, rng);

const vehicles = createVehicles(renderer.scene, world, rng, {
  onSteal(car) {
    void car;
    wanted.addHeat(CONFIG.wanted.heatSteal, 'steal');
    hud.toast('Mobil dicuri! Polisi waspada.');
    audio.pickup();
  },
  onHitPed() {
    wanted.addHeat(CONFIG.wanted.heatHitPed, 'hit-ped');
    hud.toast('Kamu menabrak pejalan kaki!');
  },
  onCrash(car) {
    effects.burst('smoke', car.x, 1.2, car.z, 3);
  },
});

const player = createPlayer(renderer.scene, world);

const combat = createCombat(renderer.scene, world, rng, {
  onPunch() {
    wanted.addHeat(CONFIG.wanted.heatPunch, 'punch');
    audio.punch();
  },
  onPunchPed() {
    wanted.addHeat(CONFIG.wanted.heatHitPed, 'hit-ped');
    hud.toast('Kamu memukul pejalan kaki!');
  },
  onShoot({ muzzle, kind }) {
    effects.muzzle(muzzle.x, muzzle.y, muzzle.z);
    audio.shot();
    wanted.addHeat(CONFIG.wanted.heatShoot, 'shoot');
    crowd.scare(player.x, player.z, 30);
    if (kind === 'thug') effects.burst('spark', muzzle.x, muzzle.y, muzzle.z, 2);
  },
  onThugDown() {
    hud.toast('Preman dirobohkan!');
  },
  onThugHit(thug, damage) {
    void thug;
    player.hurt(damage);
    hud.toast('Rae dipukul!');
  },
});

const missions = createMissions(world, {
  rushBonus() {
    return rush.multiplier;
  },
  onPay(total, boosted) {
    audio.cash();
    hud.toast(boosted ? `Dibayar $${total} (Rush Hour +50%!)` : `Dibayar $${total}.`);
  },
  onPickup(label) {
    audio.pickup();
    hud.toast(`${label} diambil.`);
  },
  onCollect(spot) {
    audio.cash();
    hud.toast(`${spot.label} lunas — $${spot.pay}.`);
  },
  onMissionStart(mission) {
    hud.toast(`Misi baru: ${mission.name} — $${mission.pay}`);
  },
  onAllDone() {
    audio.cash();
    hud.toast('SEMUA MISI SELESAI — $1.250!');
  },
});

const G = {
  rng, world, city, traffic, crowd, vehicles, player, input, wanted, combat,
  missions, rush, hud, renderer, effects, audio, save,
  state: 'title',
  simTime: 0,
  shotName: null,
  buildHudState,
};

function buildHudState() {
  const current = missions.current;
  return {
    health: player.health,
    earned: missions.earned,
    wanted: wanted.level,
    missionName: current ? `${current.name} — $${current.pay}` : 'Selesai',
    objective: missions.objectiveText(),
    missionPay: current ? `Hadiah $${current.pay}` : '—',
    story: missions.story,
    rushActive: rush.active,
    rushCountdown: rush.countdown,
    roadblocks: rush.roadblocks,
    waypoint: missions.objective,
    police: wanted.cruisers.filter((c) => c.active),
    playerX: player.x,
    playerZ: player.z,
    heading: player.heading,
  };
}

function snapshot() {
  return {
    earned: missions.earned,
    missionIndex: missions.index,
    debtsDone: missions.debtsDone,
    playerX: player.x,
    playerZ: player.z,
    health: player.health,
  };
}

function applySave(data) {
  if (!data) return;
  missions.earned = data.earned || 0;
  missions.index = Math.min(data.missionIndex || 0, CONFIG.missions.list.length - 1);
  missions.debtsDone = Array.isArray(data.debtsDone) ? data.debtsDone : [false, false, false];
  missions.step = missions.index === 0 ? 0 : 0;
  missions.refreshObjective();
  player.teleport(data.playerX ?? 0, data.playerZ ?? 24);
  player.health = data.health ?? CONFIG.player.health;
}

function startGame() {
  if (G.state === 'playing') return;
  audio.ensure();
  audio.startMusic();
  const data = save.load();
  if (data && !startGame.restored) {
    startGame.restored = true;
    applySave(data);
    hud.toast('Save dimuat — lanjutkan, Rae.');
  }
  G.state = 'playing';
  hud.showStart(false);
  hud.showPause(false);
  hud.showGameOver(false);
}

function restartGame() {
  save.clear();
  missions.reset();
  wanted.clear();
  rush.reset();
  crowd.reset();
  traffic.reset(CONFIG.traffic.base);
  player.teleport(0, 24, 0);
  player.heal(CONFIG.player.health);
  G.simTime = 0;
  startGame.restored = false;
  G.state = 'playing';
  hud.showGameOver(false);
}

let ramCooldown = 0;
let saveTimer = 0;

function fixedUpdate(dt) {
  G.simTime += dt;
  const interact = input.wasPressed('KeyE');

  if (input.wasPressed('KeyP')) {
    G.state = 'paused';
    hud.showPause(true);
    return;
  }
  if (input.wasPressed('KeyM')) audio.setMuted(!audio.isMuted);

  // Enter / exit a car, or interact with the mission waypoint.
  if (interact) {
    if (player.inVehicle) {
      player.exitVehicle();
    } else {
      const car = vehicles.nearest(player.x, player.z, 4.5);
      if (car) {
        if (car.parked) vehicles.steal(car);
        player.enterVehicle(car);
        audio.pickup();
      }
    }
  }

  if (player.onFoot && input.wasPressed('Space')) combat.punch(player, crowd);
  if (player.onFoot && (input.wasPressed('KeyF') || input.mouseClicked())) {
    combat.shoot(player, crowd);
  }

  player.update(dt, input, vehicles);
  vehicles.update(dt, input, player, crowd);
  traffic.update(dt, rush.roadblocks);
  crowd.update(dt, player, wanted.level);
  wanted.update(dt, player, G.simTime);
  combat.update(dt, player, crowd);
  missions.update(dt, player, interact && !player.inVehicle);
  rush.update(dt, traffic);
  effects.update(dt, G.simTime);
  city.update(dt, G.simTime);

  // Police rams hurt, at most once a second.
  ramCooldown -= dt;
  const ram = wanted.ramDamage(player);
  if (ram > 0 && ramCooldown <= 0) {
    ramCooldown = 1;
    player.hurt(ram);
    effects.burst('spark', player.x, 1.2, player.z, 2);
  }

  // Waypoint beam tracks the active objective.
  const waypoint = missions.objective;
  if (waypoint && !missions.done) effects.setWaypoint(waypoint.x, waypoint.z);
  else effects.hideWaypoint();

  // Sound follows the chase.
  if (wanted.level > 0) audio.startSiren();
  else audio.stopSiren();
  audio.engine(player.inVehicle && player.vehicle ? Math.abs(player.vehicle.speed) / CONFIG.car.maxSpeed : 0);

  if (player.health <= 0) {
    G.state = 'over';
    audio.stopSiren();
    hud.showGameOver(true);
    save.clear();
    return;
  }

  saveTimer += dt;
  if (saveTimer > 10) {
    saveTimer = 0;
    save.save(snapshot());
  }

  hud.tickToast(dt);
  hud.update(buildHudState());
  renderer.follow(player, dt);
}

let last = performance.now();
let accumulator = 0;

function frame(now) {
  requestAnimationFrame(frame);
  if (G.state === 'shot') return;
  if (G.state !== 'playing') {
    // Title / pause / game-over: keep rendering the frozen city behind.
    renderer.render();
    last = now;
    return;
  }
  const dtReal = Math.min(0.1, (now - last) / 1000);
  last = now;
  accumulator += dtReal;
  let steps = 0;
  while (accumulator >= CONFIG.step && steps < 5) {
    fixedUpdate(CONFIG.step);
    accumulator -= CONFIG.step;
    steps += 1;
    if (G.state !== 'playing') break;
  }
  if (steps === 5) accumulator = 0;
  renderer.render();
  input.endFrame();
}

input.attach();

document.getElementById('start-button').addEventListener('click', () => {
  audio.ensure();
  startGame();
});
document.getElementById('resume-button').addEventListener('click', () => {
  G.state = 'playing';
  hud.showPause(false);
});
document.getElementById('restart-button').addEventListener('click', restartGame);
window.addEventListener('keydown', (event) => {
  if (event.code === 'Enter' && (G.state === 'title' || G.state === 'over')) {
    if (G.state === 'over') restartGame();
    else startGame();
  }
  if (event.code === 'KeyP' && G.state === 'paused') {
    G.state = 'playing';
    hud.showPause(false);
  }
});

// Debug + test handle: the play-test harness drives the game through this.
window.__solmarina = {
  G,
  state: () => G.state,
  start: startGame,
  restart: restartGame,
  teleport: (x, z, heading = 0) => player.teleport(x, z, heading),
  press: (code) => input.inject(code),
  release: (code) => input.release(code),
  missions: () => ({
    index: missions.index,
    step: missions.step,
    earned: missions.earned,
    done: missions.done,
    objective: missions.objectiveText(),
    waypoint: missions.waypoint(),
  }),
  wanted: () => ({ level: wanted.level, heat: Math.round(wanted.heat) }),
  trafficCount: () => traffic.count,
  rush: () => ({ active: rush.active, countdown: rush.countdown, roadblocks: rush.roadblocks.length, started: rush.startedCount }),
  rushStart: () => rush.forceStart(),
  rushStop: () => rush.forceStop(),
  player: () => ({
    x: Math.round(player.x * 10) / 10,
    z: Math.round(player.z * 10) / 10,
    health: player.health,
    inVehicle: player.inVehicle,
    onFoot: player.onFoot,
  }),
  enterNearestCar: () => {
    const car = vehicles.nearest(player.x, player.z, 6);
    if (!car) return false;
    if (car.parked) vehicles.steal(car);
    player.enterVehicle(car);
    return true;
  },
  carSpots: () => vehicles.cars.map((c) => ({ x: Math.round(c.x), z: Math.round(c.z), parked: c.parked })),
  setHealth: (n) => {
    player.health = n;
  },
};

if (shotName) {
  const valid = ['chase', 'walk', 'drive', 'mission'];
  const picked = valid.includes(shotName) ? shotName : 'chase';
  G.state = 'shot';
  stageShot(G, picked);
} else {
  hud.update(buildHudState());
  renderer.render();
}

requestAnimationFrame(frame);
