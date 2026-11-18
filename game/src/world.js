// The world: one state object that owns the city, the player, the cars,
// the crowds, the police, the missions, the combat and the particles,
// and advances all of them in fixed steps. main.js owns the screens and
// the render loop; this file owns the rules.

import * as THREE from 'three';
import { CITY, PLAYER, SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createCity, collideBuildings } from './city.js';
import { makePlayerMesh, updatePlayerOnFoot, setPlayerGunVisible } from './player.js';
import { createCar, driveCar, makeCarMesh, randomCarColor, syncCarMesh, carDistance } from './vehicles.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPedestrians, updatePedestrians } from './pedestrians.js';
import { createPolice, addWanted, updatePolice } from './police.js';
import { createMissions, updateMissions, missionTitle, startMission } from './missions.js';
import { createCombat, updateCombat } from './combat.js';
import { createEffects, updateEffects, burstSparks, burstSmoke, burstGold } from './effects.js';
import { createAudio } from './audio.js';
import { ACTION_INTERACT, ACTION_PUNCH, ACTION_SHOOT, ACTION_HORN } from './input.js';

export function createWorld(scene, seed) {
  const rng = createRandom(seed);
  const city = createCity(scene, rng);
  const audio = createAudio();
  const traffic = createTraffic(scene, rng);
  const peds = createPedestrians(scene, rng);
  const police = createPolice(scene);
  const effects = createEffects(scene);

  const playerMesh = makePlayerMesh();
  scene.add(playerMesh);
  const player = {
    mesh: playerMesh,
    pos: { x: 12, z: 12 },
    heading: Math.PI,
    walkPhase: 0,
    health: PLAYER.health,
    money: 0,
    car: null,
    dead: false,
    busted: false,
  };
  playerMesh.position.set(player.pos.x, 0, player.pos.z);

  const world = {
    scene,
    rng,
    city,
    audio,
    traffic,
    peds,
    police,
    effects,
    player,
    missions: createMissions(),
    combat: createCombat(),
    cameraYaw: Math.PI,
    cameraPitch: 0.32,
    cameraDist: 11,
    time: 0,
    toastQueue: [],
    saveTimer: 0,
    storyDone: false,
    onEvent: null, // main.js sets this: (type, payload) => void
  };
  return world;
}

function emit(world, type, payload) {
  if (world.onEvent) world.onEvent(type, payload);
}

function toast(world, text) {
  emit(world, 'toast', text);
}

export function nearestStealableCar(world, maxDist) {
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
    // Yank the driver out: the car leaves the traffic flow.
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
  addWanted(world.police, 1);
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
  collideBuildings(world.city.colliders, player.pos, PLAYER.radius);
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

function saveGame(world) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: Math.floor(world.player.money),
      mission: world.missions.index,
      health: world.player.health,
      x: world.player.pos.x,
      z: world.player.pos.z,
    }));
  } catch {
    // Storage off: the run just does not persist.
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function applySave(world, save) {
  if (!save) return;
  world.player.money = save.money ?? 0;
  world.player.health = save.health ?? PLAYER.health;
  if (typeof save.x === 'number' && typeof save.z === 'number') {
    world.player.pos.x = save.x;
    world.player.pos.z = save.z;
  }
  if (typeof save.mission === 'number' && save.mission > 0 && save.mission < 3) {
    startMission(world.missions, save.mission);
  }
}

// One fixed step of the whole simulation.
export function updateWorld(world, dt, input) {
  const player = world.player;
  // Take only the world's own bits; the menu layer takes PAUSE/CONFIRM.
  const actions = input.takeActions(ACTION_INTERACT | ACTION_PUNCH | ACTION_SHOOT | ACTION_HORN);
  const mouse = input.takeMouseDelta();
  world.time += dt;

  // Camera orbit from mouse drag; otherwise it trails behind the heading.
  if (mouse.dx !== 0 || mouse.dy !== 0) {
    world.cameraYaw -= mouse.dx * 0.005;
    world.cameraPitch = Math.max(0.08, Math.min(1.1, world.cameraPitch + mouse.dy * 0.003));
  }
  const wheel = input.wheelDelta ? input.wheelDelta() : 0;
  if (wheel !== 0) world.cameraDist = Math.max(6, Math.min(18, world.cameraDist + wheel * 0.01));

  // --- Player ------------------------------------------------------------
  if (!player.dead && !player.busted) {
    if (player.car) {
      const car = player.car;
      driveCar(car, input.throttle(), input.steer(), dt, world.city.colliders, (speed) => {
        world.audio.crash();
        burstSmoke(world.effects, car.pos);
        if (speed > 20) hurtPlayer(world, 4);
      });
      world.audio.setEngine(Math.abs(car.speed) / 38, true);
      // Running over a pedestrian in the car is a crime.
      for (const ped of world.peds) {
        if (ped.state === 'down') continue;
        const d = Math.hypot(ped.pos.x - car.pos.x, ped.pos.z - car.pos.z);
        if (d < 2.2 && Math.abs(car.speed) > 3) {
          ped.state = 'down';
          ped.health = 0;
          addWanted(world.police, 1);
          world.audio.crash();
          burstSmoke(world.effects, ped.pos);
          toast(world, 'Kamu menabrak pejalan kaki! Wanted naik.');
        }
      }
      if (actions & ACTION_INTERACT) exitCar(world);
      if (actions & ACTION_HORN) world.audio.horn();
      player.pos.x = car.pos.x;
      player.pos.z = car.pos.z;
      player.heading = car.heading;
    } else {
      // On foot: camera-relative WASD.
      const sin = Math.sin(world.cameraYaw);
      const cos = Math.cos(world.cameraYaw);
      const fwd = input.throttle();
      const strafe = input.steer();
      const move = {
        x: sin * fwd + cos * strafe,
        z: cos * fwd - sin * strafe,
      };
      updatePlayerOnFoot(player, move, input.sprint(), dt, world.city.colliders);
      world.audio.setEngine(0, false);
      if (actions & ACTION_INTERACT) {
        const car = nearestStealableCar(world, 3.6);
        if (car) enterCar(world, car);
      }
    }
  }

  // --- Traffic, pedestrians, police --------------------------------------
  updateTraffic(world.traffic, dt, world.city.colliders);
  const threats = [];
  if (player.car && Math.abs(player.car.speed) > 4) threats.push({ x: player.car.pos.x, z: player.car.pos.z, danger: 1 });
  for (const car of world.traffic.cars) threats.push({ x: car.pos.x, z: car.pos.z, danger: car.speed > 4 ? 1 : 0 });
  updatePedestrians(world.peds, dt, world.city.colliders, threats);

  updatePolice(world.police, dt, player, world.city.colliders, () => {
    if (!player.busted && !player.dead) {
      player.busted = true;
      world.audio.busted();
      emit(world, 'busted', null);
    }
  });
  const sirenOn = world.police.wanted > 0 && world.police.cops.length > 0;
  world.audio.setSiren(sirenOn);

  // --- Combat -------------------------------------------------------------
  const combatCtx = {
    pos: player.pos,
    heading: player.heading,
    inCar: !!player.car,
    peds: world.peds,
    punch: !!(actions & ACTION_PUNCH),
    shoot: !!(actions & ACTION_SHOOT) || input.mouseDown(),
    punchSound: () => world.audio.punch(),
    gunSound: () => world.audio.gunshot(),
    spark: (pos) => burstSparks(world.effects, pos),
    crime: (amount) => addWanted(world.police, amount),
    hurtPlayer: (amount) => hurtPlayer(world, amount),
  };
  updateCombat(world.combat, dt, combatCtx);
  setPlayerGunVisible(player, combatCtx.shoot && !player.car);

  // --- Missions -----------------------------------------------------------
  const missionCtx = {
    pos: player.pos,
    inCar: !!player.car,
    interact: !!(actions & ACTION_INTERACT),
    peds: world.peds,
    addWanted: (n) => addWanted(world.police, n),
    addCash: (n) => {
      player.money += n;
    },
    toast: (t) => toast(world, t),
    pickupSound: () => {
      world.audio.pickup();
      burstGold(world.effects, player.pos);
    },
    missionSound: () => world.audio.missionDone(),
  };
  const missionResult = updateMissions(world.missions, missionCtx);
  if (missionResult === 'complete') {
    saveGame(world);
  } else if (missionResult === 'story') {
    world.storyDone = true;
    saveGame(world);
    emit(world, 'story', null);
  }

  // --- Effects, beacon, autosave ------------------------------------------
  updateEffects(world.effects, dt);
  const beacon = world.city.beacon;
  if (world.missions.index < 3) {
    beacon.visible = true;
    beacon.position.set(world.missions.waypoint.x, 0, world.missions.waypoint.z);
    beacon.rotation.y += dt * 0.8;
  } else {
    beacon.visible = false;
  }
  world.saveTimer += dt;
  if (world.saveTimer > 30) {
    world.saveTimer = 0;
    saveGame(world);
  }
}

export function getHudState(world) {
  const player = world.player;
  return {
    money: player.money,
    health: player.health,
    wanted: world.police.wanted,
    missionTitle: missionTitle(world.missions),
    objective: world.missions.objective,
    inCar: !!player.car,
    speed: player.car ? player.car.speed : 0,
    playerX: player.pos.x,
    playerZ: player.pos.z,
    playerHeading: player.heading,
    waypoint: world.missions.index < 3 ? world.missions.waypoint : null,
    trafficCars: world.traffic.cars,
    cops: world.police.cops,
  };
}

// What the E key would do right now, for the prompt line under the HUD.
export function interactPrompt(world) {
  const player = world.player;
  if (player.dead || player.busted) return '';
  if (player.car) return 'E — Keluar dari mobil';
  const car = nearestStealableCar(world, 3.6);
  if (car) return car.driver === null ? 'E — Curi mobil' : 'E — Bajak mobil ini';
  const debtor = world.peds.find((p) => p.role === 'debtor' && !p.collected && Math.hypot(p.pos.x - player.pos.x, p.pos.z - player.pos.z) < 3.2);
  if (debtor) return 'E — Tagih utang';
  return '';
}

export { STEP };
