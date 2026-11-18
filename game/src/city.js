// Solmarina itself: a sun-soaked coastal city on a road grid, built from
// boxes with painted window textures, palm trees, streetlights, a beach
// and an ocean. Everything is generated from the seeded RNG, so the same
// seed builds the same city. Colliders are plain AABBs the physics uses.

import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';

const ROAD_LINES = [-150, -75, 0, 75, 150];

function makeWindowTexture(baseColor, litRatio, rng) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = baseColor;
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(0,0,0,0.08)';
  g.fillRect(0, 0, 128, 10);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 4; col++) {
      const lit = rng.next() < litRatio;
      g.fillStyle = lit ? '#ffe9a8' : '#2c3e50';
      g.fillRect(12 + col * 28, 22 + row * 28, 18, 18);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePalm(rng) {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: PALETTE.palmTrunk });
  const leafMat = new THREE.MeshLambertMaterial({ color: PALETTE.palmLeaf });
  const height = rng.range(4.5, 7);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, height, 6), trunkMat);
  trunk.position.y = height / 2;
  trunk.rotation.z = rng.range(-0.08, 0.08);
  palm.add(trunk);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 4), leafMat);
    leaf.position.y = height + 0.2;
    leaf.rotation.z = Math.PI / 2.4;
    leaf.rotation.y = (i / 6) * Math.PI * 2;
    leaf.translateY(0.9);
    palm.add(leaf);
  }
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), new THREE.MeshLambertMaterial({ color: 0x6b4a2f }));
  nut.position.y = height - 0.2;
  palm.add(nut);
  return palm;
}

function makeStreetlight() {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x2f3540 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.4, 6), mat);
  pole.position.y = 2.7;
  group.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), mat);
  arm.position.set(0.7, 5.35, 0);
  group.add(arm);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff6c9 }),
  );
  lamp.position.set(1.4, 5.25, 0);
  group.add(lamp);
  return group;
}

export function createCity(scene, rng) {
  const colliders = [];
  const buildingMeshes = [];

  // Sky, fog and the low afternoon sun.
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 260, 620);
  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.6);
  sun.position.set(120, 160, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -220;
  sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 220;
  sun.shadow.camera.bottom = -220;
  sun.shadow.camera.far = 500;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 1.1));

  // Ground: one big slab, then sand and ocean on the west edge.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.half * 2, CITY.half * 2),
    new THREE.MeshLambertMaterial({ color: PALETTE.ground }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(22, CITY.half * 2),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(CITY.beachX - 9, 0.02, 0);
  sand.receiveShadow = true;
  scene.add(sand);

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(120, CITY.half * 2 + 160),
    new THREE.MeshLambertMaterial({ color: PALETTE.ocean }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(CITY.oceanX - 55, 0.01, 0);
  scene.add(ocean);

  // Roads: dark strips with dashed centre lines, plus pale sidewalks.
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  const lineMat = new THREE.MeshBasicMaterial({ color: PALETTE.roadLine });
  for (const c of ROAD_LINES) {
    for (const horizontal of [true, false]) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(CITY.half * 2, CITY.roadWidth), roadMat);
      strip.rotation.x = -Math.PI / 2;
      strip.rotation.z = horizontal ? 0 : Math.PI / 2;
      strip.position.set(horizontal ? 0 : c, 0.03, horizontal ? c : 0);
      strip.receiveShadow = true;
      scene.add(strip);
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(CITY.half * 2, 3), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.rotation.z = horizontal ? 0 : Math.PI / 2;
      walk.position.set(horizontal ? 0 : c + CITY.roadWidth / 2 + 2.5, 0.04, horizontal ? c + CITY.roadWidth / 2 + 2.5 : 0);
      scene.add(walk);
      for (let d = -CITY.half + 8; d < CITY.half; d += 16) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.35), lineMat);
        dash.rotation.x = -Math.PI / 2;
        dash.rotation.z = horizontal ? 0 : Math.PI / 2;
        dash.position.set(horizontal ? d : c, 0.05, horizontal ? c : d);
        scene.add(dash);
      }
    }
  }

  // Buildings: one to three boxes per block. Block centres sit halfway
  // between the road lines (-112.5, -37.5, 37.5, 112.5), so no building
  // ever stands on a road. Heights 8–42 m, pastel walls with painted
  // windows. Each one registers an AABB collider.
  const textures = PALETTE.building.slice(0, 4).map((hex) => {
    const css = `#${hex.toString(16).padStart(6, '0')}`;
    return makeWindowTexture(css, 0.35, rng);
  });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let bx = 0; bx < 4; bx++) {
    for (let bz = 0; bz < 4; bz++) {
      const cx = -112.5 + bx * 75;
      const cz = -112.5 + bz * 75;
      const count = rng.int(1, 3);
      for (let k = 0; k < count; k++) {
        const w = rng.range(16, 30);
        const d = rng.range(16, 30);
        const h = rng.range(8, 42);
        const ox = rng.range(-14, 14);
        const oz = rng.range(-14, 14);
        const x = cx + ox;
        const z = cz + oz;
        if (x < CITY.beachX + 16) continue; // keep the beach clear
        const mat = new THREE.MeshLambertMaterial({ map: textures[rng.int(0, textures.length - 1)] });
        const mesh = new THREE.Mesh(boxGeo, mat);
        mesh.scale.set(w, h, d);
        mesh.position.set(x, h / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        buildingMeshes.push(mesh);
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
        // A flat roof cap in a contrasting colour.
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6),
          new THREE.MeshLambertMaterial({ color: rng.pick([0xd96c5f, 0x7fb5a3, 0x5a6b7c, 0xe8a87c]) }),
        );
        roof.position.set(x, h + 0.25, z);
        scene.add(roof);
      }
    }
  }

  // Palms along the beach and a few on the avenues.
  for (let z = -180; z <= 180; z += 18) {
    const palm = makePalm(rng);
    palm.position.set(CITY.beachX + rng.range(-2, 4), 0, z + rng.range(-4, 4));
    scene.add(palm);
  }
  for (let i = 0; i < 24; i++) {
    const palm = makePalm(rng);
    const road = rng.pick(ROAD_LINES);
    palm.position.set(road + (rng.next() < 0.5 ? -8.5 : 8.5), 0, rng.range(-170, 170));
    scene.add(palm);
  }

  // Streetlights at every intersection corner.
  for (const x of ROAD_LINES) {
    for (const z of ROAD_LINES) {
      const light = makeStreetlight();
      light.position.set(x + 7.5, 0, z + 7.5);
      light.rotation.y = rng.range(0, Math.PI * 2);
      scene.add(light);
    }
  }

  // The marina pier and a couple of moored boats on the west water.
  const pier = new THREE.Mesh(
    new THREE.BoxGeometry(46, 0.8, 8),
    new THREE.MeshLambertMaterial({ color: 0x8a6b4a }),
  );
  pier.position.set(-206, 0.4, 40);
  scene.add(pier);
  for (const dz of [-6, 8]) {
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(9, 1.4, 3),
      new THREE.MeshLambertMaterial({ color: 0xf5f0e6 }),
    );
    hull.position.set(-214, 0.7, 40 + dz);
    scene.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 5), new THREE.MeshLambertMaterial({ color: 0x5a6b7c }));
    mast.position.set(-214, 3.5, 40 + dz);
    scene.add(mast);
  }

  // The waypoint beacon: a tall glowing column the missions move around.
  const beacon = new THREE.Group();
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  column.position.y = 30;
  beacon.add(column);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  beacon.add(ring);
  beacon.visible = false;
  scene.add(beacon);

  return { colliders, buildingMeshes, beacon, roadLines: ROAD_LINES };
}

// Push a circle (x, z, radius) out of every building AABB it overlaps.
// Returns true when a push happened.
export function collideBuildings(colliders, pos, radius) {
  let hit = false;
  for (const b of colliders) {
    const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= radius * radius) continue;
    hit = true;
    if (d2 > 1e-6) {
      const d = Math.sqrt(d2);
      pos.x = cx + (dx / d) * radius;
      pos.z = cz + (dz / d) * radius;
    } else {
      // Centre inside the box: shove out along the smallest penetration.
      const left = pos.x - b.minX;
      const right = b.maxX - pos.x;
      const top = pos.z - b.minZ;
      const bottom = b.maxZ - pos.z;
      const m = Math.min(left, right, top, bottom);
      if (m === left) pos.x = b.minX - radius;
      else if (m === right) pos.x = b.maxX + radius;
      else if (m === top) pos.z = b.minZ - radius;
      else pos.z = b.maxZ + radius;
    }
  }
  return hit;
}

export function clampToCity(pos, margin) {
  const lim = CITY.half - margin;
  pos.x = Math.max(-CITY.half + margin, Math.min(lim, pos.x));
  pos.z = Math.max(-CITY.half + margin, Math.min(lim, pos.z));
}
