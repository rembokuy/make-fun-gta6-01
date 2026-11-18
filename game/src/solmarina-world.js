// Dunia: satu objek state yang memiliki kota, pemain, mobil, kerumunan,
// polisi, misi, combat, partikel, dan Rush Hour — dan memajukan semuanya
// dalam langkah tetap. game-main.js memiliki layar dan loop render;
// file ini memiliki aturannya.

import { CITY, PLAYER, STEP } from './game-config.js';
import { createRandom } from './seeded-random.js';
import { buildCoastalCity, pushOutOfBuildings } from './coastal-city.js';
import { makePlayerMesh, stepPlayerOnFoot, setPlayerGunVisible, applyCelebratePose } from './player-character.js';
import { driveCar, syncCar } from './driveable-vehicles.js';
import { spawnStreetTraffic, stepTraffic } from './street-traffic.js';
import { buildCrowd, stepCrowd } from './sidewalk-crowd.js';
import { createWantedPolice, raiseWanted, stepPolice } from './wanted-police.js';
import { beginStoryAt, createStory, stepStory, storyTitle } from './missions-story.js';
import { createCombatState, stepCombat } from './street-combat.js';
import { burstConfetti, burstGold, burstSmoke, burstSparks, createParticleField, stepParticles } from './visual-effects.js';
import { createSynthAudio } from './synth-audio.js';
import { createRushHour, collideRoadblocks, rushPayoutMultiplier, rushSecondsUntilNext, stepRushHour } from './rush-hour.js';
import { saveProgress } from './save-game.js';
import { ACTION_HORN, ACTION_INTERACT, ACTION_PUNCH, ACTION_SHOOT } from './keyboard-input.js';

export function createSolmarina(scene, seed) {
  const rng = createRandom(seed);
  const city = buildCoastalCity(scene, rng);
  const audio = createSynthAudio();
  const traffic = spawnStreetTraffic(scene, rng);
  const crowd = buildCrowd(scene, rng);
  const wanted = createWantedPolice(scene, rng);
  const particles = createParticleField(scene, rng);
  const rush = createRushHour(scene);

  const playerMesh = makePlayerMesh();
  scene.add(playerMesh);
  const player = {
    mesh: playerMesh,
    pos: { x: 12, z: 12 },
    heading: Math.PI,
    walkPhase: 0,
    health: PLAYER.health,
    money: 0,
    totalEarned: 0,
    car: null,
    dead: false,
    busted: false,
    celebrateTimer: 0,
  };
  playerMesh.position.set(player.pos.x, 0, player.pos.z);

  const world = {
    scene,
    rng,
    city,
    audio,
    traffic,
    crowd,
    peds: crowd, // alias: misi & combat membaca daftar yang sama
    wanted,
    police: wanted, // alias untuk staging / play-test
    particles,
    effects: particles, // alias
    rush,
    player,
    story: createStory(),
    missions: null, // diisi di bawah (alias story)
    combat: createCombatState(),
    cameraYaw: Math.PI,
    cameraPitch: 0.32,
    cameraDist: 11,
    time: 0,
    saveTimer: 0,
    storyDone: false,
    onEvent: null, // game-main.js memasang: (type, payload) => void
  };
  world.missions = world.story;
  return world;
}

function emit(world, type, payload) {
  if (world.onEvent) world.onEvent(type, payload);
}

function toast(world, text) {
  emit(world, 'toast', text);
}

export function nearestStealable(world, maxDist) {
  let best = null;
  let bestD = maxDist;
  const all = [...world.traffic.parked, ...world.traffic.cars];
  for (const car of all) {
    if (car.driver === 'player') continue;
    const d = Math.hypot(car.pos.x - world.player.pos.x, car.pos.z - world.player.pos.z);
    if (d < bestD) {
      best = car;
      bestD = d;
    }
  }
  return best;
}

function enterCar(world, car) {
  const player = world.player;
  const wasParked = car.driver === null;
  if (car.driver === 'traffic') {
    // Tarik sopir keluar: mobil itu keluar dari arus traffic.
    const idx = world.traffic.cars.indexOf(car);
    if (idx >= 0) world.traffic.cars.splice(idx, 1);
    toast(world, 'Kamu membajak mobil itu!');
  } else if (wasParked) {
    const idx = world.traffic.parked.indexOf(car);
    if (idx >= 0) world.traffic.parked.splice(idx, 1);
    toast(world, 'Mobil dicuri! Polisi waspada.');
  }
  car.driver = 'player';
  player.car = car;
  player.mesh.visible = false;
  raiseWanted(world.wanted, 1);
  world.audio.setEngine(0, true);
}

function exitCar(world) {
  const player = world.player;
  const car = player.car;
  if (!car) return;
  car.driver = null;
  world.traffic.parked.push(car);
  player.car = null;
  player.mesh.visible = true;
  const side = { x: Math.cos(car.heading), z: -Math.sin(car.heading) };
  player.pos.x = car.pos.x + side.x * 2.6;
  player.pos.z = car.pos.z + side.z * 2.6;
  player.heading = car.heading;
  pushOutOfBuildings(world.city.colliders, player.pos, PLAYER.radius);
  world.audio.setEngine(0, false);
}

function hurtPlayer(world, amount) {
  const player = world.player;
  if (player.dead) return;
  player.health -= amount;
  if (player.health <= 0) {
    player.health = 0;
    player.dead = true;
    emit(world, 'wasted', null);
  }
}

// Satu langkah tetap dari seluruh simulasi.
export function stepSolmarina(world, dt, input) {
  const player = world.player;
  // Ambil hanya bit milik dunia; lapisan menu mengambil PAUSE/CONFIRM.
  const actions = input.takeActions(ACTION_INTERACT | ACTION_PUNCH | ACTION_SHOOT | ACTION_HORN);
  const mouse = input.takeMouseDelta();
  world.time += dt;

  // Orbit kamera dari drag mouse; kalau tidak, kamera membuntuti heading.
  if (mouse.dx !== 0 || mouse.dy !== 0) {
    world.cameraYaw -= mouse.dx * 0.005;
    world.cameraPitch = Math.max(0.08, Math.min(1.1, world.cameraPitch + mouse.dy * 0.003));
  }
  const wheel = input.wheelDelta ? input.wheelDelta() : 0;
  if (wheel !== 0) world.cameraDist = Math.max(6, Math.min(18, world.cameraDist + wheel * 0.01));

  // --- Rush Hour ---------------------------------------------------------
  stepRushHour(world.rush, dt, {
    scene: world.scene,
    rng: world.rng,
    traffic: world.traffic,
    city: world.city,
    playerPos: player.pos,
    time: world.time,
    toast: (t) => toast(world, t),
    horn: () => world.audio.rushHorn(),
  });

  // --- Pemain -------------------------------------------------------------
  if (!player.dead && !player.busted) {
    if (player.car) {
      const car = player.car;
      driveCar(car, input.throttle(), input.steer(), dt, world.city.colliders, (speed) => {
        world.audio.crash();
        burstSmoke(world.particles, car.pos);
        if (speed > 20) hurtPlayer(world, 4);
      });
      // Barikade Rush Hour: tabrakan terasa, bukan sekadar hiasan.
      if (world.rush.roadblocks.length > 0) {
        const ref = { value: car.speed };
        if (collideRoadblocks(world.rush, car.pos, 2.1, ref)) {
          car.speed = ref.value;
          syncCar(car);
        }
      }
      world.audio.setEngine(Math.abs(car.speed) / 38, true);
      // Menabrak pejalan kaki dengan mobil adalah kejahatan.
      for (const ped of world.crowd) {
        if (ped.state === 'down') continue;
        const d = Math.hypot(ped.pos.x - car.pos.x, ped.pos.z - car.pos.z);
        if (d < 2.2 && Math.abs(car.speed) > 3) {
          ped.state = 'down';
          ped.health = 0;
          raiseWanted(world.wanted, 1);
          world.audio.crash();
          burstSmoke(world.particles, ped.pos);
          toast(world, 'Kamu menabrak pejalan kaki! Wanted naik.');
        }
      }
      if (actions & ACTION_INTERACT) exitCar(world);
      if (actions & ACTION_HORN) world.audio.horn();
      player.pos.x = car.pos.x;
      player.pos.z = car.pos.z;
      player.heading = car.heading;
    } else {
      // Jalan kaki: WASD relatif kamera.
      const sin = Math.sin(world.cameraYaw);
      const cos = Math.cos(world.cameraYaw);
      const fwd = input.throttle();
      const strafe = input.steer();
      const move = {
        x: sin * fwd + cos * strafe,
        z: cos * fwd - sin * strafe,
      };
      stepPlayerOnFoot(player, move, input.sprint(), dt, world.city.colliders);
      applyCelebratePose(player, dt);
      world.audio.setEngine(0, false);
      if (actions & ACTION_INTERACT) {
        const car = nearestStealable(world, 3.6);
        if (car) enterCar(world, car);
      }
    }
  }

  // --- Traffic, kerumunan, polisi -----------------------------------------
  stepTraffic(world.traffic, dt, world.rng, world.rush.roadblocks);
  const threats = [];
  if (player.car && Math.abs(player.car.speed) > 4) threats.push({ x: player.car.pos.x, z: player.car.pos.z, danger: 1 });
  for (const car of world.traffic.cars) threats.push({ x: car.pos.x, z: car.pos.z, danger: car.speed > 4 ? 1 : 0 });
  stepCrowd(world.crowd, dt, world.city.colliders, threats, world.rng);

  stepPolice(world.wanted, dt, player, world.city.colliders, world.time, () => {
    if (!player.busted && !player.dead) {
      player.busted = true;
      world.audio.busted();
      emit(world, 'busted', null);
    }
  });
  const sirenOn = world.wanted.wanted > 0 && world.wanted.cops.length > 0;
  world.audio.setSiren(sirenOn);

  // --- Combat ---------------------------------------------------------------
  const combatCtx = {
    pos: player.pos,
    heading: player.heading,
    inCar: !!player.car,
    peds: world.crowd,
    punch: !!(actions & ACTION_PUNCH),
    shoot: !!(actions & ACTION_SHOOT) || input.mouseDown(),
    punchSound: () => world.audio.punch(),
    gunSound: () => world.audio.gunshot(),
    spark: (pos) => burstSparks(world.particles, pos),
    crime: (amount) => raiseWanted(world.wanted, amount),
    hurtPlayer: (amount) => hurtPlayer(world, amount),
  };
  stepCombat(world.combat, dt, combatCtx);
  setPlayerGunVisible(player, combatCtx.shoot && !player.car);

  // --- Misi -----------------------------------------------------------------
  // addCash menerapkan pengali Rush Hour dan mencatat total penghasilan.
  const missionCtx = {
    pos: player.pos,
    inCar: !!player.car,
    interact: !!(actions & ACTION_INTERACT),
    peds: world.crowd,
    addWanted: (n) => raiseWanted(world.wanted, n),
    addCash: (n) => {
      const paid = Math.round(n * rushPayoutMultiplier(world.rush));
      player.money += paid;
      player.totalEarned += paid;
      return paid;
    },
    toast: (t) => toast(world, t),
    pickupSound: () => {
      world.audio.pickup();
      burstGold(world.particles, player.pos);
    },
    missionSound: () => {
      world.audio.missionDone();
      burstConfetti(world.particles, player.pos);
      player.celebrateTimer = 1.6;
    },
  };
  const missionResult = stepStory(world.story, missionCtx);
  if (missionResult === 'complete') {
    saveProgress(world);
  } else if (missionResult === 'story') {
    world.storyDone = true;
    saveProgress(world);
    emit(world, 'story', null);
  }

  // --- Partikel, beacon, autosave -------------------------------------------
  stepParticles(world.particles, dt);
  const beacon = world.city.beacon;
  if (world.story.index < 3) {
    beacon.visible = true;
    beacon.position.set(world.story.waypoint.x, 0, world.story.waypoint.z);
    beacon.rotation.y += dt * 0.8;
  } else {
    beacon.visible = false;
  }
  world.saveTimer += dt;
  if (world.saveTimer > 30) {
    world.saveTimer = 0;
    saveProgress(world);
  }
}

export function hudSnapshot(world) {
  const player = world.player;
  return {
    money: player.money,
    totalEarned: player.totalEarned,
    health: player.health,
    wanted: world.wanted.wanted,
    missionTitle: storyTitle(world.story),
    objective: world.story.objective,
    inCar: !!player.car,
    speed: player.car ? player.car.speed : 0,
    playerX: player.pos.x,
    playerZ: player.pos.z,
    playerHeading: player.heading,
    waypoint: world.story.index < 3 ? world.story.waypoint : null,
    trafficCars: world.traffic.cars,
    cops: world.wanted.cops,
    roadblocks: world.rush.roadblocks,
    rushActive: world.rush.active,
    rushRemaining: world.rush.remaining,
    rushNextIn: rushSecondsUntilNext(world.rush),
    time: world.time,
  };
}

// Apa yang akan dilakukan tombol E sekarang, untuk baris prompt di HUD.
export function stealPrompt(world) {
  const player = world.player;
  if (player.dead || player.busted) return '';
  if (player.car) return 'E — Keluar dari mobil';
  const car = nearestStealable(world, 3.6);
  if (car) return car.driver === null ? 'E — Curi mobil' : 'E — Bajak mobil ini';
  const debtor = world.crowd.find(
    (p) => p.role === 'debtor' && !p.collected && Math.hypot(p.pos.x - player.pos.x, p.pos.z - player.pos.z) < 3.2,
  );
  if (debtor) return 'E — Tagih utang';
  return '';
}

export { STEP };
export { beginStoryAt };
