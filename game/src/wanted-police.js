// Wanted dan polisi Solmarina. Kejahatan menaikkan level; polisi muncul
// dari RNG ber-seed (bukan Math.random, supaya adegan bisa diulang),
// mengejar pemain, dan menabrak mobilnya. Tertangkap jalan kaki saat
// polisi menempel cukup lama — atau menghancurkan mobil di wanted tinggi —
// membuat Rae tertangkap.

import { COP_MAX, PALETTE, WANTED } from './game-config.js';
import { buildCarMesh, driveCar, flashCopLights, newCar, syncCar } from './driveable-vehicles.js';

export function createWantedPolice(scene, rng) {
  return {
    wanted: 0,
    sinceCrime: 999,
    decayTimer: 0,
    cops: [],
    bustedTimer: 0,
    scene,
    rng,
  };
}

export function raiseWanted(police, amount) {
  police.wanted = Math.min(WANTED.max, police.wanted + amount);
  police.sinceCrime = 0;
  police.decayTimer = 0;
}

export function lowerWanted(police, amount) {
  police.wanted = Math.max(0, police.wanted - amount);
  if (police.wanted === 0) police.decayTimer = 0;
}

function spawnCop(police, near) {
  const angle = police.rng.angle();
  const x = near.x + Math.sin(angle) * 48;
  const z = near.z + Math.cos(angle) * 48;
  return spawnCopAt(police, x, z, near);
}

// Munculkan satu mobil polisi di koordinat pasti, menghadap pemain.
// Dipakai staging screenshot supaya polisi selalu terlihat di frame.
export function spawnCopAt(police, x, z, near) {
  const cx = Math.max(-185, Math.min(185, x));
  const cz = Math.max(-185, Math.min(185, z));
  const mesh = buildCarMesh(PALETTE.copCar, { police: true });
  police.scene.add(mesh);
  const target = near ?? { x: cx, z: cz };
  const cop = newCar(mesh, cx, cz, Math.atan2(target.x - cx, target.z - cz), 'police');
  cop.speed = 16;
  cop.cruise = 20;
  police.cops.push(cop);
  syncCar(cop);
  return cop;
}

export function removeAllCops(police) {
  for (const cop of police.cops) police.scene.remove(cop.mesh);
  police.cops.length = 0;
  police.bustedTimer = 0;
}

export function stepPolice(police, dt, player, colliders, timeSeconds, onBusted) {
  police.sinceCrime += dt;

  // Wanted meluruh setelah masa tenang.
  if (police.wanted > 0 && police.sinceCrime > WANTED.decayDelay) {
    police.decayTimer += dt;
    if (police.decayTimer >= WANTED.decayEvery) {
      police.decayTimer = 0;
      police.wanted -= 1;
    }
  }

  const wantCops = police.wanted === 0 ? 0 : Math.min(COP_MAX, police.wanted + 1);
  while (police.cops.length < wantCops) spawnCop(police, player.pos);
  while (police.cops.length > wantCops) {
    const cop = police.cops.pop();
    police.scene.remove(cop.mesh);
  }

  for (const cop of police.cops) {
    flashCopLights(cop, timeSeconds);
    const dx = player.pos.x - cop.pos.x;
    const dz = player.pos.z - cop.pos.z;
    const dist = Math.hypot(dx, dz);
    const targetHeading = Math.atan2(dx, dz);
    let diff = targetHeading - cop.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 1.4));
    const throttle = dist > 4 ? 1 : 0.3;
    driveCar(cop, throttle, steer, dt, colliders, null);
    // Polisi yang menabrak keras mendorong mobil pemain.
    if (dist < 3.4 && player.car) {
      player.car.speed *= 0.96;
      police.sinceCrime = 0;
    }
    // Tertangkap: jalan kaki dan polisi menempel cukup lama.
    if (!player.car && dist < 2.6) {
      police.bustedTimer += dt;
      if (police.bustedTimer > 2.2 && onBusted) onBusted();
    } else {
      police.bustedTimer = Math.max(0, police.bustedTimer - dt * 2);
    }
    // Polisi yang tertinggal jauh teleport lebih dekat, supaya
    // kejar-kejaran tidak pernah mati.
    if (dist > 160) {
      const angle = police.rng.angle();
      cop.pos.x = player.pos.x + Math.sin(angle) * 60;
      cop.pos.z = player.pos.z + Math.cos(angle) * 60;
      cop.heading = Math.atan2(player.pos.x - cop.pos.x, player.pos.z - cop.pos.z);
      cop.speed = 12;
      syncCar(cop);
    }
  }
}
