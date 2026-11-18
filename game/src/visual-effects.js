// SOLMARINA — visual effects: muzzle flashes, hit sparks, pickup sparkles,
// tyre smoke and the glowing waypoint beam. One small pooled set of meshes,
// no textures, everything fades on sim time.

import * as THREE from 'three';

export function createEffects(scene, rng) {
  const pool = [];
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd23e, transparent: true, opacity: 0.45, side: THREE.DoubleSide,
    }),
  );
  beam.position.y = 30;
  beam.visible = false;
  scene.add(beam);

  function spawn(kind, x, y, z) {
    let mesh = pool.find((m) => !m.visible);
    if (!mesh) {
      const geo = kind === 'flash'
        ? new THREE.SphereGeometry(0.7, 8, 6)
        : new THREE.BoxGeometry(0.35, 0.35, 0.35);
      mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
      scene.add(mesh);
      pool.push(mesh);
    }
    const colors = { flash: 0xffd23e, spark: 0xff8a3a, smoke: 0x9aa0a8, pickup: 0x7dff9a };
    mesh.material.color.setHex(colors[kind] || 0xffffff);
    mesh.material.opacity = 1;
    mesh.visible = true;
    mesh.position.set(x, y, z);
    mesh.scale.set(1, 1, 1);
    mesh.userData = { kind, life: kind === 'smoke' ? 1.4 : 0.5, age: 0, vy: kind === 'smoke' ? 1.2 : 2.5 };
    return mesh;
  }

  const effects = {
    burst(kind, x, y, z, count = 1) {
      for (let i = 0; i < count; i++) {
        spawn(kind, x + rng.range(-0.6, 0.6), y + rng.range(-0.2, 0.6), z + rng.range(-0.6, 0.6));
      }
    },

    muzzle(x, y, z) {
      spawn('flash', x, y, z);
    },

    setWaypoint(x, z) {
      beam.visible = true;
      beam.position.x = x;
      beam.position.z = z;
    },

    hideWaypoint() {
      beam.visible = false;
    },

    update(dt, simTime) {
      for (const m of pool) {
        if (!m.visible) continue;
        m.userData.age += dt;
        const t = m.userData.age / m.userData.life;
        if (t >= 1) {
          m.visible = false;
          continue;
        }
        m.position.y += m.userData.vy * dt;
        m.material.opacity = 1 - t;
        const grow = 1 + t * (m.userData.kind === 'smoke' ? 2.2 : 0.6);
        m.scale.set(grow, grow, grow);
      }
      if (beam.visible) {
        beam.material.opacity = 0.35 + 0.12 * Math.sin(simTime * 3);
        beam.rotation.y += dt * 0.8;
      }
    },
  };

  return effects;
}
