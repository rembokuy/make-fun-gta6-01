// SOLMARINA — Rush Hour. Every ~90 seconds the coast clogs up for 45 seconds:
// traffic triples, three police roadblocks drop onto the main avenues with
// real collisions, and every mission payout jumps 50%.

import * as THREE from 'three';
import { CONFIG } from './game-config.js';

export function createRushHour(scene, world, rng) {
  const cfg = CONFIG.rush;
  const roadblockMeshes = [];

  function makeRoadblockMesh() {
    const group = new THREE.Group();
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
    const redMat = new THREE.MeshLambertMaterial({ color: 0xd23b2e });
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(7, 0.5, 0.5),
        i % 2 === 0 ? stripeMat : redMat,
      );
      bar.position.set(0, 1 + i * 0.35, 0);
      group.add(bar);
    }
    for (const sx of [-3, 3]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.5), stripeMat);
      leg.position.set(sx, 0.9, 0);
      group.add(leg);
    }
    const coneGeo = new THREE.ConeGeometry(0.5, 1.1, 8);
    const coneMat = new THREE.MeshLambertMaterial({ color: 0xff7a1a });
    for (const cx of [-5.5, 5.5]) {
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(cx, 0.55, 0);
      group.add(cone);
    }
    group.visible = false;
    scene.add(group);
    return group;
  }

  for (let i = 0; i < cfg.roadblocks; i++) roadblockMeshes.push(makeRoadblockMesh());

  const rush = {
    active: false,
    toNext: cfg.everySeconds,
    remaining: 0,
    roadblocks: [],
    startedCount: 0,

    get multiplier() {
      return this.active ? 1 + cfg.payoutBonus : 1;
    },

    get countdown() {
      return this.active ? Math.ceil(this.remaining) : Math.ceil(this.toNext);
    },

    start() {
      if (this.active) return false;
      this.active = true;
      this.remaining = cfg.durationSeconds;
      this.startedCount += 1;
      // Three roadblocks on three different main avenues, shuffled fair and square.
      const lines = [...CONFIG.world.roads];
      for (let i = lines.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [lines[i], lines[j]] = [lines[j], lines[i]];
      }
      this.roadblocks = lines.slice(0, cfg.roadblocks).map((line, i) => {
        const alongX = i % 2 === 0;
        const spot = alongX
          ? { x: rng.range(-120, 120), z: line, heading: Math.PI / 2 }
          : { x: line, z: rng.range(-120, 120), heading: 0 };
        const mesh = roadblockMeshes[i];
        mesh.visible = true;
        mesh.position.set(spot.x, 0, spot.z);
        mesh.rotation.y = spot.heading;
        return { ...spot, mesh };
      });
      return true;
    },

    stop() {
      if (!this.active) return false;
      this.active = false;
      this.toNext = cfg.everySeconds;
      this.remaining = 0;
      for (const rb of this.roadblocks) rb.mesh.visible = false;
      this.roadblocks = [];
      return true;
    },

    forceStart() {
      return this.start();
    },

    forceStop() {
      return this.stop();
    },

    update(dt, traffic) {
      if (this.active) {
        this.remaining -= dt;
        traffic.setTarget(CONFIG.traffic.rush);
        if (this.remaining <= 0) this.stop();
      } else {
        this.toNext -= dt;
        traffic.setTarget(CONFIG.traffic.base);
        if (this.toNext <= 0) this.start();
      }
    },

    reset() {
      this.stop();
      this.toNext = cfg.everySeconds;
      this.startedCount = 0;
    },
  };

  return rush;
}
