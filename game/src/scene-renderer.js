// Renderer: satu kanvas WebGL, bayangan lembut, dan kamera third-person
// yang membuntuti Rae (atau mobilnya) pada yaw dan pitch dunia, meluncur
// ke targetnya supaya belokan terasa halus, bukan menyentak.

import * as THREE from 'three';

export function createSceneRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
  const camPos = new THREE.Vector3(0, 8, -14);
  const camTarget = new THREE.Vector3(0, 1.5, 0);

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    renderer,
    scene,
    camera,
    // Membuntuti pemain: kamera duduk di belakang yaw dunia, setinggi
    // pitch, melihat sedikit ke depan pemain.
    follow(world, dt) {
      const player = world.player;
      const yaw = world.cameraYaw;
      const dist = world.cameraDist;
      const height = 2.2 + Math.sin(world.cameraPitch) * dist;
      const back = Math.cos(world.cameraPitch) * dist;
      const tx = player.pos.x;
      const tz = player.pos.z;
      const wantX = tx - Math.sin(yaw) * back;
      const wantZ = tz - Math.cos(yaw) * back;
      const k = Math.min(1, dt * 6);
      camPos.x += (wantX - camPos.x) * k;
      camPos.y += (height - camPos.y) * k;
      camPos.z += (wantZ - camPos.z) * k;
      const lookX = tx + Math.sin(yaw) * 2;
      const lookZ = tz + Math.cos(yaw) * 2;
      camTarget.x += (lookX - camTarget.x) * Math.min(1, dt * 10);
      camTarget.y += (1.6 - camTarget.y) * Math.min(1, dt * 10);
      camTarget.z += (lookZ - camTarget.z) * Math.min(1, dt * 10);
      camera.position.copy(camPos);
      camera.lookAt(camTarget);
    },
    // Jepret kamera ke posisi ikutannya seketika — dipakai staging
    // screenshot supaya frame pertama sudah final, bukan masih meluncur.
    snap(world) {
      const player = world.player;
      const yaw = world.cameraYaw;
      const dist = world.cameraDist;
      const height = 2.2 + Math.sin(world.cameraPitch) * dist;
      const back = Math.cos(world.cameraPitch) * dist;
      camPos.set(
        player.pos.x - Math.sin(yaw) * back,
        height,
        player.pos.z - Math.cos(yaw) * back,
      );
      camTarget.set(
        player.pos.x + Math.sin(yaw) * 2,
        1.6,
        player.pos.z + Math.cos(yaw) * 2,
      );
      camera.position.copy(camPos);
      camera.lookAt(camTarget);
    },
    draw() {
      renderer.render(scene, camera);
    },
  };
}
