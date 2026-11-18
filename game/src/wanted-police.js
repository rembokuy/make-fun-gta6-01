// SOLMARINA — the wanted system. Crimes add heat, heat decays when Rae is
// out of sight, and each star puts another police cruiser on her tail.
// At five stars the whole coast is chasing her.

import * as THREE from 'three';
import { CONFIG } from './game-config.js';
import { makeCarMesh } from './street-traffic.js';

export function createWanted(scene, world, rng) {
  const cfg = CONFIG.wanted;
  const cruisers = [];
  for (let i = 0; i < cfg.max; i++) {
    const mesh = makeCarMesh(CONFIG.colors.police);
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.22, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }),
    );
    bar.position.set(0, 1.75, -0.2);
    bar.name = 'lightbar';
    mesh.add(bar);
    mesh.visible = false;
    scene.add(mesh);
    cruisers.push({ mesh, bar, x: 0, z: 0, heading: 0, speed: 0, active: false, flash: 0 });
  }

  const wanted = {
    heat: 0,
    level: 0,
    unseenTimer: 0,
    cruisers,

    addHeat(amount, kind) {
      this.heat = Math.min(220, this.heat + amount);
      this.unseenTimer = 0;
      const next = cfg.thresholds.filter((t) => this.heat >= t).length;
      if (next > this.level) this.level = Math.min(cfg.max, next);
      return this.level;
    },

    clear() {
      this.heat = 0;
      this.level = 0;
      this.unseenTimer = 0;
    },

    get pursued() {
      return this.level > 0;
    },

    update(dt, player, simTime) {
      // Heat cools off only while the police cannot see Rae.
      const nearest = this.nearestCruiserDistance(player);
      const seen = this.level > 0 && nearest < 70;
      if (seen) {
        this.unseenTimer = 0;
      } else {
        this.unseenTimer += dt;
        if (this.unseenTimer > cfg.unseenGrace) {
          this.heat = Math.max(0, this.heat - cfg.decayPerSecond * dt);
          const next = cfg.thresholds.filter((t) => this.heat >= t).length;
          this.level = Math.min(cfg.max, next);
        }
      }

      // One cruiser per star, spawning on a road behind the player.
      const want = this.level * cfg.policePerStar;
      for (let i = 0; i < cruisers.length; i++) {
        const c = cruisers[i];
        if (i < want && !c.active) {
          const spot = world.pointOnRoad();
          c.x = player.x + rng.range(-60, 60);
          c.z = player.z + rng.range(-60, 60);
          const clamped = world.clampToCity(c.x, c.z);
          c.x = clamped.x;
          c.z = clamped.z;
          c.heading = Math.atan2(player.x - c.x, player.z - c.z);
          c.speed = 0;
          c.active = true;
          c.mesh.visible = true;
          void spot;
        } else if (i >= want && c.active) {
          c.active = false;
          c.mesh.visible = false;
        }
      }

      for (const c of cruisers) {
        if (!c.active) continue;
        // Chase steering: turn toward Rae, full speed on the straights.
        const wantHeading = Math.atan2(player.x - c.x, player.z - c.z);
        let diff = wantHeading - c.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        c.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
        const targetSpeed = cfg.policeSpeed * (this.level >= 5 ? 1.15 : 1);
        c.speed += (targetSpeed - c.speed) * Math.min(1, dt * 1.2);
        c.x += Math.sin(c.heading) * c.speed * dt;
        c.z += Math.cos(c.heading) * c.speed * dt;
        const clamped = world.clampToCity(c.x, c.z);
        c.x = clamped.x;
        c.z = clamped.z;
        c.mesh.position.set(c.x, 0, c.z);
        c.mesh.rotation.y = c.heading;
        // Flashing light bar, flipping on the half-second.
        c.flash += dt;
        c.bar.material.color.setHex(Math.floor(simTime * 2) % 2 === 0 ? 0xff2222 : 0x2244ff);
      }
    },

    nearestCruiserDistance(player) {
      let best = Infinity;
      for (const c of cruisers) {
        if (!c.active) continue;
        best = Math.min(best, Math.hypot(c.x - player.x, c.z - player.z));
      }
      return best;
    },

    // A cruiser ramming Rae hurts; used by the main loop for contact.
    ramDamage(player) {
      for (const c of cruisers) {
        if (!c.active) continue;
        if (Math.hypot(c.x - player.x, c.z - player.z) < 2.8) return 6;
      }
      return 0;
    },
  };

  return wanted;
}
