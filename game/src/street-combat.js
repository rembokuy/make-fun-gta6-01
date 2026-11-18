// SOLMARINA — street combat. Rae punches up close and fires her pistol at
// range; the Beach Gang thugs fight back, go down after enough hits, and get
// back up again. Every shot and every punch feeds the wanted system.

import * as THREE from 'three';
import { CONFIG } from './game-config.js';

export function createCombat(scene, world, rng, hooks) {
  const thugs = [];

  function makeThugMesh() {
    const group = new THREE.Group();
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.85, 0.34),
      new THREE.MeshLambertMaterial({ color: 0x1c1c22 }),
    );
    legs.position.y = 0.42;
    group.add(legs);
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.85, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x6a3a8a }),
    );
    torso.position.y = 1.28;
    group.add(torso);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xd8a878 }),
    );
    head.position.y = 2.0;
    group.add(head);
    return group;
  }

  function spawnThug(x, z) {
    const mesh = makeThugMesh();
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const thug = { mesh, x, z, heading: rng.range(0, Math.PI * 2), hp: 100, down: false, downTimer: 0, punchTimer: 0 };
    thugs.push(thug);
    return thug;
  }

  // Four thugs hold the beach camp; two more drift near the debt spots.
  const camp = world.spots.thugCamp;
  for (let i = 0; i < 4; i++) spawnThug(camp.x + rng.range(-8, 8), camp.z + rng.range(-8, 8));
  for (const debt of world.spots.debts.slice(0, 2)) {
    spawnThug(debt.x + rng.range(-6, 6), debt.z + rng.range(-6, 6));
  }

  const combat = {
    thugs,
    cooldown: 0,

    spawnThug,

    nearestThug(x, z, radius) {
      let best = null;
      let bestD = radius;
      for (const t of thugs) {
        if (t.down) continue;
        const d = Math.hypot(t.x - x, t.z - z);
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
      return best;
    },

    damageThug(thug, amount) {
      thug.hp -= amount;
      if (thug.hp <= 0) {
        thug.down = true;
        thug.downTimer = 8;
        thug.mesh.rotation.x = Math.PI / 2;
        thug.mesh.position.y = 0.4;
        if (hooks.onThugDown) hooks.onThugDown(thug);
      }
    },

    punch(player, crowd) {
      const thug = this.nearestThug(player.x, player.z, CONFIG.player.punchRange);
      if (thug) {
        this.damageThug(thug, CONFIG.player.punchDamage);
        if (hooks.onPunch) hooks.onPunch(thug);
        return 'thug';
      }
      const ped = crowd ? crowd.nearest(player.x, player.z, CONFIG.player.punchRange) : null;
      if (ped) {
        crowd.knockDown(ped);
        if (hooks.onPunchPed) hooks.onPunchPed(ped);
        return 'ped';
      }
      return null;
    },

    shoot(player, crowd) {
      if (this.cooldown > 0) return null;
      this.cooldown = CONFIG.player.shootCooldown;
      const range = CONFIG.player.shootRange;
      const dirX = Math.sin(player.heading);
      const dirZ = Math.cos(player.heading);
      let best = null;
      let bestD = range;
      let bestKind = null;
      for (const t of thugs) {
        if (t.down) continue;
        const dx = t.x - player.x;
        const dz = t.z - player.z;
        const along = dx * dirX + dz * dirZ;
        const side = Math.abs(dx * dirZ - dz * dirX);
        if (along > 0 && along < bestD && side < 1.6) {
          best = t;
          bestD = along;
          bestKind = 'thug';
        }
      }
      if (crowd) {
        for (const w of crowd.walkers) {
          if (w.down) continue;
          const dx = w.x - player.x;
          const dz = w.z - player.z;
          const along = dx * dirX + dz * dirZ;
          const side = Math.abs(dx * dirZ - dz * dirX);
          if (along > 0 && along < bestD && side < 1.6) {
            best = w;
            bestD = along;
            bestKind = 'ped';
          }
        }
      }
      const muzzle = { x: player.x + dirX * 1.2, y: 1.5, z: player.z + dirZ * 1.2 };
      if (bestKind === 'thug') this.damageThug(best, CONFIG.player.shootDamage);
      if (bestKind === 'ped') crowd.knockDown(best);
      if (hooks.onShoot) hooks.onShoot({ muzzle, hit: best, kind: bestKind, distance: bestD });
      return { muzzle, hit: best, kind: bestKind };
    },

    update(dt, player, crowd) {
      if (this.cooldown > 0) this.cooldown -= dt;
      for (const t of thugs) {
        if (t.down) {
          t.downTimer -= dt;
          if (t.downTimer <= 0) {
            t.down = false;
            t.hp = 100;
            t.mesh.rotation.x = 0;
            t.mesh.position.y = 0;
          }
          continue;
        }
        t.punchTimer -= dt;
        const d = Math.hypot(t.x - player.x, t.z - player.z);
        if (d < 26 && !player.inVehicle) {
          // Close in and swing when in reach.
          const want = Math.atan2(player.x - t.x, player.z - t.z);
          t.heading = want;
          if (d > 1.8) {
            t.x += Math.sin(want) * 3.4 * dt;
            t.z += Math.cos(want) * 3.4 * dt;
          } else if (t.punchTimer <= 0) {
            t.punchTimer = 1.1;
            if (hooks.onThugHit) hooks.onThugHit(t, 8);
          }
          t.mesh.position.set(t.x, 0, t.z);
          t.mesh.rotation.y = t.heading;
        }
      }
    },
  };

  return combat;
}
