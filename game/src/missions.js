// The story: Rae Marlowe, a courier in Solmarina, owes the marina crew
// and works it off. Three chained missions — each one unlocks the next —
// with a waypoint beacon, an objective line on the HUD and cash rewards.
// Mission 2 plants three debtor pedestrians and two guards in the world;
// mission 3 forces a police escape.

export const MISSIONS = [
  {
    id: 1,
    title: 'Misi 1 — Kurir Pagi',
    intro: 'Ambil paket di Pasar Ikan, antar ke Menara Kaca. Naik mobil, ikuti panah kuning.',
    reward: 250,
  },
  {
    id: 2,
    title: 'Misi 2 — Tagihan Marina',
    intro: 'Tiga orang berutang pada kru marina. Tagih mereka — yang terakhir dijaga dua preman.',
    reward: 400,
  },
  {
    id: 3,
    title: 'Misi 3 — Pelarian Pelabuhan',
    intro: 'Polisi mengincarmu. Curi mobil dan kabur ke gudang tua di dermaga barat.',
    reward: 600,
  },
];

const PICKUP = { x: 75, z: -75 };
const DROPOFF = { x: -75, z: 75 };
const DEBTORS = [
  { x: 0, z: -75 },
  { x: 75, z: 0 },
  { x: -75, z: -150 },
];
const HIDEOUT = { x: -168, z: 40 };

export function createMissions() {
  return {
    index: 0, // 0-based into MISSIONS; 3 means the story is done
    stage: 0, // per-mission step
    done: false,
    collected: 0,
    waypoint: { ...PICKUP },
    objective: MISSIONS[0].intro,
    planted: false,
  };
}

export function missionTitle(missions) {
  if (missions.index >= MISSIONS.length) return 'Cerita selesai';
  return MISSIONS[missions.index].title;
}

function setWaypoint(missions, point, objective) {
  missions.waypoint = { ...point };
  missions.objective = objective;
}

// Place the debtors and guards for mission 2. Called once, on entry.
export function plantMissionTwo(peds, rng) {
  const debtors = peds.filter((p) => p.role === null).slice(0, 5);
  debtors.forEach((ped, i) => {
    if (i < 3) {
      ped.role = 'debtor';
      ped.guarded = i === 2; // the third debtor is protected by the guards
      ped.pos = { ...DEBTORS[i] };
      ped.state = 'walk';
      ped.collected = false;
    } else {
      ped.role = 'guard';
      ped.pos = { x: DEBTORS[2].x + (i === 3 ? 4 : -4), z: DEBTORS[2].z + 3 };
      ped.state = 'walk';
      ped.health = 150;
    }
  });
  return debtors;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * Advance the active mission. `ctx` carries the live world:
 * { pos, inCar, interact, peds, addWanted, toast, onReward }.
 * Returns 'complete' when a mission finishes, 'story' when all three are
 * done, or null.
 */
export function updateMissions(missions, ctx) {
  if (missions.index >= MISSIONS.length) return null;
  const m = MISSIONS[missions.index];

  if (missions.index === 0) {
    if (missions.stage === 0) {
      setWaypoint(missions, PICKUP, 'Ambil paket di Pasar Ikan (tanda kuning).');
      missions.stage = 1;
    } else if (missions.stage === 1) {
      if (dist(ctx.pos, PICKUP) < 6) {
        missions.stage = 2;
        ctx.toast('Paket diambil! Antar ke Menara Kaca di barat daya.');
        ctx.pickupSound();
        setWaypoint(missions, DROPOFF, 'Antar paket ke Menara Kaca.');
      }
    } else if (missions.stage === 2) {
      if (dist(ctx.pos, DROPOFF) < 6) return finishMission(missions, ctx, m);
    }
  } else if (missions.index === 1) {
    if (!missions.planted) {
      plantMissionTwo(ctx.peds);
      missions.planted = true;
      setWaypoint(missions, DEBTORS[0], 'Tagih utang: 0/3 orang (tekan E di dekat mereka).');
    }
    const debtor = ctx.peds.find((p) => p.role === 'debtor' && !p.collected);
    if (debtor) setWaypoint(missions, debtor.pos, `Tagih utang: ${missions.collected}/3 orang (tekan E di dekat mereka).`);
    if (ctx.interact) {
      for (const ped of ctx.peds) {
        if (ped.role === 'debtor' && !ped.collected && dist(ctx.pos, ped.pos) < 3.2) {
          const guardsUp = ctx.peds.some((g) => g.role === 'guard' && g.state !== 'down');
          if (guardsUp && ped.guarded) {
            ctx.toast('Preman itu menjaga dia — jatuhkan mereka dulu (F untuk memukul)!');
            break;
          }
          ped.collected = true;
          ped.state = 'flee';
          ped.timer = 5;
          missions.collected += 1;
          ctx.toast(`Utang ditagih! ${missions.collected}/3. +$120 tunai.`);
          ctx.pickupSound();
          ctx.addCash(120);
          if (missions.collected >= 3) return finishMission(missions, ctx, m);
          break;
        }
      }
    }
  } else if (missions.index === 2) {
    if (missions.stage === 0) {
      missions.stage = 1;
      ctx.addWanted(3);
      ctx.toast('WANTED 3 — kabur ke gudang dermaga!');
      setWaypoint(missions, HIDEOUT, 'Kabur ke gudang tua di dermaga barat. Polisi mengejarmu!');
    }
    if (dist(ctx.pos, HIDEOUT) < 7 && ctx.inCar) return finishMission(missions, ctx, m);
    if (dist(ctx.pos, HIDEOUT) < 7 && !ctx.inCar) {
      missions.objective = 'Masuk mobil dulu — gudang hanya terbuka untuk mobil.';
    }
  }
  return null;
}

function finishMission(missions, ctx, m) {
  ctx.addCash(m.reward);
  ctx.missionSound();
  ctx.toast(`${m.title} selesai! +$${m.reward}`);
  missions.index += 1;
  missions.stage = 0;
  missions.collected = 0;
  missions.planted = false;
  if (missions.index >= MISSIONS.length) {
    missions.done = true;
    missions.objective = 'Cerita selesai — Solmarina milikmu. Jelajahi sesukamu!';
    return 'story';
  }
  const next = MISSIONS[missions.index];
  missions.objective = next.intro;
  if (missions.index === 0) setWaypoint(missions, PICKUP, next.intro);
  return 'complete';
}

export function startMission(missions, index) {
  missions.index = index;
  missions.stage = 0;
  missions.collected = 0;
  missions.planted = false;
  missions.done = false;
  if (index === 0) setWaypoint(missions, PICKUP, MISSIONS[0].intro);
}
