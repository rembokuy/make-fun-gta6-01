// Wanted level and the Solmarina police. Crimes raise the level; cops
// spawn at the city edge and chase the player, ramming on foot or in a
// car. Getting caught on foot with a cop close for long enough — or
// wrecking the car under a high wanted level — gets Rae busted.

import { COP_MAX, WANTED } from './config.js';
import { createCar, driveCar, makeCarMesh, syncCarMesh } from './vehicles.js';

export function createPolice(scene) {
  return {
    wanted: 0,
    sinceCrime: 999,
    decayTimer: 0,
    cops: [],
    bustedTimer: 0,
    scene,
  };
}

export function addWanted(police, amount) {
  police.wanted = Math.min(WANTED.max, police.wanted + amount);
  police.sinceCrime = 0;
  police.decayTimer = 0;
}

function spawnCop(police, near) {
  const angle = Math.random() * Math.PI * 2;
  const x = near.x + Math.sin(angle) * 48;
  const z = near.z + Math.cos(angle) * 48;
  const mesh = makeCarMesh(0x1c2733, { police: true });
  police.scene.add(mesh);
  const cop = createCar(mesh, Math.max(-185, Math.min(185, x)), Math.max(-185, Math.min(185, z)), Math.atan2(near.x - x, near.z - z), 'police');
  cop.speed = 16;
  police.cops.push(cop);
  syncCarMesh(cop);
  return cop;
}

export function updatePolice(police, dt, player, colliders, onBusted) {
  police.sinceCrime += dt;

  // Wanted decays after a quiet spell.
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

  const playerSpeed = player.car ? Math.abs(player.car.speed) : 0;
  for (const cop of police.cops) {
    const dx = player.pos.x - cop.pos.x;
    const dz = player.pos.z - cop.pos.z;
    const dist = Math.hypot(dx, dz);
    const targetHeading = Math.atan2(dx, dz);
    let diff = targetHeading - cop.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 1.4));
    const throttle = dist > 4 ? 1 : 0.3;
    const before = { x: cop.pos.x, z: cop.pos.z };
    driveCar(cop, throttle, steer, dt, colliders, null);
    // A cop that rams the player hard shoves the player's car.
    if (dist < 3.4 && player.car) {
      player.car.speed *= 0.96;
      police.sinceCrime = 0;
    }
    // Busted: on foot and a cop sits on top of Rae for a while.
    if (!player.car && dist < 2.6) {
      police.bustedTimer += dt;
      if (police.bustedTimer > 2.2 && onBusted) onBusted();
    } else {
      police.bustedTimer = Math.max(0, police.bustedTimer - dt * 2);
    }
    // Cops that fall far behind teleport closer, so the chase never dies.
    if (dist > 160) {
      const angle = Math.random() * Math.PI * 2;
      cop.pos.x = player.pos.x + Math.sin(angle) * 60;
      cop.pos.z = player.pos.z + Math.cos(angle) * 60;
      cop.heading = Math.atan2(player.pos.x - cop.pos.x, player.pos.z - cop.pos.z);
      cop.speed = 12;
      syncCarMesh(cop);
    }
    void before;
  }
  return playerSpeed;
}
