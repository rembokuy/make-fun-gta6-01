// Partikel murah: satu awan THREE.Points yang didaur ulang. Percikan
// untuk pukulan, asap abu-abu untuk tabrakan, kilau emas untuk pickup,
// dan confetti warna-warni saat misi selesai. Tidak ada alokasi per frame.
// Semua keacakan memakai RNG ber-seed supaya screenshot bisa diulang.

import * as THREE from 'three';

const MAX = 400;

export function createParticleField(scene, rng) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(MAX * 3);
  const colors = new Float32Array(MAX * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  const parts = [];
  for (let i = 0; i < MAX; i++) {
    parts.push({ alive: false, x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1 });
    positions[i * 3 + 1] = -100;
  }
  return { points, positions, colors, parts, cursor: 0, rng };
}

function spawn(fx, x, y, z, vx, vy, vz, life, r, g, b) {
  const p = fx.parts[fx.cursor];
  fx.cursor = (fx.cursor + 1) % MAX;
  p.alive = true;
  p.x = x;
  p.y = y;
  p.z = z;
  p.vx = vx;
  p.vy = vy;
  p.vz = vz;
  p.life = life;
  p.max = life;
  const i = fx.parts.indexOf(p);
  fx.colors[i * 3] = r;
  fx.colors[i * 3 + 1] = g;
  fx.colors[i * 3 + 2] = b;
}

export function burstSparks(fx, pos) {
  for (let i = 0; i < 14; i++) {
    const a = fx.rng.angle();
    const s = 3 + fx.rng.next() * 5;
    spawn(fx, pos.x, 1.2, pos.z, Math.sin(a) * s, 2 + fx.rng.next() * 4, Math.cos(a) * s, 0.5, 1, 0.8, 0.2);
  }
}

export function burstSmoke(fx, pos) {
  for (let i = 0; i < 10; i++) {
    spawn(
      fx,
      pos.x + (fx.rng.next() - 0.5) * 2,
      0.8,
      pos.z + (fx.rng.next() - 0.5) * 2,
      (fx.rng.next() - 0.5) * 2,
      1.5 + fx.rng.next() * 2,
      (fx.rng.next() - 0.5) * 2,
      0.9,
      0.55,
      0.55,
      0.55,
    );
  }
}

export function burstGold(fx, pos) {
  for (let i = 0; i < 16; i++) {
    const a = fx.rng.angle();
    spawn(fx, pos.x, 1, pos.z, Math.sin(a) * 2, 3 + fx.rng.next() * 3, Math.cos(a) * 2, 0.7, 1, 0.85, 0.3);
  }
}

export function burstConfetti(fx, pos) {
  const palette = [[1, 0.4, 0.3], [1, 0.85, 0.3], [0.4, 0.8, 1], [0.5, 0.9, 0.5], [0.9, 0.5, 1]];
  for (let i = 0; i < 30; i++) {
    const a = fx.rng.angle();
    const s = 2 + fx.rng.next() * 4;
    const c = palette[i % palette.length];
    spawn(fx, pos.x, 1.5, pos.z, Math.sin(a) * s, 4 + fx.rng.next() * 4, Math.cos(a) * s, 1.1, c[0], c[1], c[2]);
  }
}

export function stepParticles(fx, dt) {
  for (let i = 0; i < MAX; i++) {
    const p = fx.parts[i];
    if (!p.alive) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.alive = false;
      fx.positions[i * 3 + 1] = -100;
      continue;
    }
    p.vy -= 6 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    fx.positions[i * 3] = p.x;
    fx.positions[i * 3 + 1] = p.y;
    fx.positions[i * 3 + 2] = p.z;
  }
  fx.points.geometry.attributes.position.needsUpdate = true;
  fx.points.geometry.attributes.color.needsUpdate = true;
}
