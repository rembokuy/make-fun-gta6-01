// Rae Marlowe jalan kaki: figur kotak berjaket merah dan topi kuning,
// dengan siklus jalan (ayunan lengan, badan naik-turun) dan pistol yang
// muncul saat menembak. Gerakan relatif terhadap kamera, jadi W selalu
// berlari menjauhi lensa.

import * as THREE from 'three';
import { PALETTE, PLAYER } from './game-config.js';
import { pushOutOfBuildings, keepInsideCity } from './coastal-city.js';

export function makePlayerMesh() {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xf2c9a0 });
  const shirt = new THREE.MeshLambertMaterial({ color: PALETTE.playerShirt });
  const pants = new THREE.MeshLambertMaterial({ color: PALETTE.playerPants });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.78, 0.28), pants);
  legs.position.y = 0.39;
  group.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.66, 0.32), shirt);
  torso.position.y = 1.1;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.36), skin);
  head.position.y = 1.62;
  head.castShadow = true;
  group.add(head);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.12, 0.4),
    new THREE.MeshLambertMaterial({ color: 0xffd34d }),
  );
  cap.position.y = 1.84;
  group.add(cap);
  const brim = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.05, 0.22),
    new THREE.MeshLambertMaterial({ color: 0xffd34d }),
  );
  brim.position.set(0, 1.8, 0.28);
  group.add(brim);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.58, 0.14), shirt);
  armL.position.set(-0.38, 1.08, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.38;
  group.add(armR);
  // Pistol, tersembunyi sampai Rae menembak.
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.42),
    new THREE.MeshLambertMaterial({ color: 0x14181d }),
  );
  gun.position.set(0.38, 1.0, 0.3);
  gun.visible = false;
  group.add(gun);
  group.userData.armL = armL;
  group.userData.armR = armR;
  group.userData.gun = gun;
  group.userData.torso = torso;
  return group;
}

// Jalan kaki. `move` adalah {x, z} di ruang dunia (sudah relatif kamera),
// `sprint` menggandakan kecepatan. Mengembalikan jarak yang ditempuh.
export function stepPlayerOnFoot(player, move, sprint, dt, colliders) {
  const speed = sprint ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const len = Math.hypot(move.x, move.z);
  if (len > 0.01) {
    const nx = move.x / len;
    const nz = move.z / len;
    player.pos.x += nx * speed * dt;
    player.pos.z += nz * speed * dt;
    player.heading = Math.atan2(nx, nz);
    player.walkPhase += dt * speed * 1.6;
  }
  pushOutOfBuildings(colliders, player.pos, PLAYER.radius);
  keepInsideCity(player.pos, 2);
  const mesh = player.mesh;
  mesh.position.set(player.pos.x, Math.abs(Math.sin(player.walkPhase)) * 0.05, player.pos.z);
  mesh.rotation.y = player.heading;
  const swing = len > 0.01 ? Math.sin(player.walkPhase) * 0.6 : 0;
  mesh.userData.armL.rotation.x = swing;
  mesh.userData.armR.rotation.x = -swing;
  return len > 0.01 ? speed * dt : 0;
}

export function setPlayerGunVisible(player, visible) {
  player.mesh.userData.gun.visible = visible;
}

// Pose kemenangan singkat: Rae mengangkat kedua lengan saat misi selesai.
export function playCelebratePose(player, seconds) {
  player.celebrateTimer = seconds;
}

export function applyCelebratePose(player, dt) {
  if (!player.celebrateTimer || player.celebrateTimer <= 0) return;
  player.celebrateTimer -= dt;
  const up = player.celebrateTimer > 0;
  player.mesh.userData.armL.rotation.x = up ? -2.4 : 0;
  player.mesh.userData.armR.rotation.x = up ? -2.4 : 0;
}
