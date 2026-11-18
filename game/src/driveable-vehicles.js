// Mobil: badan dari kotak dengan kabin, roda yang berputar dan berbelok,
// dan fisika arcade (akselerasi, rem, mundur, setir yang terasa melayang).
// Builder yang sama membuat mobil pemain, traffic, dan mobil polisi —
// hanya cat, lampu, dan pelatnya yang berbeda.

import * as THREE from 'three';
import { CAR, PALETTE } from './game-config.js';
import { pushOutOfBuildings } from './coastal-city.js';

const BODY_COLORS = [0xd94f3d, 0x3d7bd9, 0xf7c948, 0x7fb5a3, 0xe8e4da, 0x8a5fb0, 0x2f3540, 0xd96c5f];

export function buildCarMesh(color, opts = {}) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fd8e8 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), paint);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glass);
  cabin.position.set(0, 1.1, -0.25);
  cabin.castShadow = true;
  group.add(cabin);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.35, 0.7), paint);
  nose.position.set(0, 0.5, 2.3);
  group.add(nose);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 0.25), dark);
  bumper.position.set(0, 0.32, 2.55);
  group.add(bumper);

  for (const s of [-1, 1]) {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.18, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xfff6c9 }),
    );
    light.position.set(s * 0.65, 0.62, 2.56);
    group.add(light);
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.16, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
    );
    tail.position.set(s * 0.65, 0.62, -2.24);
    group.add(tail);
  }

  if (opts.police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.4), dark);
    bar.position.set(0, 1.45, -0.25);
    group.add(bar);
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.18, 0.42),
      new THREE.MeshBasicMaterial({ color: PALETTE.copLightRed }),
    );
    red.position.set(-0.32, 1.46, -0.25);
    group.add(red);
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.18, 0.42),
      new THREE.MeshBasicMaterial({ color: PALETTE.copLightBlue }),
    );
    blue.position.set(0.32, 1.46, -0.25);
    group.add(blue);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.02, 0.2, 4.42),
      new THREE.MeshBasicMaterial({ color: 0xf5f0e6 }),
    );
    stripe.position.y = 0.55;
    group.add(stripe);
    group.userData.copRed = red;
    group.userData.copBlue = blue;
  }

  if (opts.taxi) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.22, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xffe08a }),
    );
    sign.position.set(0, 1.48, -0.25);
    group.add(sign);
  }

  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14181d });
  for (const [wx, wz, front] of [[-0.95, 1.45, true], [0.95, 1.45, true], [-0.95, -1.45, false], [0.95, -1.45, false]]) {
    const pivot = new THREE.Group();
    pivot.position.set(wx, 0.38, wz);
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    pivot.add(wheel);
    group.add(pivot);
    wheels.push({ pivot, front });
  }

  group.userData.wheels = wheels;
  return group;
}

export function randomPaint(rng) {
  return rng.pick(BODY_COLORS);
}

// Satu mobil yang bisa dikendarai: posisi, arah, kecepatan, dan mesh-nya.
// `driver` adalah 'player' | 'traffic' | 'police' | null (parkir, bisa dicuri).
export function newCar(mesh, x, z, heading, driver) {
  return {
    mesh,
    pos: { x, z },
    heading,
    speed: 0,
    steerAngle: 0,
    driver,
    color: mesh.userData.color ?? 0xffffff,
    alive: true,
    cruise: 10,
    horizontal: true,
  };
}

export function syncCar(car) {
  car.mesh.position.set(car.pos.x, 0, car.pos.z);
  car.mesh.rotation.y = car.heading;
  for (const w of car.mesh.userData.wheels) {
    w.pivot.rotation.y = w.front ? car.steerAngle : 0;
    w.pivot.children[0].rotation.x += (car.speed * 0.016) / 0.38;
  }
}

// Lampu polisi berkedip merah-biru mengikuti waktu dunia (deterministik:
// memakai world time, bukan jam dinding, supaya screenshot bisa diulang).
export function flashCopLights(car, timeSeconds) {
  const red = car.mesh.userData.copRed;
  const blue = car.mesh.userData.copBlue;
  if (!red || !blue) return;
  const phase = Math.floor(timeSeconds / 0.28) % 2 === 0;
  red.material.color.setHex(phase ? 0xff2a2a : 0x5a1010);
  blue.material.color.setHex(phase ? 0x10265a : 0x2a6bff);
}

// Fisika arcade: gas mempercepat, S mengerem lalu mundur, setir berskala
// dengan kecepatan supaya mobil tetap terkendali saat diam.
export function driveCar(car, throttle, steer, dt, colliders, onCrash) {
  if (throttle > 0) car.speed += CAR.accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 0.5) car.speed -= CAR.brake * dt;
    else car.speed += CAR.reverseAccel * throttle * dt;
  }
  car.speed -= car.speed * CAR.drag * dt;
  if (car.speed > CAR.maxSpeed) car.speed = CAR.maxSpeed;
  if (car.speed < -CAR.maxReverse) car.speed = -CAR.maxReverse;
  if (Math.abs(car.speed) < 0.05 && throttle === 0) car.speed = 0;

  const steerTarget = steer * CAR.steer * Math.min(1, Math.abs(car.speed) / 8 + 0.25);
  car.steerAngle += (steerTarget - car.steerAngle) * Math.min(1, dt * 8);
  car.heading += car.steerAngle * (car.speed / CAR.maxSpeed) * dt * 2.2 * Math.sign(car.speed || 1);

  const before = { x: car.pos.x, z: car.pos.z };
  car.pos.x += Math.sin(car.heading) * car.speed * dt;
  car.pos.z += Math.cos(car.heading) * car.speed * dt;
  // Mobil tidak pernah keluar kota: tahan di tepi dan buang kecepatan.
  const lim = 192;
  if (car.pos.x > lim || car.pos.x < -lim || car.pos.z > lim || car.pos.z < -lim) {
    car.pos.x = Math.max(-lim, Math.min(lim, car.pos.x));
    car.pos.z = Math.max(-lim, Math.min(lim, car.pos.z));
    car.speed *= 0.5;
  }
  if (colliders) {
    const hit = pushOutOfBuildings(colliders, car.pos, CAR.radius);
    if (hit && Math.abs(car.speed) > 6) {
      if (onCrash) onCrash(Math.abs(car.speed));
      car.speed *= 0.35;
    }
  }
  const moved = Math.hypot(car.pos.x - before.x, car.pos.z - before.z);
  if (moved < Math.abs(car.speed) * dt * 0.4 && Math.abs(car.speed) > 8) {
    // Mentok tembok: buang kecepatan, jangan menggiling menembusnya.
    car.speed *= 0.9;
  }
  syncCar(car);
}

export function carDistance(a, b) {
  return Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
}
