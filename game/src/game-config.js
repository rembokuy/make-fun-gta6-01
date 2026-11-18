// SOLMARINA — Sun Coast Getaway: every tunable number for the open world.
// One place for balance so the other modules stay small and readable.

export const CONFIG = {
  seed: 7,
  step: 1 / 60,

  world: {
    half: 210,
    roadSpacing: 60,
    roadWidth: 12,
    roads: [-180, -120, -60, 0, 60, 120, 180],
    beachZ: 210,
    oceanZ: 252,
    harborX: 210,
    harborZ0: -60,
    harborZ1: 120,
  },

  player: {
    walkSpeed: 6,
    runSpeed: 10.5,
    turnSpeed: 9,
    health: 100,
    punchRange: 2.4,
    punchDamage: 34,
    shootRange: 46,
    shootDamage: 45,
    shootCooldown: 0.28,
  },

  car: {
    accel: 24,
    brake: 34,
    maxSpeed: 38,
    maxReverse: 11,
    turnRate: 1.9,
    grip: 0.92,
  },

  traffic: {
    base: 14,
    rush: 42,
    minSpeed: 7,
    maxSpeed: 13,
    carGap: 9,
  },

  crowd: {
    count: 26,
    walkSpeed: 1.6,
    panicSpeed: 4.2,
  },

  wanted: {
    max: 5,
    // Heat thresholds that raise the star count.
    thresholds: [22, 48, 78, 112, 150],
    decayPerSecond: 5,
    unseenGrace: 6,
    heatSteal: 26,
    heatHitPed: 34,
    heatShoot: 30,
    heatPunch: 12,
    policePerStar: 1,
    policeSpeed: 30,
  },

  rush: {
    everySeconds: 90,
    durationSeconds: 45,
    payoutBonus: 0.5,
    roadblocks: 3,
  },

  missions: {
    totalBase: 1250,
    list: [
      { id: 'm1', name: 'Kurir Fajar', pay: 250, blurb: 'Ambil paket di sudut barat, antar ke dermaga selatan.' },
      { id: 'm2', name: 'Tagih Utang', pay: 400, blurb: 'Tiga orang berutang pada Marlo. Tagih semuanya.' },
      { id: 'm3', name: 'Kabur ke Pelabuhan', pay: 600, blurb: 'Polisi makin dekat. Capai kapal di pelabuhan timur.' },
    ],
  },

  colors: {
    sky: 0x8fd3f4,
    sun: 0xfff2d8,
    ground: 0x3d7a4a,
    sand: 0xe8d29a,
    ocean: 0x1e6f9e,
    road: 0x2b2f36,
    sidewalk: 0xb9bec6,
    raeJacket: 0xd23b2e,
    police: 0xf2f2f2,
    taxi: 0xf5c518,
  },

  keys: {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    run: ['ShiftLeft', 'ShiftRight'],
    interact: ['KeyE'],
    punch: ['Space'],
    shoot: ['KeyF'],
    pause: ['KeyP'],
    mute: ['KeyM'],
    start: ['Enter'],
  },
};

export const MISSION_SPOTS = {
  packagePickup: { x: -120, z: -60, label: 'Paket kurir' },
  packageDrop: { x: 120, z: 120, label: 'Titik antar' },
  debts: [
    { x: -60, z: 120, label: 'Utang 1 — Kios Bara', pay: 120 },
    { x: 60, z: -120, label: 'Utang 2 — Bengkel Omo', pay: 130 },
    { x: 150, z: 60, label: 'Utang 3 — Bar Lumen', pay: 150 },
  ],
  harborEscape: { x: 246, z: 30, label: 'Kapal pelabuhan' },
  thugCamp: { x: -30, z: 150, label: 'Geng Pantai' },
};
