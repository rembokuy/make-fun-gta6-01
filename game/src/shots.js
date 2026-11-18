// The four screenshot scenes behind ?shot=chase|walk|drive|mission.
// Each one plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a scripted driver, so the frame is what a
// short game really looks like — and the same seed always gives the same
// frame. main.js paints the staged scene twice and sets
// window.__shotReady for the screenshot.

import { STEP } from './config.js';
import { createCar, makeCarMesh, syncCarMesh } from './vehicles.js';
import { addWanted } from './police.js';
import { updateWorld } from './world.js';

const SAMPLE = STEP;

function fakeInput(script) {
  return {
    takeActions: () => 0,
    takeMouseDelta: () => ({ dx: 0, dy: 0 }),
    throttle: () => script.throttle,
    steer: () => script.steer,
    sprint: () => !!script.sprint,
    mouseDown: () => false,
    wheelDelta: () => 0,
  };
}

function putPlayerInCar(world, x, z, heading) {
  const mesh = makeCarMesh(0xd94f3d);
  world.scene.add(mesh);
  const car = createCar(mesh, x, z, heading, 'player');
  car.speed = 12;
  world.player.car = car;
  world.player.mesh.visible = false;
  world.player.pos.x = x;
  world.player.pos.z = z;
  world.player.heading = heading;
  syncCarMesh(car);
  return car;
}

function driveFor(world, seconds, script) {
  const input = fakeInput(script);
  const steps = Math.round(seconds / SAMPLE);
  for (let i = 0; i < steps; i++) updateWorld(world, SAMPLE, input);
}

/**
 * Stage the named scene on a fresh world and return a label for the HUD.
 * 'chase' is the cover: a police chase with wanted stars, minimap and a
 * mission objective all on screen at once.
 */
export function stageShot(name, world) {
  const player = world.player;
  if (name === 'chase') {
    putPlayerInCar(world, 0, -40, 0);
    // A three-quarter rear angle: the player's car and the police cars
    // chasing it are all in frame at once.
    world.cameraYaw = 0.45;
    world.cameraPitch = 0.22;
    world.cameraDist = 11;
    addWanted(world.police, 3);
    player.money = 370;
    driveFor(world, 6, { throttle: 1, steer: 0 });
    return 'chase';
  }
  if (name === 'drive') {
    putPlayerInCar(world, -75, -100, 0);
    world.cameraYaw = 0;
    world.cameraPitch = 0.22;
    world.cameraDist = 9;
    player.money = 120;
    driveFor(world, 5, { throttle: 1, steer: 0 });
    return 'drive';
  }
  if (name === 'mission') {
    // Mission 1, package already picked up, racing to the drop-off.
    world.missions.stage = 2;
    world.missions.objective = 'Antar paket ke Menara Kaca.';
    world.missions.waypoint = { x: -75, z: 75 };
    putPlayerInCar(world, -75, 20, 0);
    world.cameraYaw = 0;
    world.cameraPitch = 0.24;
    world.cameraDist = 10;
    player.money = 250;
    addWanted(world.police, 1);
    driveFor(world, 3.5, { throttle: 1, steer: 0 });
    return 'mission';
  }
  // 'walk' (and any other name): on foot at a busy avenue.
  player.pos.x = 8.6;
  player.pos.z = -60;
  player.heading = 0;
  world.cameraYaw = 0;
  world.cameraPitch = 0.34;
  world.cameraDist = 9;
  player.money = 45;
  driveFor(world, 6, { throttle: 1, steer: 0, sprint: false });
  return 'walk';
}
