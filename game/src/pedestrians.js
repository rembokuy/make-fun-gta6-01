// Pedestrians: simple box-built people who stroll the sidewalks, wait at
// corners, and scatter when a car or a punch comes too close. A few of
// them are mission debtors or rival crew — the missions module marks them.

import * as THREE from 'three';
import { CITY, PED_COUNT } from './config.js';
import { collideBuildings } from './city.js';

const SHIRTS = [0xe8a87c, 0x7fb5a3, 0xd96c5f, 0x9bb8d3, 0xf7c948, 0x8a5fb0, 0xf5f0e6];
const SKINS = [0xf2c9a0, 0xc98a5e, 0x8a5a3a, 0xf7d7b5];

export function makePedMesh(rng) {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: rng.pick(SKINS) });
  const shirt = new THREE.MeshLambertMaterial({ color: rng.pick(SHIRTS) });
  const pants = new THREE.MeshLambertMaterial({ color: rng.pick([0x2b3a55, 0x3a3f46, 0x5a4632]) });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.75, 0.26), pants);
  legs.position.y = 0.38;
  group.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.62, 0.3), shirt);
  torso.position.y = 1.06;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.34), skin);
  head.position.y = 1.56;
  head.castShadow = true;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.36), new THREE.MeshLambertMaterial({ color: rng.pick([0x1c2733, 0x5a4632, 0x8a6b4a]) }));
  hair.position.y = 1.78;
  group.add(hair);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.55, 0.13), shirt);
  armL.position.set(-0.35, 1.05, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.35;
  group.add(armR);
  group.userData.armL = armL;
  group.userData.armR = armR;
  return group;
}

function sidewalkPoint(rng) {
  const line = rng.pick([-150, -75, 0, 75, 150]);
  const along = rng.range(-170, 170);
  const side = rng.next() < 0.5 ? -8.6 : 8.6;
  if (rng.next() < 0.5) return { x: along, z: line + side };
  return { x: line + side, z: along };
}

export function createPedestrians(scene, rng) {
  const peds = [];
  for (let i = 0; i < PED_COUNT; i++) {
    const spot = sidewalkPoint(rng);
    const mesh = makePedMesh(rng);
    scene.add(mesh);
    peds.push({
      mesh,
      pos: { x: spot.x, z: spot.z },
      heading: rng.range(0, Math.PI * 2),
      speed: rng.range(1.1, 1.9),
      walkPhase: rng.range(0, Math.PI * 2),
      state: 'walk', // walk | flee | down | debtor | guard
      timer: rng.range(0, 6),
      health: 100,
      role: null,
    });
  }
  return peds;
}

export function updatePedestrians(peds, dt, colliders, threats) {
  for (const ped of peds) {
    if (ped.state === 'down') {
      ped.mesh.rotation.x = Math.max(-Math.PI / 2, ped.mesh.rotation.x - dt * 3);
      continue;
    }
    ped.mesh.rotation.x = 0;
    let speed = ped.speed;
    if (ped.role === 'debtor' && !ped.collected) {
      // Debtors wait at their spot until Rae collects them.
      speed = 0;
    } else if (ped.state === 'flee') {
      speed = 4.2;
      ped.timer -= dt;
      if (ped.timer <= 0) ped.state = 'walk';
    } else {
      // Flee from the nearest threat (a fast car or a recent punch).
      for (const t of threats) {
        const dx = ped.pos.x - t.x;
        const dz = ped.pos.z - t.z;
        const d = Math.hypot(dx, dz);
        if (d < 7 && t.danger > 0) {
          ped.state = 'flee';
          ped.timer = 3;
          ped.heading = Math.atan2(dx, dz);
          break;
        }
      }
      ped.timer -= dt;
      if (ped.timer <= 0) {
        ped.timer = rngPickTurn();
        ped.heading += (Math.random() - 0.5) * 1.6;
      }
    }
    // Guards are steered by combat.js (they walk up to Rae and punch);
    // the crowd system only syncs their mesh, never moves them.
    if (ped.role !== 'guard') {
      ped.pos.x += Math.sin(ped.heading) * speed * dt;
      ped.pos.z += Math.cos(ped.heading) * speed * dt;
      collideBuildings(colliders, ped.pos, 0.5);
      ped.pos.x = Math.max(-192, Math.min(192, ped.pos.x));
      ped.pos.z = Math.max(-192, Math.min(192, ped.pos.z));
    }
    ped.walkPhase += dt * speed * 3.2;
    const swing = Math.sin(ped.walkPhase) * 0.5;
    ped.mesh.userData.armL.rotation.x = swing;
    ped.mesh.userData.armR.rotation.x = -swing;
    ped.mesh.position.set(ped.pos.x, 0, ped.pos.z);
    ped.mesh.rotation.y = ped.heading;
  }
}

let turnSeed = 4;
function rngPickTurn() {
  // Small deterministic-ish turn timer; gameplay only, not the shot scenes.
  turnSeed = (turnSeed * 16807) % 2147483647;
  return 3 + (turnSeed % 5000) / 1000;
}

export function pedDistance(a, b) {
  return Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
}
