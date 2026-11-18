// Rush Hour — event dinamis yang membuat Solmarina mendadak chaos.
// Tiap ~90 detik permainan, event 45 detik dimulai: traffic membengkak
// tiga kali lipat, tiga roadblock polisi muncul di persimpangan terdekat
// dari pemain (barikade bergaris oranye + lampu berkedip yang terlihat
// jelas dari jauh), dan semua payout misi naik 50% selama event.
// Banner HUD + hitung mundur memberi tahu pemain kapan event berakhir,
// dan kapan event berikutnya datang.

import * as THREE from 'three';
import { PALETTE, RUSH } from './game-config.js';
import { nearestIntersections } from './coastal-city.js';
import { addRushTraffic, removeRushTraffic } from './street-traffic.js';

function buildRoadblockMesh() {
  const group = new THREE.Group();
  // Barikade: dua kaki + papan bergaris oranye-putih.
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2f3540 });
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 0.9), legMat);
    leg.position.set(s * 2.2, 0.55, 0);
    leg.castShadow = true;
    group.add(leg);
  }
  const board = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.42, 0.18),
      new THREE.MeshLambertMaterial({ color: i % 2 === 0 ? PALETTE.roadblockStripe : 0xf5f0e6 }),
    );
    stripe.position.y = 0.55 + i * 0.45;
    board.add(stripe);
  }
  group.add(board);
  // Dua lampu berkedip di atas barikade.
  const lampGeo = new THREE.SphereGeometry(0.22, 8, 6);
  const lampRed = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
  lampRed.position.set(-1.2, 2.05, 0);
  group.add(lampRed);
  const lampBlue = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0x2a6bff }));
  lampBlue.position.set(1.2, 2.05, 0);
  group.add(lampBlue);
  group.userData.lampRed = lampRed;
  group.userData.lampBlue = lampBlue;
  group.userData.board = board;
  return group;
}

function blinkRoadblock(group, timeSeconds) {
  const phase = Math.floor(timeSeconds / 0.35) % 2 === 0;
  group.userData.lampRed.material.color.setHex(phase ? 0xff2a2a : 0x5a1010);
  group.userData.lampBlue.material.color.setHex(phase ? 0x10265a : 0x2a6bff);
}

export function createRushHour(scene) {
  return {
    scene,
    active: false,
    untilNext: RUSH.firstAtSeconds, // detik menuju event pertama
    remaining: 0, // detik tersisa saat event aktif
    cyclesDone: 0,
    roadblocks: [], // { mesh, x, z, heading }
    lastEventAt: 0,
  };
}

// Pengali payout yang berlaku sekarang (1.5 saat event, 1 di luar event).
export function rushPayoutMultiplier(rush) {
  return rush.active ? RUSH.payoutMultiplier : 1;
}

// Detik sampai event berikutnya (0 saat event sedang aktif).
export function rushSecondsUntilNext(rush) {
  return rush.active ? 0 : Math.max(0, Math.ceil(rush.untilNext));
}

function spawnRoadblocks(rush, playerPos, city) {
  const spots = nearestIntersections(city, playerPos, RUSH.roadblockCount);
  for (const spot of spots) {
    const mesh = buildRoadblockMesh();
    // Barikade melintang di tengah persimpangan, sedikit miring acak
    // supaya tidak terlihat seperti tembok yang disengaja.
    const heading = (Math.PI / 4) * (rush.roadblocks.length % 2 === 0 ? 1 : -1);
    mesh.position.set(spot.x, 0, spot.z);
    mesh.rotation.y = heading;
    rush.scene.add(mesh);
    rush.roadblocks.push({ mesh, x: spot.x, z: spot.z, heading });
  }
}

function clearRoadblocks(rush) {
  for (const block of rush.roadblocks) rush.scene.remove(block.mesh);
  rush.roadblocks.length = 0;
}

export function forceStartRushHour(rush, ctx) {
  // Dipakai staging screenshot: event langsung aktif, di tempat yang
  // dipilih staging (bukan persimpangan acak di dekat pemain).
  if (rush.active) return;
  rush.active = true;
  rush.remaining = RUSH.durationSeconds;
  rush.cyclesDone += 1;
  if (ctx && ctx.traffic) addRushTraffic(ctx.scene, ctx.rng, ctx.traffic);
  if (ctx && ctx.onStart) ctx.onStart();
}

export function forcePlaceRoadblock(rush, x, z, heading = 0) {
  const mesh = buildRoadblockMesh();
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  rush.scene.add(mesh);
  rush.roadblocks.push({ mesh, x, z, heading });
  return mesh;
}

// Satu langkah event. `ctx` membawa dunia: { scene, rng, traffic, city,
// playerPos, time, toast, horn }.
export function stepRushHour(rush, dt, ctx) {
  if (rush.active) {
    rush.remaining -= dt;
    for (const block of rush.roadblocks) blinkRoadblock(block.mesh, ctx.time);
    if (rush.remaining <= 0) {
      rush.active = false;
      rush.untilNext = RUSH.everySeconds;
      rush.cyclesDone += 1;
      clearRoadblocks(rush);
      removeRushTraffic(ctx.scene, ctx.traffic);
      ctx.toast('Rush Hour selesai — jalanan kembali normal.');
    }
    return;
  }
  rush.untilNext -= dt;
  if (rush.untilNext <= 0) {
    rush.active = true;
    rush.remaining = RUSH.durationSeconds;
    spawnRoadblocks(rush, ctx.playerPos, ctx.city);
    addRushTraffic(ctx.scene, ctx.rng, ctx.traffic);
    ctx.toast('RUSH HOUR! Traffic ×3 — roadblock polisi di depan. Payout misi +50%!');
    if (ctx.horn) ctx.horn();
  }
}

// Tabrakan pemain dengan barikade: perlambat mobil dan dorong mundur
// sedikit, supaya roadblock terasa nyata, bukan sekadar hiasan.
export function collideRoadblocks(rush, pos, radius, speedRef) {
  let hit = false;
  for (const block of rush.roadblocks) {
    const d = Math.hypot(pos.x - block.x, pos.z - block.z);
    if (d < radius + 2.6) {
      hit = true;
      const push = (radius + 2.6 - d) || 0.1;
      const nx = (pos.x - block.x) / (d || 1);
      const nz = (pos.z - block.z) / (d || 1);
      pos.x += nx * push;
      pos.z += nz * push;
      if (speedRef) speedRef.value *= 0.4;
    }
  }
  return hit;
}
