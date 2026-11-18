// Traffic: mobil AI yang melaju di grid jalan sesuai lajur, berbelok di
// persimpangan, dan melambat untuk mobil di depannya. Mobil parkir adalah
// yang bisa dicuri pemain — mereka diam di tepi jalan tanpa sopir.
// Saat Rush Hour, modul ini menambah mobil sampai kepadatan tiga kali lipat
// dan menariknya kembali saat event selesai.

import { CITY, ROAD_LINES, RUSH_TRAFFIC_BONUS, TRAFFIC_COUNT } from './game-config.js';
import { buildCarMesh, driveCar, newCar, randomPaint, syncCar } from './driveable-vehicles.js';

function randomRoadSpot(rng) {
  const horizontal = rng.next() < 0.5;
  const line = rng.pick(ROAD_LINES);
  const along = rng.range(-170, 170);
  const lane = rng.next() < 0.5 ? -CITY.laneOffset : CITY.laneOffset;
  if (horizontal) return { x: along, z: line + lane, heading: lane > 0 ? Math.PI / 2 : -Math.PI / 2, horizontal };
  return { x: line + lane, z: along, heading: lane > 0 ? Math.PI : 0, horizontal };
}

function spawnMovingCar(scene, rng, driver) {
  const spot = randomRoadSpot(rng);
  const taxi = rng.next() < 0.12;
  const mesh = buildCarMesh(taxi ? 0xf7c948 : randomPaint(rng), taxi ? { taxi: true } : {});
  scene.add(mesh);
  const car = newCar(mesh, spot.x, spot.z, spot.heading, driver);
  car.speed = rng.range(7, 12);
  car.horizontal = spot.horizontal;
  car.cruise = car.speed;
  syncCar(car);
  return car;
}

export function spawnStreetTraffic(scene, rng) {
  const cars = [];
  for (let i = 0; i < TRAFFIC_COUNT; i++) cars.push(spawnMovingCar(scene, rng, 'traffic'));
  // Mobil parkir yang bisa dicuri, di tepi jalan.
  const parked = [];
  for (let i = 0; i < 8; i++) {
    const spot = randomRoadSpot(rng);
    const mesh = buildCarMesh(randomPaint(rng));
    scene.add(mesh);
    const car = newCar(
      mesh,
      spot.x + (spot.horizontal ? 0 : 5.4),
      spot.z + (spot.horizontal ? 5.4 : 0),
      spot.heading,
      null,
    );
    parked.push(car);
    syncCar(car);
  }
  return { cars, parked, extras: [] };
}

// Tambah mobil ekstra untuk Rush Hour. Mengembalikan jumlah yang ditambah.
export function addRushTraffic(scene, rng, traffic) {
  let added = 0;
  for (let i = 0; i < RUSH_TRAFFIC_BONUS; i++) {
    const car = spawnMovingCar(scene, rng, 'traffic');
    traffic.cars.push(car);
    traffic.extras.push(car);
    added += 1;
  }
  return added;
}

// Tarik kembali mobil ekstra Rush Hour (sisanya tetap berjalan normal).
export function removeRushTraffic(scene, traffic) {
  for (const car of traffic.extras) {
    const idx = traffic.cars.indexOf(car);
    if (idx >= 0) traffic.cars.splice(idx, 1);
    scene.remove(car.mesh);
  }
  traffic.extras.length = 0;
}

function nearestAhead(self, cars) {
  let best = Infinity;
  for (const other of cars) {
    if (other === self) continue;
    const dx = other.pos.x - self.pos.x;
    const dz = other.pos.z - self.pos.z;
    const forward = Math.sin(self.heading) * dx + Math.cos(self.heading) * dz;
    const side = Math.abs(Math.cos(self.heading) * dx - Math.sin(self.heading) * dz);
    if (forward > 0 && forward < 14 && side < 2.4) best = Math.min(best, forward);
  }
  return best;
}

export function stepTraffic(traffic, dt, rng, roadblocks = []) {
  for (const car of traffic.cars) {
    // Berhenti sebelum barikade Rush Hour yang ada di depan.
    let blocked = false;
    for (const block of roadblocks) {
      const dx = block.x - car.pos.x;
      const dz = block.z - car.pos.z;
      const forward = Math.sin(car.heading) * dx + Math.cos(car.heading) * dz;
      const side = Math.abs(Math.cos(car.heading) * dx - Math.sin(car.heading) * dz);
      if (forward > 0 && forward < 11 && side < 3.4) {
        blocked = true;
        break;
      }
    }
    // Di persimpangan, kadang berbelok ke jalan yang memotong.
    const onLineX = Math.abs(car.pos.x - Math.round(car.pos.x / 75) * 75) < 1.2;
    const onLineZ = Math.abs(car.pos.z - Math.round(car.pos.z / 75) * 75) < 1.2;
    if (car.horizontal ? onLineX : onLineZ) {
      if (rng.next() < 0.002) {
        car.horizontal = !car.horizontal;
        car.heading = car.horizontal
          ? (rng.next() < 0.5 ? Math.PI / 2 : -Math.PI / 2)
          : (rng.next() < 0.5 ? Math.PI : 0);
      }
    }
    // Bungkus di tepi kota supaya traffic tidak pernah habis.
    if (car.pos.x > 185) car.pos.x = -185;
    if (car.pos.x < -185) car.pos.x = 185;
    if (car.pos.z > 185) car.pos.z = -185;
    if (car.pos.z < -185) car.pos.z = 185;

    const ahead = nearestAhead(car, traffic.cars);
    const want = blocked
      ? 0
      : ahead < 12
        ? Math.max(0, (ahead - 6) / 6) * car.cruise
        : car.cruise;
    const throttle = car.speed < want ? 0.6 : 0;
    // Koreksi kembali ke tengah lajur saat melayang.
    const line = Math.round((car.horizontal ? car.pos.z : car.pos.x) / 75) * 75;
    const off = (car.horizontal ? car.pos.z : car.pos.x) - line;
    const laneSteer = Math.max(-0.4, Math.min(0.4, -off * 0.05));
    driveCar(
      car,
      throttle,
      car.horizontal ? laneSteer * Math.sign(Math.sin(car.heading)) : laneSteer * Math.sign(Math.cos(car.heading)),
      dt,
      null,
    );
    car.speed = Math.max(0, car.speed);
  }
}
