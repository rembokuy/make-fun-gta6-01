// Combat: fists (F) and a pistol (mouse click). Punches hit the nearest
// person in front of Rae; shots hit the nearest person roughly in the
// camera's aim line. Guards fight back with slow, telegraphed punches.
// Hitting a bystander is a crime — the wanted level notices.

import { PLAYER } from './config.js';

export function createCombat() {
  return {
    punchTimer: 0,
    shootTimer: 0,
    muzzleFlash: 0,
    lastTarget: null,
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

// The nearest living ped inside `range` and `arc` radians of `heading`.
export function nearestInArc(peds, from, heading, range, arc) {
  let best = null;
  let bestD = Infinity;
  for (const ped of peds) {
    if (ped.state === 'down') continue;
    const { dist, diff } = angleTo(from, heading, ped.pos);
    // Point-blank (on top of the player) counts as straight ahead: the
    // angle to a target at distance zero is meaningless.
    if (dist < range && (dist < 0.35 || Math.abs(diff) < arc) && dist < bestD) {
      best = ped;
      bestD = dist;
    }
  }
  return best;
}

export function updateCombat(combat, dt, ctx) {
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
      if (target.health <= 0) {
        target.state = 'down';
        target.health = 0;
      }
      if (target.role === null) ctx.crime(1); // hitting a bystander
    }
  }

  if (ctx.shoot && combat.shootTimer <= 0 && !ctx.inCar) {
    combat.shootTimer = 0.35;
    combat.muzzleFlash = 1;
    ctx.gunSound();
    ctx.crime(2);
    const target = nearestInArc(ctx.peds, ctx.pos, ctx.heading, 40, 0.22);
    if (target) {
      target.health -= 60;
      ctx.spark(target.pos);
      if (target.health <= 0) {
        target.state = 'down';
        target.health = 0;
      } else {
        target.state = 'flee';
        target.timer = 3;
        target.heading = Math.atan2(target.pos.x - ctx.pos.x, target.pos.z - ctx.pos.z);
      }
    }
    // A shot can also scare a parked car's alarm: nothing breaks, it just pings.
  }

  // Guards punch back when Rae is close.
  for (const ped of ctx.peds) {
    if (ped.role !== 'guard' || ped.state === 'down') continue;
    ped.attackTimer = (ped.attackTimer ?? 0) - dt;
    const d = Math.hypot(ped.pos.x - ctx.pos.x, ped.pos.z - ctx.pos.z);
    if (d < 6 && !ctx.inCar) {
      // Walk toward Rae, but stop at punching range — never walk through her.
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
