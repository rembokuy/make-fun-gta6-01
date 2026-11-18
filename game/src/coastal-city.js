// Solmarina sendiri: kota pantai yang terik di atas grid jalan, dibangun
// dari kotak-kotak bertekstur jendela, palem, lampu jalan, pantai, dan
// laut. Semua dihasilkan dari RNG ber-seed, jadi seed yang sama selalu
// membangun kota yang sama. Collider adalah AABB polos yang dipakai fisika.
// Modul ini juga menyediakan daftar persimpangan — dipakai Rush Hour untuk
// menaruh roadblock polisi di tempat yang masuk akal.

import * as THREE from 'three';
import { CITY, PALETTE, ROAD_LINES } from './game-config.js';

function paintFacade(baseCss, litRatio, rng) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = baseCss;
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(0,0,0,0.10)';
  g.fillRect(0, 0, 128, 12);
  g.fillStyle = 'rgba(255,255,255,0.10)';
  g.fillRect(0, 244, 128, 12);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 4; col++) {
      g.fillStyle = rng.next() < litRatio ? '#ffe9a8' : '#2c3e50';
      g.fillRect(12 + col * 28, 22 + row * 28, 18, 18);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildPalm(rng) {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: PALETTE.palmTrunk });
  const leafMat = new THREE.MeshLambertMaterial({ color: PALETTE.palmLeaf });
  const height = rng.range(4.5, 7);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, height, 6), trunkMat);
  trunk.position.y = height / 2;
  trunk.rotation.z = rng.range(-0.08, 0.08);
  trunk.castShadow = true;
  palm.add(trunk);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 4), leafMat);
    leaf.position.y = height + 0.2;
    leaf.rotation.z = Math.PI / 2.4;
    leaf.rotation.y = (i / 6) * Math.PI * 2;
    leaf.translateY(0.9);
    palm.add(leaf);
  }
  const nut = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 6, 5),
    new THREE.MeshLambertMaterial({ color: 0x6b4a2f }),
  );
  nut.position.y = height - 0.2;
  palm.add(nut);
  return palm;
}

function buildLampPost() {
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

function buildGlassTower(rng) {
  // Menara Kaca — tujuan akhir misi 1. Satu gedung tinggi berkaca biru
  // dengan puncak menyala, supaya mudah dikenali dari jauh.
  const group = new THREE.Group();
  const glass = new THREE.MeshLambertMaterial({ color: 0x7fb8d9 });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(24, 58, 24), glass);
  tower.position.y = 29;
  tower.castShadow = true;
  group.add(tower);
  for (let floor = 0; floor < 10; floor++) {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(24.4, 0.5, 24.4),
      new THREE.MeshBasicMaterial({ color: rng.next() < 0.5 ? 0xffe9a8 : 0x2c3e50 }),
    );
    band.position.y = 6 + floor * 5.2;
    group.add(band);
  }
  const beacon = new THREE.Mesh(
    new THREE.BoxGeometry(3, 2, 3),
    new THREE.MeshBasicMaterial({ color: 0xffd34d }),
  );
  beacon.position.y = 59;
  group.add(beacon);
  group.position.set(-112.5, 0, 112.5);
  return group;
}

export function buildCoastalCity(scene, rng) {
  const colliders = [];
  const intersections = [];
  for (const x of ROAD_LINES) for (const z of ROAD_LINES) intersections.push({ x, z });

  // Langit, kabut, dan matahari sore yang rendah.
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

  // Tanah: satu lempeng besar, lalu pasir dan laut di tepi barat.
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

  // Jalan: aspal gelap + garis tengah kuning + trotoar terang di tepinya.
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  const lineMat = new THREE.MeshBasicMaterial({ color: PALETTE.roadLine });
  for (const line of ROAD_LINES) {
    for (const horizontal of [true, false]) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(400, CITY.roadWidth), roadMat);
      strip.rotation.x = -Math.PI / 2;
      if (horizontal) strip.position.set(0, 0.03, line);
      else {
        strip.rotation.z = Math.PI / 2;
        strip.position.set(line, 0.03, 0);
      }
      strip.receiveShadow = true;
      scene.add(strip);
      // Trotoar di kedua sisi jalan.
      for (const side of [-1, 1]) {
        const walk = new THREE.Mesh(new THREE.PlaneGeometry(400, 3.4), walkMat);
        walk.rotation.x = -Math.PI / 2;
        if (horizontal) walk.position.set(0, 0.04, line + side * 7.7);
        else {
          walk.rotation.z = Math.PI / 2;
          walk.position.set(line + side * 7.7, 0.04, 0);
        }
        walk.receiveShadow = true;
        scene.add(walk);
      }
      // Garis tengah putus-putus.
      for (let t = -190; t < 190; t += 12) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.5), lineMat);
        dash.rotation.x = -Math.PI / 2;
        if (horizontal) dash.position.set(t, 0.05, line);
        else {
          dash.rotation.z = Math.PI / 2;
          dash.position.set(line, 0.05, t);
        }
        scene.add(dash);
      }
    }
  }

  // Gedung: 1-3 kotak per blok, fasad bertekstur jendela, atap kontras.
  const facadeCache = PALETTE.building.map((hex) => {
    const css = `#${hex.toString(16).padStart(6, '0')}`;
    return paintFacade(css, 0.35, rng);
  });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const roofColors = [0xd96c5f, 0x7fb5a3, 0x5a6b7c, 0xe8a87c];
  for (let bx = 0; bx < 4; bx++) {
    for (let bz = 0; bz < 4; bz++) {
      const cx = -112.5 + bx * 75;
      const cz = -112.5 + bz * 75;
      const count = rng.int(1, 3);
      for (let k = 0; k < count; k++) {
        const w = rng.range(16, 30);
        const d = rng.range(16, 30);
        const h = rng.range(8, 42);
        const x = cx + rng.range(-14, 14);
        const z = cz + rng.range(-14, 14);
        if (x < CITY.beachX + 16) continue; // pantai tetap kosong
        // Menara Kaca punya lahannya sendiri di (-112.5, 112.5): jangan tutupi.
        if (Math.abs(x + 112.5) < 22 && Math.abs(z - 112.5) < 22) continue;
        const mat = new THREE.MeshLambertMaterial({ map: facadeCache[rng.int(0, facadeCache.length - 1)] });
        const mesh = new THREE.Mesh(boxGeo, mat);
        mesh.scale.set(w, h, d);
        mesh.position.set(x, h / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6),
          new THREE.MeshLambertMaterial({ color: rng.pick(roofColors) }),
        );
        roof.position.set(x, h + 0.25, z);
        scene.add(roof);
      }
    }
  }

  // Menara Kaca + Pasar Ikan (tujuan misi 1).
  const tower = buildGlassTower(rng);
  scene.add(tower);
  colliders.push({ minX: -124.5, maxX: -100.5, minZ: 100.5, maxZ: 124.5 });
  const market = new THREE.Group();
  const stallMat = new THREE.MeshLambertMaterial({ color: 0xe8a87c });
  for (let i = 0; i < 4; i++) {
    const stall = new THREE.Mesh(new THREE.BoxGeometry(5, 2.2, 3), stallMat);
    stall.position.set(75 + (i % 2) * 7, 1.1, -75 + Math.floor(i / 2) * 6);
    stall.castShadow = true;
    market.add(stall);
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.25, 3.6),
      new THREE.MeshLambertMaterial({ color: i % 2 ? 0xd96c5f : 0x7fb5a3 }),
    );
    awning.position.set(stall.position.x, 2.6, stall.position.z);
    market.add(awning);
  }
  scene.add(market);

  // Palem di sepanjang pantai dan beberapa di jalan besar.
  for (let z = -180; z <= 180; z += 18) {
    const palm = buildPalm(rng);
    palm.position.set(CITY.beachX + rng.range(-2, 4), 0, z + rng.range(-4, 4));
    scene.add(palm);
  }
  for (let i = 0; i < 24; i++) {
    const palm = buildPalm(rng);
    const road = rng.pick(ROAD_LINES);
    palm.position.set(road + (rng.next() < 0.5 ? -8.5 : 8.5), 0, rng.range(-170, 170));
    scene.add(palm);
  }

  // Lampu jalan di setiap sudut persimpangan.
  for (const x of ROAD_LINES) {
    for (const z of ROAD_LINES) {
      const light = buildLampPost();
      light.position.set(x + 7.5, 0, z + 7.5);
      light.rotation.y = rng.range(0, Math.PI * 2);
      scene.add(light);
    }
  }

  // Dermaga marina dan dua perahu di air barat.
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
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 6, 5),
      new THREE.MeshLambertMaterial({ color: 0x5a6b7c }),
    );
    mast.position.set(-214, 3.5, 40 + dz);
    scene.add(mast);
  }

  // Beacon waypoint: kolom cahaya kuning yang dipindah-pindah misi.
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

  return { colliders, beacon, roadLines: ROAD_LINES, intersections };
}

// Dorong lingkaran (x, z, radius) keluar dari setiap AABB gedung yang
// ditabraknya. Mengembalikan true bila ada dorongan.
export function pushOutOfBuildings(colliders, pos, radius) {
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
      // Titik tengah di dalam kotak: dorong keluar lewat sisi tersempit.
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

export function keepInsideCity(pos, margin) {
  const lim = CITY.half - margin;
  pos.x = Math.max(-CITY.half + margin, Math.min(lim, pos.x));
  pos.z = Math.max(-CITY.half + margin, Math.min(lim, pos.z));
}

// Persimpangan terdekat dari sebuah titik, dipakai roadblock Rush Hour.
export function nearestIntersections(city, pos, count) {
  return [...city.intersections]
    .map((p) => ({ ...p, d: Math.hypot(p.x - pos.x, p.z - pos.z) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count);
}
