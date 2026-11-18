// SOLMARINA — AI traffic. Cars drive the road grid, turn at intersections,
// queue behind each other and stop dead in front of a police roadblock.
// Rush Hour triples the active fleet from 14 to 42.

import * as THREE from 'three';
import { CONFIG } from './game-config.js';

const PAINT = [0xc23b2e, 0x2e6fc2, 0xe8e8e8, 0x2b2f36, 0xd8a83a, 0x4da06a, 0x8a5fc0, 0xd8d3c8, 0x3a9e9e];

export function makeCarMesh(color, isTaxi = false) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), bodyMat);
  body.position.y = 0.65;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.65, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x1c2733 }),
  );
  cabin.position.set(0, 1.3, -0.2);
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  for (const [wx, wz] of [[-1.05, 1.45], [1.05, 1.45], [-1.05, -1.45], [1.05, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    group.add(wheel);
  }
  if (isTaxi) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.3, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x111111 }),
    );
    sign.position.set(0, 1.85, -0.2);
    group.add(sign);
  }
  return group;
}

export function createTraffic(scene, world, rng) {
  const cars = [];
  const pool = [];
  for (let i = 0; i < CONFIG.traffic.rush; i++) {
    const mesh = makeCarMesh(PAINT[i % PAINT.length], i % 9 === 4);
    mesh.visible = false;
    scene.add(mesh);
    pool.push(mesh);
  }

  function spawnCar(mesh) {
    const spot = world.pointOnRoad();
    // Keep the lane offset to the right of the road direction.
    const right = spot.axis === 'x' ? { x: 0, z: 3 } : { x: 3, z: 0 };
    const car = {
      mesh,
      x: spot.x + right.x,
      z: spot.z + right.z,
      heading: spot.heading,
      axis: spot.axis,
      speed: rng.range(CONFIG.traffic.minSpeed, CONFIG.traffic.maxSpeed),
      cruise: rng.range(CONFIG.traffic.minSpeed, CONFIG.traffic.maxSpeed),
      active: true,
      stopped: false,
    };
    mesh.visible = true;
    mesh.position.set(car.x, 0, car.z);
    mesh.rotation.y = car.heading;
    cars.push(car);
    return car;
  }

  function turnAtIntersection(car) {
    // At a crossing, keep going, turn left, or turn right.
    const roll = rng.next();
    if (roll < 0.55) return;
    car.heading += roll < 0.78 ? Math.PI / 2 : -Math.PI / 2;
    car.axis = car.axis === 'x' ? 'z' : 'x';
  }

  const traffic = {
    cars,
    target: CONFIG.traffic.base,

    setTarget(n) {
      traffic.target = n;
    },

    get count() {
      return cars.length;
    },

    reset(seedCount) {
      for (const car of cars) {
        car.mesh.visible = false;
        car.active = false;
      }
      cars.length = 0;
      const n = seedCount ?? traffic.target;
      for (let i = 0; i < n; i++) spawnCar(pool[i]);
    },

    update(dt, roadblocks = []) {
      // Grow or shrink the fleet toward the target.
      while (cars.length < traffic.target) {
        const mesh = pool[cars.length];
        if (!mesh) break;
        spawnCar(mesh);
      }
      while (cars.length > traffic.target) {
        const car = cars.pop();
        car.mesh.visible = false;
        car.active = false;
      }

      for (const car of cars) {
        // Stop for a roadblock or the car ahead on the same road.
        let blocked = false;
        for (const rb of roadblocks) {
          const dx = rb.x - car.x;
          const dz = rb.z - car.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 13) {
            const ahead = Math.sin(car.heading) * dx + Math.cos(car.heading) * dz;
            if (ahead > 0 && Math.abs(Math.cos(car.heading) * dx - Math.sin(car.heading) * dz) < 5) {
              blocked = true;
            }
          }
        }
        if (!blocked) {
          for (const other of cars) {
            if (other === car) continue;
            const dx = other.x - car.x;
            const dz = other.z - car.z;
            const dist = Math.hypot(dx, dz);
            if (dist < CONFIG.traffic.carGap) {
              const ahead = Math.sin(car.heading) * dx + Math.cos(car.heading) * dz;
              if (ahead > 0) {
                blocked = true;
                break;
              }
            }
          }
        }
        car.stopped = blocked;
        const speed = blocked ? 0 : car.cruise;
        car.speed += (speed - car.speed) * Math.min(1, dt * 2);
        car.x += Math.sin(car.heading) * car.speed * dt;
        car.z += Math.cos(car.heading) * car.speed * dt;

        // Turn only at a real intersection, where both coordinates sit on roads.
        const nearLine = (v) => Math.abs(v - Math.round(v / 60) * 60) < 2;
        if (nearLine(car.x) && nearLine(car.z) && rng.chance(0.02)) turnAtIntersection(car);
        const clamped = world.clampToCity(car.x, car.z);
        if (clamped.x !== car.x || clamped.z !== car.z || Math.abs(car.x) > 240 || Math.abs(car.z) > 240) {
          const spot = world.pointOnRoad();
          car.x = spot.x;
          car.z = spot.z;
          car.heading = spot.heading;
          car.axis = spot.axis;
        }
        car.mesh.position.set(car.x, 0, car.z);
        car.mesh.rotation.y = car.heading;
      }
    },
  };

  traffic.reset(CONFIG.traffic.base);
  return traffic;
}
