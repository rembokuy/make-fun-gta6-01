// Rae Marlowe on foot: a box-built figure in a red jacket, with a walk
// cycle (swinging arms, bobbing torso) and a pistol that appears when
// shooting. Movement is relative to the camera, so W always runs away
// from the lens.

import * as THREE from 'three';
import { PALETTE, PLAYER } from './config.js';
import { collideBuildings, clampToCity } from './city.js';

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
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.4), new THREE.MeshLambertMaterial({ color: 0xffd34d }));
  cap.position.y = 1.84;
  group.add(cap);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.58, 0.14), shirt);
  armL.position.set(-0.38, 1.08, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.38;
  group.add(armR);
  // The pistol, hidden until Rae shoots.
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.42), new THREE.MeshLambertMaterial({ color: 0x14181d }));
  gun.position.set(0.38, 1.0, 0.3);
  gun.visible = false;
  group.add(gun);
  group.userData.armL = armL;
  group.userData.armR = armR;
  group.userData.gun = gun;
  group.userData.torso = torso;
  return group;
}

// Move on foot. `move` is {x, z} in world space (already camera-relative),
// `sprint` doubles the pace. Returns the distance moved.
export function updatePlayerOnFoot(player, move, sprint, dt, colliders) {
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
  collideBuildings(colliders, player.pos, PLAYER.radius);
  clampToCity(player.pos, 2);
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
