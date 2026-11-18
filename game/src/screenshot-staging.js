// Empat adegan screenshot di balik ?shot=chase|walk|drive|mission.
// Tiap adegan memainkan aturan sungguhan dari dunia segar selama beberapa
// detik dengan sopir naskah, lalu MENEMPATKAN ulang mobil, polisi, dan
// pejalan kaki di sekitar pemain — supaya frame selalu padat aksi dan
// seed yang sama selalu memberi frame yang sama. main.js melukis adegan
// dua kali dan menyetel window.__shotReady untuk screenshot.

import { STEP } from './game-config.js';
import { buildCarMesh, newCar, syncCar } from './driveable-vehicles.js';
import { raiseWanted, spawnCopAt } from './wanted-police.js';
import { placePed } from './sidewalk-crowd.js';
import { forcePlaceRoadblock, forceStartRushHour } from './rush-hour.js';
import { stepSolmarina } from './solmarina-world.js';

const SAMPLE = STEP;

function scriptedInput(script) {
  return {
    takeActions: () => 0,
    takeMouseDelta: () => ({ dx: 0, dy: 0 }),
    throttle: () => script.throttle ?? 0,
    steer: () => script.steer ?? 0,
    sprint: () => !!script.sprint,
    mouseDown: () => false,
    wheelDelta: () => 0,
  };
}

function driveSim(world, seconds, script) {
  const input = scriptedInput(script);
  const steps = Math.round(seconds / SAMPLE);
  for (let i = 0; i < steps; i++) stepSolmarina(world, SAMPLE, input);
}

// Melaju sampai misi aktif selesai (atau batas waktu) — lalu berhenti
// seketika, supaya langkah misi berikutnya belum sempat berjalan.
function driveUntilMissionDone(world, maxSeconds, script) {
  const input = scriptedInput(script);
  const steps = Math.round(maxSeconds / SAMPLE);
  for (let i = 0; i < steps; i++) {
    stepSolmarina(world, SAMPLE, input);
    if (world.story.index >= 1) break;
  }
}

function givePlayerCar(world, x, z, heading, speed = 0) {
  const mesh = buildCarMesh(0xd94f3d);
  world.scene.add(mesh);
  const car = newCar(mesh, x, z, heading, 'player');
  car.speed = speed;
  world.player.car = car;
  world.player.mesh.visible = false;
  world.player.pos.x = x;
  world.player.pos.z = z;
  world.player.heading = heading;
  syncCar(car);
  return car;
}

function forwardOf(x, z, heading, dist, side = 0) {
  // Titik di depan (dist) dan ke samping (side) dari sebuah posisi/arah.
  // Maju = (sin h, cos h); kanan = (cos h, -sin h).
  return {
    x: x + Math.sin(heading) * dist + Math.cos(heading) * side,
    z: z + Math.cos(heading) * dist - Math.sin(heading) * side,
  };
}

// Pindahkan mobil traffic ke-i ke titik dan arah tertentu.
function placeTrafficCar(world, index, x, z, heading, speed = 8) {
  const car = world.traffic.cars[index % world.traffic.cars.length];
  car.pos.x = x;
  car.pos.z = z;
  car.heading = heading;
  car.speed = speed;
  car.horizontal = Math.abs(Math.sin(heading)) > 0.5;
  car.cruise = Math.max(speed, 8);
  syncCar(car);
  return car;
}

function placeCop(world, x, z, heading, speed = 10) {
  const cop = spawnCopAt(world.wanted, x, z, world.player.pos);
  cop.heading = heading;
  cop.speed = speed;
  syncCar(cop);
  return cop;
}

function setCamera(world, yaw, pitch, dist) {
  world.cameraYaw = yaw;
  world.cameraPitch = pitch;
  world.cameraDist = dist;
}

function setMoney(world, money) {
  world.player.money = money;
  world.player.totalEarned = money;
}

function stageChase(world) {
  // Cover: kejar-kejaran polisi DI TENGAH Rush Hour.
  const heading = Math.PI / 2; // ke timur, menyusuri jalan z = 0
  const car = givePlayerCar(world, -10, 0, heading, 12);
  world.story.stage = 2;
  world.story.waypoint = { x: -75, z: 75 };
  world.story.objective = 'Antar paket ke Menara Kaca.';
  setMoney(world, 620);
  raiseWanted(world.wanted, 5);
  forceStartRushHour(world.rush, { scene: world.scene, rng: world.rng, traffic: world.traffic });
  driveSim(world, 2.5, { throttle: 1, steer: 0 });
  // Bingkai ulang di sekitar posisi akhir mobil pemain.
  const px = world.player.pos.x;
  const pz = world.player.pos.z;
  const ahead = forwardOf(px, pz, heading, 18);
  forcePlaceRoadblock(world.rush, ahead.x, ahead.z, Math.PI / 2);
  // Polisi: ketiganya di depan pemain (di dalam frame kamera yang
  // menghadap ke depan) — dua mengejar searah, satu menghadang head-on.
  const copA = forwardOf(px, pz, heading, 10, -6);
  const copB = forwardOf(px, pz, heading, 17, 5);
  const copC = forwardOf(px, pz, heading, 12, 0);
  placeCop(world, copA.x, copA.z, heading, 18);
  placeCop(world, copB.x, copB.z, heading, 18);
  placeCop(world, copC.x, copC.z, -heading, 14);
  // Traffic padat: tiga di depan di dua lajur, dua di jalan memotong.
  const t1 = forwardOf(px, pz, heading, 16, -3);
  const t2 = forwardOf(px, pz, heading, 22, 3);
  const t3 = forwardOf(px, pz, heading, 26, -3);
  placeTrafficCar(world, 0, t1.x, t1.z, heading, 10);
  placeTrafficCar(world, 1, t2.x, t2.z, heading, 9);
  placeTrafficCar(world, 2, t3.x, t3.z, heading, 10);
  placeTrafficCar(world, 3, px + 4, 75, 0, 9);
  placeTrafficCar(world, 4, px - 8, -75, Math.PI, 9);
  placeTrafficCar(world, 5, t2.x + 2, t2.z + 2, heading, 0);
  car.speed = 14;
  syncCar(car);
  setCamera(world, heading, 0.2, 13);
  if (world.onEvent) world.onEvent('toast', 'RUSH HOUR! Traffic ×3 — roadblock di depan. Payout +50%!');
  return 'chase';
}

function stageWalk(world) {
  // Jalan kaki di trotoar ramai: pejalan kaki di dekat, satu preman
  // tumbang (bekas combat), satu mobil polisi, dan mobil parkir siap dicuri.
  const player = world.player;
  player.pos.x = 8.6;
  player.pos.z = -66;
  player.heading = 0; // menghadap kamera (kamera di selatan)
  player.mesh.position.set(8.6, 0, -66);
  player.mesh.rotation.y = 0;
  setMoney(world, 45);
  world.story.stage = 1;
  world.story.objective = 'Ambil paket di Pasar Ikan (tanda kuning).';
  raiseWanted(world.wanted, 2);
  driveSim(world, 1, { throttle: 0, steer: 0 });
  // Kerumunan di sekitar pemain — empat orang dalam jarak 6 meter.
  placePed(world.crowd[0], 6.2, -62, Math.PI, 'walk');
  placePed(world.crowd[1], 11.4, -63.5, Math.PI / 2, 'walk');
  placePed(world.crowd[2], 5.4, -70, 0, 'walk');
  placePed(world.crowd[3], 12.2, -69, -Math.PI / 2, 'walk');
  // Satu preman tumbang tepat di depan Rae — momen combat yang terlihat.
  placePed(world.crowd[4], 8.0, -62.5, Math.PI / 2, 'down');
  world.crowd[4].mesh.rotation.x = -Math.PI / 2;
  // Polisi di jalan z = -75 dan mobil parkir siap dicuri di tepi jalan.
  placeCop(world, 3, -72, Math.PI / 2, 12);
  const parked = world.traffic.parked[0];
  parked.pos.x = 5.4;
  parked.pos.z = -72;
  parked.heading = 0;
  syncCar(parked);
  placeTrafficCar(world, 0, -14, -72, Math.PI / 2, 9);
  placeTrafficCar(world, 1, 16, -78, -Math.PI / 2, 9);
  setCamera(world, Math.PI, 0.3, 9);
  return 'walk';
}

function stageDrive(world) {
  // Menyetir di tengah traffic padat di jalan x = 0.
  const heading = 0; // ke utara (+z)
  const car = givePlayerCar(world, 0, -60, heading, 12);
  setMoney(world, 120);
  world.story.stage = 2;
  world.story.waypoint = { x: -75, z: 75 };
  world.story.objective = 'Antar paket ke Menara Kaca.';
  raiseWanted(world.wanted, 2);
  driveSim(world, 3.5, { throttle: 1, steer: 0 });
  const px = world.player.pos.x;
  const pz = world.player.pos.z;
  // Enam mobil AI terlihat: tiga di depan di dua lajur, dua di jalan
  // memotong, satu di belakang.
  const a = forwardOf(px, pz, heading, 16, -3);
  const b = forwardOf(px, pz, heading, 24, 3);
  const c = forwardOf(px, pz, heading, 32, -3);
  placeTrafficCar(world, 0, a.x, a.z, heading, 10);
  placeTrafficCar(world, 1, b.x, b.z, heading, 9);
  placeTrafficCar(world, 2, c.x, c.z, heading, 10);
  placeTrafficCar(world, 3, px + 3, 75, Math.PI / 2, 9);
  placeTrafficCar(world, 4, px - 3, 0, -Math.PI / 2, 9);
  const behind = forwardOf(px, pz, heading, -14, 3);
  placeTrafficCar(world, 5, behind.x, behind.z, heading, 11);
  // Satu polisi mengejar dari belakang.
  const copSpot = forwardOf(px, pz, heading, -22, -3);
  placeCop(world, copSpot.x, copSpot.z, heading, 20);
  car.speed = 16;
  syncCar(car);
  setCamera(world, heading, 0.2, 11);
  return 'drive';
}

function stageMission(world) {
  // Misi 1 selesai: paket sudah di tangan, melaju ke Menara Kaca —
  // lalu momen selesainya (toast + $) dengan polisi dan traffic di frame.
  world.story.stage = 2;
  world.story.waypoint = { x: -75, z: 75 };
  world.story.objective = 'Antar paket ke Menara Kaca.';
  const car = givePlayerCar(world, -75, 69, 0, 10);
  setMoney(world, 0);
  driveUntilMissionDone(world, 2, { throttle: 1, steer: 0 });
  // Setelah driveUntilMissionDone, misi 1 selesai dan toast +$250 sudah
  // terpanggil — dan langkah misi 2 belum sempat berjalan.
  // Bingkai ulang mobil di dekat Menara Kaca.
  car.pos.x = -75;
  car.pos.z = 71;
  car.heading = 0;
  car.speed = 6;
  syncCar(car);
  world.player.pos.x = -75;
  world.player.pos.z = 71;
  world.player.heading = 0;
  raiseWanted(world.wanted, 2);
  // Polisi di depan pemain (kamera menghadap ke utara): satu menghadang
  // head-on, satu mengejar dari samping.
  placeCop(world, -84, 88, Math.PI, 14);
  placeCop(world, -64, 92, Math.PI, 12);
  placeTrafficCar(world, 0, -72, 84, Math.PI, 9);
  placeTrafficCar(world, 1, -78, 60, 0, 9);
  placeTrafficCar(world, 2, -66, 75, Math.PI / 2, 8);
  placeTrafficCar(world, 3, -84, 78, -Math.PI / 2, 8);
  placePed(world.crowd[0], -70, 76, Math.PI, 'walk');
  placePed(world.crowd[1], -80, 72, 0, 'walk');
  setCamera(world, 0, 0.22, 11);
  return 'mission';
}

/**
 * Stage adegan bernama pada dunia segar dan kembalikan label untuk HUD.
 * 'chase' adalah cover: kejar-kejaran polisi saat Rush Hour, dengan
 * wanted 5 bintang, roadblock, objective misi, dan minimap sekaligus.
 */
export function stageShot(name, world) {
  if (name === 'chase') return stageChase(world);
  if (name === 'drive') return stageDrive(world);
  if (name === 'mission') return stageMission(world);
  return stageWalk(world); // 'walk' dan nama lain: jalan kaki di trotoar ramai
}
