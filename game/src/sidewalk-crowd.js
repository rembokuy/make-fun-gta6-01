// SOLMARINA — sidewalk crowd. 26 pedestrians stroll the sidewalks on
// seeded routes; a speeding car, a gunshot or a high wanted level sends them
// running. They are the city feeling alive — and the cost of bad driving.

import * as THREE from 'three';
import { CONFIG } from './game-config.js';

const SHIRTS = [0xe8e8e8, 0x3a7ac6, 0xd8a83a, 0x4da06a, 0xc65a3a, 0x8a5fc0, 0x2b2f36, 0xe8a8c8];

export function createCrowd(scene, world, rng) {
  const walkers = [];

  function makeWalkerMesh(shirt) {
    const group = new THREE.Group();
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.85, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x2b2f36 }),
    );
    legs.position.y = 0.42;
    group.add(legs);
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.8, 0.36),
      new THREE.MeshLambertMaterial({ color: shirt }),
    );
    torso.position.y = 1.25;
    group.add(torso);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xe8b98a }),
    );
    head.position.y = 1.92;
    group.add(head);
    return group;
  }

  for (let i = 0; i < CONFIG.crowd.count; i++) {
    const spot = world.pointOnSidewalk();
    const mesh = makeWalkerMesh(SHIRTS[i % SHIRTS.length]);
    mesh.position.set(spot.x, 0, spot.z);
    mesh.rotation.y = spot.heading;
    scene.add(mesh);
    walkers.push({
      mesh,
      x: spot.x,
      z: spot.z,
      heading: spot.heading,
      speed: rng.range(1.1, 2.1),
      panic: 0,
      down: false,
      downTimer: 0,
      legSwing: rng.range(0, 6),
    });
  }

  const crowd = {
    walkers,

    get count() {
      return walkers.length;
    },

    nearest(x, z, radius) {
      let best = null;
      let bestD = radius;
      for (const w of walkers) {
        if (w.down) continue;
        const d = Math.hypot(w.x - x, w.z - z);
        if (d < bestD) {
          bestD = d;
          best = w;
        }
      }
      return best;
    },

    knockDown(walker) {
      walker.down = true;
      walker.downTimer = 6;
      walker.mesh.rotation.x = Math.PI / 2;
      walker.mesh.position.y = 0.4;
    },

    scare(x, z, radius) {
      for (const w of walkers) {
        if (w.down) continue;
        if (Math.hypot(w.x - x, w.z - z) < radius) w.panic = 3;
      }
    },

    reset() {
      for (const w of walkers) {
        const spot = world.pointOnSidewalk();
        w.x = spot.x;
        w.z = spot.z;
        w.heading = spot.heading;
        w.panic = 0;
        w.down = false;
        w.downTimer = 0;
        w.mesh.rotation.set(0, spot.heading, 0);
        w.mesh.position.set(spot.x, 0, spot.z);
      }
    },

    update(dt, player, wantedLevel) {
      for (const w of walkers) {
        if (w.down) {
          w.downTimer -= dt;
          if (w.downTimer <= 0) {
            w.down = false;
            w.mesh.rotation.x = 0;
            w.mesh.position.y = 0;
          }
          continue;
        }
        if (w.panic > 0) w.panic -= dt;
        const playerNear = Math.hypot(w.x - player.x, w.z - player.z);
        const fleeing = w.panic > 0 || (wantedLevel >= 3 && playerNear < 14);
        const speed = fleeing ? CONFIG.crowd.panicSpeed : w.speed;
        if (fleeing) {
          // Run away from the player.
          const away = Math.atan2(w.x - player.x, w.z - player.z);
          w.heading = away;
        } else if (rng.chance(0.004)) {
          // Occasionally turn around and stroll the other way.
          w.heading += Math.PI;
        }
        w.x += Math.sin(w.heading) * speed * dt;
        w.z += Math.cos(w.heading) * speed * dt;
        const clamped = world.clampToCity(w.x, w.z);
        if (clamped.x !== w.x || clamped.z !== w.z) {
          w.heading += Math.PI;
          w.x = clamped.x;
          w.z = clamped.z;
        }
        // Little walk bob, driven by distance so it never desyncs.
        w.legSwing += speed * dt * 4;
        w.mesh.position.set(w.x, Math.abs(Math.sin(w.legSwing)) * 0.06, w.z);
        w.mesh.rotation.y = w.heading;
      }
    },
  };

  return crowd;
}
