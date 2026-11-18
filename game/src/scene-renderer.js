// SOLMARINA — the three.js renderer: one WebGL canvas, a sun-soaked sky,
// hemisphere + directional light, and the chase camera that follows Rae on
// foot or behind the wheel. Shot mode pins the camera for a fixed frame.

import * as THREE from 'three';
import { CONFIG } from './game-config.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CONFIG.colors.sky);
  scene.fog = new THREE.Fog(CONFIG.colors.sky, 260, 620);

  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6a7a55, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(CONFIG.colors.sun, 1.6);
  sun.position.set(120, 180, 60);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(0, 26, 46);

  let shotCamera = null;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  const api = {
    renderer,
    scene,
    camera,
    resize,

    // Follow the target from behind: higher and further back in a car.
    follow(target, dt) {
      if (shotCamera) return;
      const behind = target.inVehicle ? 15 : 10;
      const height = target.inVehicle ? 6.5 : 5;
      const hx = Math.sin(target.heading) * -1;
      const hz = Math.cos(target.heading) * -1;
      const wantX = target.x + hx * behind;
      const wantZ = target.z + hz * behind;
      const k = 1 - Math.pow(0.0001, dt);
      camera.position.x += (wantX - camera.position.x) * k;
      camera.position.y += (target.y + height - camera.position.y) * k;
      camera.position.z += (wantZ - camera.position.z) * k;
      camera.lookAt(target.x, target.y + 1.6, target.z);
    },

    // Pin the camera for a staged screenshot; null releases it.
    pinCamera(position, lookAt) {
      if (!position) {
        shotCamera = null;
        return;
      }
      shotCamera = { position, lookAt };
      camera.position.set(position.x, position.y, position.z);
      camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    },

    render() {
      renderer.render(scene, camera);
    },
  };

  return api;
}
