// Save / load: progres Rae (uang, total penghasilan, misi, kesehatan,
// posisi) tersimpan di localStorage. Kunci v2 dipakai sekarang; save v1
// lama masih dibaca sekali lalu dimigrasi, supaya pemain lama tidak
// kehilangan progres saat update.

import { PLAYER, SAVE_KEY, SAVE_KEY_LEGACY } from './game-config.js';
import { beginStoryAt } from './missions-story.js';

export function saveProgress(world) {
  try {
    window.localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 2,
        money: Math.floor(world.player.money),
        totalEarned: Math.floor(world.player.totalEarned),
        mission: world.story.index,
        health: world.player.health,
        x: world.player.pos.x,
        z: world.player.pos.z,
      }),
    );
  } catch {
    // Storage mati: permainan jalan, hanya tidak tersimpan.
  }
}

export function loadProgress() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY) ?? window.localStorage.getItem(SAVE_KEY_LEGACY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function applyProgress(world, save) {
  if (!save) return;
  world.player.money = save.money ?? 0;
  world.player.totalEarned = save.totalEarned ?? save.money ?? 0;
  world.player.health = save.health ?? PLAYER.health;
  if (typeof save.x === 'number' && typeof save.z === 'number') {
    world.player.pos.x = save.x;
    world.player.pos.z = save.z;
  }
  if (typeof save.mission === 'number' && save.mission > 0 && save.mission < 3) {
    beginStoryAt(world.story, save.mission);
  }
}
