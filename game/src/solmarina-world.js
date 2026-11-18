// SOLMARINA — the city plan. Pure data, no meshes: road grid, building plots,
// the beach in the south, the harbour in the east, and the helpers every other
// system uses to stay on roads and sidewalks. Built once from a seeded RNG.

import { CONFIG, MISSION_SPOTS } from './game-config.js';

const ROADS = CONFIG.world.roads;
const HALF = CONFIG.world.half;

function nearestRoadLine(value) {
  let best = ROADS[0];
  let bestD = Infinity;
  for (const r of ROADS) {
    const d = Math.abs(value - r);
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return { line: best, dist: bestD };
}

export function buildWorld(rng) {
  const buildings = [];
  const palms = [];
  const tower = { x: 90, z: -30, w: 26, d: 26, h: 112 };

  // One block sits between each pair of neighbouring roads.
  const centers = [-150, -90, -30, 30, 90, 150];
  const palette = [0xcf9a6a, 0x8fa8bf, 0xd8cdb4, 0xb06a5a, 0x7fa08a, 0xc9b458, 0x9a8fc0];
  for (const bx of centers) {
    for (const bz of centers) {
      // The Glass Tower owns its block.
      if (bx === tower.x && bz === tower.z) continue;
      const count = rng.int(1, 3);
      for (let i = 0; i < count; i++) {
        const w = rng.range(14, 26);
        const d = rng.range(14, 26);
        const x = bx + rng.range(-10, 10);
        const z = bz + rng.range(-10, 10);
        buildings.push({
          x, z, w, d,
          h: rng.chance(0.14) ? rng.range(38, 58) : rng.range(9, 30),
          color: palette[Math.floor(rng.next() * palette.length)],
          roof: rng.pick([0x4a4f57, 0x6b5d4f, 0x3f6d5a]),
        });
      }
    }
  }

  // Palms line the beach promenade and a few avenues.
  for (let i = 0; i < 34; i++) {
    if (i < 20) palms.push({ x: -190 + i * 20 + rng.range(-4, 4), z: 202 + rng.range(-3, 3) });
    else palms.push({ x: rng.pick(ROADS) + rng.range(-9, 9), z: rng.range(-180, 180) });
  }

  // Harbour containers, stacked in rows on the eastern docks.
  const containers = [];
  const containerColors = [0xc65a3a, 0x3a7ac6, 0x4da06a, 0xd8a83a, 0x8a5fc0];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      containers.push({
        x: 226 + col * 14,
        z: -40 + row * 34,
        color: containerColors[(row + col) % containerColors.length],
        stacked: rng.chance(0.4),
      });
    }
  }

  const world = {
    buildings,
    palms,
    containers,
    tower,
    spots: MISSION_SPOTS,
    bounds: HALF,
  };

  world.isOnRoad = (x, z) => {
    const halfRoad = CONFIG.world.roadWidth / 2 + 1;
    return nearestRoadLine(x).dist <= halfRoad || nearestRoadLine(z).dist <= halfRoad;
  };

  world.nearestRoad = (x, z) => {
    const nx = nearestRoadLine(x);
    const nz = nearestRoadLine(z);
    if (nx.dist <= nz.dist) return { x: nx.line, z, axis: 'z', line: nx.line };
    return { x, z: nz.line, axis: 'x', line: nz.line };
  };

  // A random point on a random road, with the road's driving direction.
  world.pointOnRoad = () => {
    const alongX = rng.chance(0.5);
    const line = rng.pick(ROADS);
    const along = rng.range(-180, 180);
    if (alongX) return { x: along, z: line, heading: rng.chance(0.5) ? 0 : Math.PI, axis: 'x' };
    return { x: line, z: along, heading: rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2, axis: 'z' };
  };

  // A random point on a sidewalk, just off a road edge.
  world.pointOnSidewalk = () => {
    const alongX = rng.chance(0.5);
    const line = rng.pick(ROADS);
    const along = rng.range(-180, 180);
    const side = rng.chance(0.5) ? 1 : -1;
    const off = (CONFIG.world.roadWidth / 2 + 3.5) * side;
    if (alongX) return { x: along, z: line + off, heading: rng.chance(0.5) ? 0 : Math.PI };
    return { x: line + off, z: along, heading: rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2 };
  };

  world.clampToCity = (x, z) => ({
    x: Math.max(-HALF - 40, Math.min(300, x)),
    z: Math.max(-HALF - 20, Math.min(268, z)),
  });

  // True when the point is inside a building footprint (for collision).
  world.hitsBuilding = (x, z, pad = 0.6) => {
    for (const b of buildings) {
      if (Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad) return b;
    }
    if (Math.abs(x - tower.x) < tower.w / 2 + pad && Math.abs(z - tower.z) < tower.d / 2 + pad) return tower;
    return null;
  };

  world.inHarbor = (x, z) => x > CONFIG.world.harborX && z > CONFIG.world.harborZ0 && z < CONFIG.world.harborZ1;
  world.onBeach = (x, z) => z >= CONFIG.world.beachZ && z < CONFIG.world.oceanZ;
  world.inOcean = (x, z) => z >= CONFIG.world.oceanZ;

  return world;
}
