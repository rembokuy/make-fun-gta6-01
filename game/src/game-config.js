// SOLMARINA v2 — semua angka tuning dan warna dalam satu tempat.
// Kota 400x400 meter: jalan tiap 75 m, blok gedung di antaranya, pantai
// dan laut di tepi barat. Simulasi berjalan dengan langkah tetap 1/60 dtk,
// jadi tidak ada aturan di bawah ini yang bergantung pada frame rate.

export const STEP = 1 / 60;

export const CITY = {
  half: 200, // tanah membentang -200..200 pada x dan z
  roadEvery: 75, // garis tengah jalan di -150, -75, 0, 75, 150
  roadWidth: 12,
  laneOffset: 3,
  beachX: -178, // jalur pasir di barat garis ini
  oceanX: -196, // air mulai di sini
};

export const ROAD_LINES = [-150, -75, 0, 75, 150];

export const PLAYER = {
  walkSpeed: 6.5,
  runSpeed: 10,
  radius: 0.55,
  health: 100,
  punchRange: 2.2,
  punchDamage: 25,
  punchCooldown: 0.45,
  bustedFine: 200,
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
export const RUSH_TRAFFIC_BONUS = 28; // mobil ekstra saat Rush Hour (total 42)
export const PED_COUNT = 26;
export const COP_MAX = 5;

export const WANTED = {
  decayDelay: 12, // detik tanpa kejahatan sebelum level mulai turun
  decayEvery: 9, // detik per level yang hilang saat bersembunyi
  stealCar: 1,
  hitPed: 1,
  shoot: 2,
  max: 5,
};

// Rush Hour: event dinamis yang membuat kota mendadak padat.
// Tiap ~90 detik permainan, 45 detik jalanan jadi tiga kali lebih ramai,
// roadblock polisi muncul di persimpangan, dan semua payout misi naik 50%.
export const RUSH = {
  everySeconds: 90, // jeda antar event saat tidak aktif
  durationSeconds: 45, // lama satu event
  trafficMultiplier: 3, // kepadatan traffic selama event
  payoutMultiplier: 1.5, // bonus payout misi selama event
  roadblockCount: 3, // barikade yang muncul tiap event
  firstAtSeconds: 75, // event pertama datang lebih cepat
};

export const MISSION_TOTAL_PAYOUT = 1250; // hadiah misi 250 + 400 + 600 (di luar $120/debitur)

export const SAVE_KEY = 'solmarina.save.v2';
export const SAVE_KEY_LEGACY = 'solmarina.save.v1';

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
  copLightRed: 0xff2a2a,
  copLightBlue: 0x2a6bff,
  taxi: 0xf7c948,
  roadblockStripe: 0xff7a1a,
  rushBanner: 0xffd34d,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
