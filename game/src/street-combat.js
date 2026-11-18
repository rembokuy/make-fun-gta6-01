// Combat: tinju (F) dan pistol (klik mouse). Pukulan mengenai orang
// terdekat di depan Rae; tembakan mengenai orang terdekat kira-kira di
// garis bidik kamera. Preman membalas dengan pukulan yang lambat dan
// mudah ditebak. Memukul orang biasa adalah kejahatan — wanted naik.

import { PLAYER } from './game-config.js';

export function createCombatState() {
  return {
    punchTimer: 0,
    shootTimer: 0,
    muzzleFlash: 0,
    shotsFired: 0,
    punchesLanded: 0,
  };
}

function angleTo(from, heading, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const target = Math.atan2(dx, dz);
  let diff = target - heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return { dist: Math.hypot(dx, dz), diff };
}

// Orang hidup terdekat di dalam `range` dan `arc` radian dari `heading`.
export function nearestInArc(peds, from, heading, range, arc) {
  let best = null;
  let bestD = Infinity;
  for (const ped of peds) {
    if (ped.state === 'down') continue;
    const { dist, diff } = angleTo(from, heading, ped.pos);
    // Jarak nol (tepat di atas pemain) dihitung lurus ke depan: sudut ke
    // target berjarak nol tidak ada artinya.
    if (dist < range && (dist < 0.35 || Math.abs(diff) < arc) && dist < bestD) {
      best = ped;
      bestD = dist;
    }
  }
  return best;
}

function knockDown(ped) {
  ped.state = 'down';
  ped.health = 0;
}

export function stepCombat(combat, dt, ctx) {
  combat.punchTimer = Math.max(0, combat.punchTimer - dt);
  combat.shootTimer = Math.max(0, combat.shootTimer - dt);
  combat.muzzleFlash = Math.max(0, combat.muzzleFlash - dt * 6);

  if (ctx.punch && combat.punchTimer <= 0 && !ctx.inCar) {
    combat.punchTimer = PLAYER.punchCooldown;
    ctx.punchSound();
    const target = nearestInArc(ctx.peds, ctx.pos, ctx.heading, PLAYER.punchRange, 0.9);
    if (target) {
      target.health -= PLAYER.punchDamage;
      target.state = 'flee';
      target.timer = 2;
      target.heading = Math.atan2(target.pos.x - ctx.pos.x, target.pos.z - ctx.pos.z);
      ctx.spark(target.pos);
      combat.punchesLanded += 1;
      if (target.health <= 0) knockDown(target);
      if (target.role === null) ctx.crime(1); // memukul orang biasa
    }
  }

  if (ctx.shoot && combat.shootTimer <= 0 && !ctx.inCar) {
    combat.shootTimer = 0.35;
    combat.muzzleFlash = 1;
    combat.shotsFired += 1;
    ctx.gunSound();
    ctx.crime(2);
    const target = nearestInArc(ctx.peds, ctx.pos, ctx.heading, 40, 0.22);
    if (target) {
      target.health -= 60;
      ctx.spark(target.pos);
      if (target.health <= 0) knockDown(target);
      else {
        target.state = 'flee';
        target.timer = 3;
        target.heading = Math.atan2(target.pos.x - ctx.pos.x, target.pos.z - ctx.pos.z);
      }
    }
  }

  // Preman membalas saat Rae dekat: mendekat, berhenti di jarak pukul,
  // lalu memukul dengan jeda — tidak pernah berjalan menembus Rae.
  for (const ped of ctx.peds) {
    if (ped.role !== 'guard' || ped.state === 'down') continue;
    ped.attackTimer -= dt;
    const d = Math.hypot(ped.pos.x - ctx.pos.x, ped.pos.z - ctx.pos.z);
    if (d < 6 && !ctx.inCar) {
      ped.heading = Math.atan2(ctx.pos.x - ped.pos.x, ctx.pos.z - ped.pos.z);
      if (d > 1.9) {
        ped.pos.x += Math.sin(ped.heading) * 2.6 * dt;
        ped.pos.z += Math.cos(ped.heading) * 2.6 * dt;
      }
      ped.state = 'walk';
      if (d < 1.8 && ped.attackTimer <= 0) {
        ped.attackTimer = 1.1;
        ctx.hurtPlayer(8);
        ctx.punchSound();
      }
    }
  }
}
