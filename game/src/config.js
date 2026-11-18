// SOLMARINA — every tuning number and colour in one place.
// The city is a 400x400 metre grid: roads every 75 m, blocks of buildings
// between them, a beach and ocean along the west edge. The simulation runs
// in fixed 1/60 s steps, so no rule below depends on the frame rate.

export const STEP = 1 / 60;

export const CITY = {
  half: 200, // ground extends -200..200 on x and z
  roadEvery: 75, // road centre lines at -150, -75, 0, 75, 150
  roadWidth: 12,
  laneOffset: 3,
  beachX: -178, // sand strip west of this x
  oceanX: -196, // water starts here
};

export const PLAYER = {
  walkSpeed: 6.5,
  runSpeed: 10,
  radius: 0.55,
  health: 100,
  punchRange: 2.2,
  punchDamage: 25,
  punchCooldown: 0.45,
};

export const CAR = {
  accel: 22,
  brake: 34,
  reverseAccel: 12,
  maxSpeed: 38,
  maxReverse: 10,
  steer: 1.9,
  drag: 0.35,
  radius: 2.1,
};

export const TRAFFIC_COUNT = 14;
export const PED_COUNT = 26;
export const COP_MAX = 5;

export const WANTED = {
  decayDelay: 12, // seconds without a crime before the level starts falling
  decayEvery: 9, // seconds per level lost while hidden
  stealCar: 1,
  hitPed: 1,
  shoot: 2,
  max: 5,
};

export const SAVE_KEY = 'solmarina.save.v1';

export const PALETTE = {
  sky: 0x8ec9e8,
  fog: 0xa8d4e8,
  sun: 0xfff1c9,
  ground: 0x9a938a,
  road: 0x3a3f46,
  roadLine: 0xf5d76e,
  sidewalk: 0xcfc8bd,
  sand: 0xe8d29a,
  ocean: 0x2e7fa8,
  building: [0xf2e3c6, 0xe8a87c, 0x7fb5a3, 0xd96c5f, 0xf5f0e6, 0x9bb8d3, 0xe0cfa8, 0xc98a6b],
  windowLit: 0xffe9a8,
  windowDark: 0x2c3e50,
  palmTrunk: 0x8a6b4a,
  palmLeaf: 0x3e9e5a,
  playerShirt: 0xff5a3c,
  playerPants: 0x2b3a55,
  copCar: 0x1c2733,
  copLight: 0xff2a2a,
  taxi: 0xf7c948,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
