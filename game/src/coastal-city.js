// SOLMARINA — the visible city: ground, roads, buildings, the Glass Tower,
// beach, ocean and harbour. All meshes come from the world plan, so the city
// on screen is exactly the city the systems simulate.

import * as THREE from 'three';
import { CONFIG } from './game-config.js';

function lambert(color, extra = {}) {
  return new THREE.MeshLambertMaterial({ color, ...extra });
}

function box(w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
  mesh.position.set(x, y, z);
  return mesh;
}

export function buildCoastalCity(scene, world, rng) {
  const group = new THREE.Group();
  group.name = 'coastal-city';
  const W = CONFIG.world;

  // Grass base, then sand and ocean to the south.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    lambert(CONFIG.colors.ground),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(40, 0, 20);
  group.add(ground);

  const sand = new THREE.Mesh(new THREE.PlaneGeometry(900, 60), lambert(CONFIG.colors.sand));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(40, 0.05, W.beachZ + 26);
  group.add(sand);

  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(900, 220), lambert(CONFIG.colors.ocean));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(40, 0.02, W.oceanZ + 110);
  ocean.name = 'ocean';
  group.add(ocean);

  // Harbour water and concrete docks on the east side.
  const harbourWater = new THREE.Mesh(new THREE.PlaneGeometry(140, 220), lambert(0x2a6f8e));
  harbourWater.rotation.x = -Math.PI / 2;
  harbourWater.position.set(300, 0.02, 30);
  group.add(harbourWater);
  group.add(box(90, 1.2, 200, 0x8a8f96, 232, 0.6, 30));

  // Roads: dark strips both ways, with pale sidewalks hugging them.
  for (const r of W.roads) {
    const alongX = new THREE.Mesh(new THREE.PlaneGeometry(560, W.roadWidth), lambert(CONFIG.colors.road));
    alongX.rotation.x = -Math.PI / 2;
    alongX.position.set(40, 0.1, r);
    group.add(alongX);
    const alongZ = new THREE.Mesh(new THREE.PlaneGeometry(W.roadWidth, 560), lambert(CONFIG.colors.road));
    alongZ.rotation.x = -Math.PI / 2;
    alongZ.position.set(r, 0.1, 20);
    group.add(alongZ);
    const walkX = new THREE.Mesh(new THREE.PlaneGeometry(560, 3.4), lambert(CONFIG.colors.sidewalk));
    walkX.rotation.x = -Math.PI / 2;
    walkX.position.set(40, 0.12, r + W.roadWidth / 2 + 2.4);
    group.add(walkX);
    const walkZ = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 560), lambert(CONFIG.colors.sidewalk));
    walkZ.rotation.x = -Math.PI / 2;
    walkZ.position.set(r + W.roadWidth / 2 + 2.4, 0.12, 20);
    group.add(walkZ);
  }

  // Buildings: coloured boxes with a darker roof slab and lit window strips.
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const b of world.buildings) {
    const body = box(b.w, b.h, b.d, b.color, b.x, b.h / 2, b.z);
    group.add(body);
    group.add(box(b.w + 0.6, 1, b.d + 0.6, b.roof, b.x, b.h + 0.5, b.z));
    const floors = Math.max(1, Math.floor(b.h / 7));
    for (let f = 0; f < floors; f++) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(b.w * 0.7, 1.1), windowMat);
      strip.position.set(b.x, 3 + f * 7, b.z + b.d / 2 + 0.06);
      group.add(strip);
    }
  }

  // Landmark: the Glass Tower, tall and pale blue, visible from everywhere.
  const t = world.tower;
  const towerMat = new THREE.MeshPhongMaterial({
    color: 0x9fd8ef, shininess: 90, specular: 0xffffff, transparent: true, opacity: 0.92,
  });
  const towerMesh = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), towerMat);
  towerMesh.position.set(t.x, t.h / 2, t.z);
  towerMesh.name = 'glass-tower';
  group.add(towerMesh);
  group.add(box(t.w + 4, 2, t.d + 4, 0x2b3a4a, t.x, t.h + 1, t.z));
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff4444 }),
  );
  beacon.position.set(t.x, t.h + 4, t.z);
  beacon.name = 'tower-beacon';
  group.add(beacon);

  // Harbour containers and two cranes.
  for (const c of world.containers) {
    group.add(box(12, 2.6, 2.6, c.color, c.x, 1.3, c.z));
    if (c.stacked) group.add(box(12, 2.6, 2.6, c.color, c.x, 3.9, c.z));
  }
  for (const cz of [-20, 80]) {
    group.add(box(3, 26, 3, 0xd8b13a, 222, 13, cz));
    group.add(box(22, 2.5, 2.5, 0xd8b13a, 232, 25, cz));
  }

  // Palms: trunk plus a flat green crown.
  for (const p of world.palms) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.5, 7, 6),
      lambert(0x8a6a42),
    );
    trunk.position.set(p.x, 3.5, p.z);
    group.add(trunk);
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(3.2, 3.4, 7),
      lambert(0x2f8f4e),
    );
    crown.position.set(p.x, 8.2, p.z);
    group.add(crown);
  }

  // Street lamps along the main avenues.
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const r of W.roads) {
    for (let s = -150; s <= 150; s += 60) {
      group.add(box(0.4, 7, 0.4, 0x3a3f46, r + 8, 3.5, s));
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), lampMat);
      bulb.position.set(r + 8, 7.2, s);
      group.add(bulb);
    }
  }

  // A few soft clouds drifting far above the city.
  const clouds = [];
  for (let i = 0; i < 8; i++) {
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(rng.range(9, 16), 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }),
    );
    cloud.scale.y = 0.35;
    cloud.position.set(rng.range(-220, 260), rng.range(70, 95), rng.range(-220, 220));
    cloud.userData.drift = rng.range(0.4, 1.1);
    clouds.push(cloud);
    group.add(cloud);
  }

  scene.add(group);

  return {
    group,
    tower: towerMesh,
    ocean,
    update(dt, simTime) {
      // Gentle ocean shimmer and slow cloud drift; both driven by sim time,
      // so a staged shot renders the same frame every run.
      ocean.material.color.setHSL(0.55, 0.62, 0.36 + 0.02 * Math.sin(simTime * 0.4));
      for (const c of clouds) {
        c.position.x += c.userData.drift * dt;
        if (c.position.x > 300) c.position.x = -260;
      }
    },
  };
}
