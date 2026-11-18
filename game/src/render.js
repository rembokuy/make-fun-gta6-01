// The renderer: one WebGL canvas, soft shadows, and a third-person
// camera that trails behind Rae (or the car) at the world's yaw and
// pitch, easing toward its target so turns feel smooth, not snappy.

import * as THREE from 'three';

export function createRenderer(canvas) {
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
    // Follow the player: camera sits behind the world's yaw, above the
    // pitch, looking slightly ahead of the player.
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
    draw() {
      renderer.render(scene, camera);
    },
  };
}
