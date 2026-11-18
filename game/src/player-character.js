// SOLMARINA — Rae, the player character. On foot she walks, runs, turns and
// slides around buildings; near a car, E gets her behind the wheel, and E
// again parks it and steps out. The camera reads her pose every frame.

import * as THREE from 'three';
import { CONFIG } from './game-config.js';

export function createPlayer(scene, world) {
  const group = new THREE.Group();

  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.85, 0.32),
    new THREE.MeshLambertMaterial({ color: 0x2b3a55 }),
  );
  legs.position.y = 0.42;
  group.add(legs);
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.85, 0.38),
    new THREE.MeshLambertMaterial({ color: CONFIG.colors.raeJacket }),
  );
  torso.position.y = 1.28;
  group.add(torso);
  const armL = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.7, 0.18),
    new THREE.MeshLambertMaterial({ color: CONFIG.colors.raeJacket }),
  );
  armL.position.set(-0.44, 1.28, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.44;
  group.add(armR);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xe8b98a }),
  );
  head.position.y = 1.98;
  group.add(head);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.29, 0.1, 12),
    new THREE.MeshLambertMaterial({ color: 0x1c2733 }),
  );
  cap.position.y = 2.2;
  group.add(cap);
  scene.add(group);

  const player = {
    mesh: group,
    x: 0,
    z: 24,
    y: 0,
    heading: 0,
    speed: 0,
    health: CONFIG.player.health,
    onFoot: true,
    inVehicle: false,
    vehicle: null,
    moving: false,
    bob: 0,

    teleport(x, z, heading = 0) {
      this.x = x;
      this.z = z;
      this.heading = heading;
      if (this.vehicle) {
        this.vehicle.x = x;
        this.vehicle.z = z;
        this.vehicle.heading = heading;
        this.vehicle.mesh.position.set(x, 0, z);
        this.vehicle.mesh.rotation.y = heading;
      }
      group.position.set(x, 0, z);
      group.rotation.y = heading;
    },

    enterVehicle(car) {
      this.vehicle = car;
      this.inVehicle = true;
      this.onFoot = false;
      car.driver = this;
      group.visible = false;
    },

    exitVehicle() {
      if (!this.vehicle) return;
      const car = this.vehicle;
      car.driver = null;
      this.vehicle = null;
      this.inVehicle = false;
      this.onFoot = true;
      // Step out to the driver's side.
      this.x = car.x + Math.cos(car.heading) * 2.2;
      this.z = car.z - Math.sin(car.heading) * 2.2;
      this.heading = car.heading;
      group.visible = true;
      group.position.set(this.x, 0, this.z);
      group.rotation.y = this.heading;
    },

    hurt(amount) {
      this.health = Math.max(0, this.health - amount);
      return this.health <= 0;
    },

    heal(amount) {
      this.health = Math.min(CONFIG.player.health, this.health + amount);
    },

    update(dt, input, vehicles) {
      if (this.inVehicle) {
        group.position.set(this.x, 0, this.z);
        return;
      }
      const axes = input.axes();
      const speed = input.running() ? CONFIG.player.runSpeed : CONFIG.player.walkSpeed;
      this.moving = axes.fwd !== 0 || axes.strafe !== 0;
      if (!this.moving) {
        this.speed = 0;
        return;
      }
      // Heading turns toward the move direction; W always moves forward.
      const wantHeading = Math.atan2(axes.strafe, axes.fwd);
      let diff = wantHeading - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += Math.max(-CONFIG.player.turnSpeed * dt, Math.min(CONFIG.player.turnSpeed * dt, diff));
      this.speed = speed;
      const nx = this.x + Math.sin(this.heading) * speed * dt;
      const nz = this.z + Math.cos(this.heading) * speed * dt;
      if (!world.hitsBuilding(nx, nz, 0.8) && !world.inOcean(nx, nz)) {
        this.x = nx;
        this.z = nz;
      }
      const clamped = world.clampToCity(this.x, this.z);
      this.x = clamped.x;
      this.z = clamped.z;
      this.bob += speed * dt * 1.6;
      group.position.set(this.x, 0, this.z);
      group.rotation.y = this.heading;
      // Walk bob, driven by distance walked so it never desyncs.
      group.position.y = this.moving ? Math.abs(Math.sin(this.bob)) * 0.05 : 0;
    },
  };

  group.position.set(player.x, 0, player.z);
  return player;
}
