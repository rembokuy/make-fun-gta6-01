// Traffic: AI cars that cruise the road grid in their lane, turn at
// intersections, and slow down for the car ahead. Parked cars are the
// ones the player can steal — they sit along the kerb with no driver.

import { CITY, TRAFFIC_COUNT } from './config.js';
import { createCar, driveCar, makeCarMesh, randomCarColor, syncCarMesh } from './vehicles.js';

const ROAD_LINES = [-150, -75, 0, 75, 150];

function randomRoadPoint(rng) {
  const horizontal = rng.next() < 0.5;
  const line = rng.pick(ROAD_LINES);
  const along = rng.range(-170, 170);
  const lane = rng.next() < 0.5 ? -CITY.laneOffset : CITY.laneOffset;
  if (horizontal) return { x: along, z: line + lane, heading: lane > 0 ? Math.PI / 2 : -Math.PI / 2, horizontal };
  return { x: line + lane, z: along, heading: lane > 0 ? Math.PI : 0, horizontal };
}

export function createTraffic(scene, rng) {
  const cars = [];
  for (let i = 0; i < TRAFFIC_COUNT; i++) {
    const spot = randomRoadPoint(rng);
    const mesh = makeCarMesh(randomCarColor(rng));
    mesh.userData.color = mesh.material?.color;
    scene.add(mesh);
    const car = createCar(mesh, spot.x, spot.z, spot.heading, 'traffic');
    car.speed = rng.range(7, 12);
    car.horizontal = spot.horizontal;
    car.cruise = car.speed;
    cars.push(car);
    syncCarMesh(car);
  }
  // Parked, stealable cars along the kerbs.
  const parked = [];
  for (let i = 0; i < 8; i++) {
    const spot = randomRoadPoint(rng);
    const mesh = makeCarMesh(randomCarColor(rng));
    scene.add(mesh);
    const car = createCar(mesh, spot.x + (spot.horizontal ? 0 : 5.4), spot.z + (spot.horizontal ? 5.4 : 0), spot.heading, null);
    parked.push(car);
    syncCarMesh(car);
  }
  return { cars, parked };
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

export function updateTraffic(traffic, dt, colliders) {
  for (const car of traffic.cars) {
    // At an intersection, sometimes turn onto the cross road.
    const onLineX = Math.abs(car.pos.x - Math.round(car.pos.x / 75) * 75) < 1.2;
    const onLineZ = Math.abs(car.pos.z - Math.round(car.pos.z / 75) * 75) < 1.2;
    if (car.horizontal ? onLineX : onLineZ) {
      if (Math.random() < 0.002) {
        car.horizontal = !car.horizontal;
        car.heading = car.horizontal
          ? (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2)
          : (Math.random() < 0.5 ? Math.PI : 0);
      }
    }
    // Wrap around the city edge so traffic never runs out.
    if (car.pos.x > 185) car.pos.x = -185;
    if (car.pos.x < -185) car.pos.x = 185;
    if (car.pos.z > 185) car.pos.z = -185;
    if (car.pos.z < -185) car.pos.z = 185;

    const ahead = nearestAhead(car, traffic.cars);
    const want = ahead < 12 ? Math.max(0, (ahead - 6) / 6) * car.cruise : car.cruise;
    const throttle = car.speed < want ? 0.6 : 0;
    const steer = 0;
    // Nudge back onto the lane centre when drifting.
    const line = Math.round((car.horizontal ? car.pos.z : car.pos.x) / 75) * 75;
    const off = (car.horizontal ? car.pos.z : car.pos.x) - line;
    const laneSteer = Math.max(-0.4, Math.min(0.4, -off * 0.05));
    driveCar(car, throttle, car.horizontal ? laneSteer * Math.sign(Math.sin(car.heading)) : laneSteer * Math.sign(Math.cos(car.heading)), dt, null);
    car.speed = Math.max(0, car.speed);
  }
}
