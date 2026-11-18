// SOLMARINA — screenshot staging. Each ?shot= scene is built from fixed
// positions on the seeded city, rendered once, and then frozen: no sim time
// advances, so the same shot renders byte-identical on every run.

import { CONFIG } from './game-config.js';

function resetStage(G) {
  G.rng.reseed(CONFIG.seed);
  G.missions.reset();
  G.wanted.clear();
  G.rush.reset();
  G.crowd.reset();
  G.traffic.reset(CONFIG.traffic.base);
  if (G.player.inVehicle) G.player.exitVehicle();
  G.player.heal(CONFIG.player.health);
  G.effects.hideWaypoint();
  G.renderer.pinCamera(null);
  G.state = 'shot';
  G.simTime = 0;
}

function placePolice(G, spots, heading) {
  G.wanted.heat = 160;
  G.wanted.level = 5;
  for (let i = 0; i < spots.length && i < G.wanted.cruisers.length; i++) {
    const c = G.wanted.cruisers[i];
    c.active = true;
    c.x = spots[i].x;
    c.z = spots[i].z;
    c.heading = heading;
    c.speed = 24;
    c.mesh.visible = true;
    c.mesh.position.set(c.x, 0, c.z);
    c.mesh.rotation.y = heading;
  }
}

function placeTrafficLine(G, road, xs, heading) {
  for (let i = 0; i < xs.length && i < G.traffic.cars.length; i++) {
    const car = G.traffic.cars[i];
    car.x = xs[i].x;
    car.z = xs[i].z;
    car.heading = heading;
    car.axis = 'x';
    car.speed = 10;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = heading;
  }
  void road;
}

function drivePlayer(G, x, z, heading) {
  const car = G.vehicles.cars[0];
  car.parked = false;
  car.stolen = true;
  car.x = x;
  car.z = z;
  car.heading = heading;
  car.speed = 18;
  car.mesh.position.set(x, 0, z);
  car.mesh.rotation.y = heading;
  G.player.teleport(x, z, heading);
  G.player.enterVehicle(car);
  return car;
}

function finishShot(G, name) {
  G.shotName = name;
  G.hud.update(G.buildHudState());
  G.renderer.render();
  window.__shotReady = true;
}

export function stageShot(G, name) {
  resetStage(G);

  if (name === 'chase') {
    // Rush Hour chase: 42 cars, 3 roadblocks, 5 wanted stars, cruisers tight.
    G.rush.forceStart();
    G.traffic.reset(CONFIG.traffic.rush);
    const car = drivePlayer(G, -30, 120, Math.PI / 2);
    void car;
    placeTrafficLine(G, 120, [
      { x: -8, z: 117 }, { x: 2, z: 123 }, { x: 16, z: 117 },
      { x: 32, z: 123 }, { x: 48, z: 117 }, { x: -18, z: 123 },
    ], Math.PI / 2);
    placePolice(G, [
      { x: -48, z: 124 }, { x: -56, z: 117 }, { x: -66, z: 122 },
    ], Math.PI / 2);
    const blocks = G.rush.roadblocks;
    if (blocks[0]) {
      blocks[0].x = 6;
      blocks[0].z = 120;
      blocks[0].mesh.position.set(6, 0, 120);
      blocks[0].mesh.rotation.y = Math.PI / 2;
    }
    if (blocks[1]) {
      blocks[1].x = 44;
      blocks[1].z = 120;
      blocks[1].mesh.position.set(44, 0, 120);
      blocks[1].mesh.rotation.y = Math.PI / 2;
    }
    if (blocks[2]) {
      blocks[2].x = 18;
      blocks[2].z = 60;
      blocks[2].mesh.position.set(18, 0, 60);
      blocks[2].mesh.rotation.y = 0;
    }
    G.crowd.scare(-30, 120, 60);
    G.renderer.pinCamera({ x: -72, y: 10, z: 140 }, { x: 0, y: 2, z: 118 });
    G.hud.toast('RUSH HOUR — 5★ — lolos dari kejaran!', 30);
  } else if (name === 'walk') {
    // Rae on foot on the beach promenade, crowd around, tower up the coast.
    // x = 40 threads the camera between two promenade palms.
    G.player.teleport(40, 195, Math.PI);
    for (let i = 0; i < 8 && i < G.crowd.walkers.length; i++) {
      const w = G.crowd.walkers[i];
      w.x = 28 + i * 4;
      w.z = 192 + (i % 3) * 4;
      w.heading = Math.PI;
      w.mesh.position.set(w.x, 0, w.z);
      w.mesh.rotation.y = w.heading;
    }
    G.renderer.pinCamera({ x: 40, y: 7, z: 212 }, { x: 80, y: 2, z: 130 });
  } else if (name === 'drive') {
    // Rae driving the coast road, ocean on the right, traffic ahead.
    drivePlayer(G, -80, 180, Math.PI / 2);
    placeTrafficLine(G, 180, [
      { x: -48, z: 177 }, { x: -28, z: 183 }, { x: -6, z: 177 }, { x: 16, z: 183 },
    ], Math.PI / 2);
    G.renderer.pinCamera({ x: -102, y: 8, z: 180 }, { x: -20, y: 2, z: 180 });
  } else {
    // Mission: Rae carries the courier package to the southern drop-off,
    // the waypoint beam burning gold ahead of her.
    G.missions.index = 0;
    G.missions.step = 1;
    G.missions.hasPackage = true;
    G.missions.story = 'Paket di tangan. Jangan berhenti — antar ke selatan.';
    G.missions.refreshObjective();
    G.player.teleport(102, 120, Math.PI / 2);
    const drop = G.world.spots.packageDrop;
    G.effects.setWaypoint(drop.x, drop.z);
    for (let i = 0; i < 2 && i < G.combat.thugs.length; i++) {
      const t = G.combat.thugs[i];
      t.x = 114 + i * 10;
      t.z = 112 + i * 12;
      t.mesh.position.set(t.x, 0, t.z);
    }
    G.renderer.pinCamera({ x: 88, y: 5.5, z: 120 }, { x: 122, y: 2, z: 120 });
  }

  G.hud.showStart(false);
  finishShot(G, name);
  return name;
}
