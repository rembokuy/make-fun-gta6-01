// SOLMARINA — drivable vehicles. Parked cars wait by the kerb to be stolen,
// Rae's car answers arcade physics, and every bump into a pedestrian or a
// wall is a crime the wanted system hears about.

import * as THREE from 'three';
import { CONFIG } from './game-config.js';
import { makeCarMesh } from './street-traffic.js';

const PARKED_PAINT = [0xc23b2e, 0x2e6fc2, 0xd8a83a, 0x4da06a, 0xe8e8e8, 0x8a5fc0];

export function createVehicles(scene, world, rng, hooks) {
  const cars = [];

  for (let i = 0; i < 10; i++) {
    // The first car always waits by the spawn corner, so stealing one is
    // never a hunt across the map.
    const spot = i === 0 ? { x: 3, z: 27, heading: Math.PI } : world.pointOnRoad();
    const mesh = makeCarMesh(PARKED_PAINT[i % PARKED_PAINT.length]);
    mesh.position.set(spot.x, 0, spot.z);
    mesh.rotation.y = spot.heading;
    scene.add(mesh);
    cars.push({
      id: `car-${i}`,
      mesh,
      x: spot.x,
      z: spot.z,
      heading: spot.heading,
      speed: 0,
      parked: true,
      stolen: false,
      driver: null,
    });
  }

  const vehicles = {
    cars,

    nearest(x, z, radius) {
      let best = null;
      let bestD = radius;
      for (const car of cars) {
        const d = Math.hypot(car.x - x, car.z - z);
        if (d < bestD) {
          bestD = d;
          best = car;
        }
      }
      return best;
    },

    steal(car) {
      car.parked = false;
      car.stolen = true;
      if (hooks.onSteal) hooks.onSteal(car);
      return car;
    },

    update(dt, input, player, crowd) {
      for (const car of cars) {
        if (car.driver !== player) continue;
        const axes = input.axes();
        const cfg = CONFIG.car;
        if (axes.fwd > 0) car.speed += cfg.accel * dt;
        else if (axes.fwd < 0) car.speed -= (car.speed > 0.5 ? cfg.brake : cfg.accel * 0.6) * dt;
        else car.speed -= car.speed * 1.4 * dt;
        car.speed = Math.max(-cfg.maxReverse, Math.min(cfg.maxSpeed, car.speed));
        const steer = axes.strafe * cfg.turnRate * Math.min(1, Math.abs(car.speed) / 9);
        car.heading += steer * dt * Math.sign(car.speed || 1) * (car.speed < 0 ? -1 : 1);
        const nx = car.x + Math.sin(car.heading) * car.speed * dt;
        const nz = car.z + Math.cos(car.heading) * car.speed * dt;
        const hit = world.hitsBuilding(nx, nz, 1.6);
        if (hit) {
          car.speed *= -0.25;
          if (hooks.onCrash) hooks.onCrash(car);
        } else if (!world.inOcean(nx, nz)) {
          car.x = nx;
          car.z = nz;
        } else {
          car.speed *= 0.4;
        }
        const clamped = world.clampToCity(car.x, car.z);
        car.x = clamped.x;
        car.z = clamped.z;
        // Running someone over: the pedestrian goes down, heat goes up.
        if (Math.abs(car.speed) > 4 && crowd) {
          const ped = crowd.nearest(car.x, car.z, 2.6);
          if (ped) {
            crowd.knockDown(ped);
            if (hooks.onHitPed) hooks.onHitPed(ped);
          }
        }
        car.mesh.position.set(car.x, 0, car.z);
        car.mesh.rotation.y = car.heading;
        player.x = car.x;
        player.z = car.z;
        player.heading = car.heading;
      }
    },
  };

  return vehicles;
}
