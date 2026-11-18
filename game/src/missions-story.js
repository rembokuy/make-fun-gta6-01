// Cerita: Rae Marlowe, kurir di Solmarina, berutang pada kru marina dan
// melunasinya lewat kerja. Tiga misi berantai — tiap misi membuka misi
// berikutnya — dengan beacon waypoint, baris objective di HUD, dan hadiah
// uang. Misi 2 menanam tiga debitur dan dua preman di dunia; misi 3
// memaksa pelarian dari polisi. Total hadiah misi: $1.250
// (250 + 400 + 600), di luar $120 tunai per debitur yang ditagih.
// Selama Rush Hour, semua payout naik 50% — dunia yang membayarnya,
// bukan modul ini: ctx.addCash sudah menerapkan pengali event.

import { placePed } from './sidewalk-crowd.js';

export const MISSION_DEFS = [
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

export const DEBTOR_CASH = 120;

const PICKUP = { x: 75, z: -75 }; // Pasar Ikan
const DROPOFF = { x: -75, z: 75 }; // Menara Kaca
const DEBTORS = [
  { x: 0, z: -75 },
  { x: 75, z: 0 },
  { x: -75, z: -150 },
];
const HIDEOUT = { x: -168, z: 40 }; // gudang dermaga barat

export function createStory() {
  return {
    index: 0, // 0-based ke MISSION_DEFS; 3 berarti cerita selesai
    stage: 0, // langkah per misi
    done: false,
    collected: 0,
    waypoint: { ...PICKUP },
    objective: MISSION_DEFS[0].intro,
    planted: false,
  };
}

export function storyTitle(story) {
  if (story.index >= MISSION_DEFS.length) return 'Cerita selesai';
  return MISSION_DEFS[story.index].title;
}

function setWaypoint(story, point, objective) {
  story.waypoint = { ...point };
  story.objective = objective;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// Menaruh debitur dan preman untuk misi 2. Dipanggil sekali, saat masuk.
export function plantDebtors(peds) {
  const free = peds.filter((p) => p.role === null).slice(0, 5);
  free.forEach((ped, i) => {
    if (i < 3) {
      ped.role = 'debtor';
      ped.guarded = i === 2; // debitur ketiga dijaga preman
      ped.collected = false;
      ped.state = 'walk';
      placePed(ped, DEBTORS[i].x, DEBTORS[i].z, 0, 'walk');
    } else {
      ped.role = 'guard';
      ped.health = 150;
      ped.state = 'walk';
      placePed(ped, DEBTORS[2].x + (i === 3 ? 4 : -4), DEBTORS[2].z + 3, 0, 'walk');
    }
  });
  return free;
}

/**
 * Majukan misi aktif. `ctx` membawa dunia yang hidup:
 * { pos, inCar, interact, peds, addWanted, addCash, toast,
 *   pickupSound, missionSound }.
 * Mengembalikan 'complete' saat satu misi selesai, 'story' saat ketiganya
 * selesai, atau null.
 */
export function stepStory(story, ctx) {
  if (story.index >= MISSION_DEFS.length) return null;
  const def = MISSION_DEFS[story.index];

  if (story.index === 0) {
    if (story.stage === 0) {
      setWaypoint(story, PICKUP, 'Ambil paket di Pasar Ikan (tanda kuning).');
      story.stage = 1;
    } else if (story.stage === 1) {
      if (distance(ctx.pos, PICKUP) < 6) {
        story.stage = 2;
        ctx.toast('Paket diambil! Antar ke Menara Kaca di barat daya.');
        ctx.pickupSound();
        setWaypoint(story, DROPOFF, 'Antar paket ke Menara Kaca.');
      }
    } else if (story.stage === 2) {
      if (distance(ctx.pos, DROPOFF) < 6) return finishMission(story, ctx, def);
    }
  } else if (story.index === 1) {
    if (!story.planted) {
      plantDebtors(ctx.peds);
      story.planted = true;
      setWaypoint(story, DEBTORS[0], 'Tagih utang: 0/3 orang (tekan E di dekat mereka).');
    }
    const debtor = ctx.peds.find((p) => p.role === 'debtor' && !p.collected);
    if (debtor) {
      setWaypoint(story, debtor.pos, `Tagih utang: ${story.collected}/3 orang (tekan E di dekat mereka).`);
    }
    if (ctx.interact) {
      for (const ped of ctx.peds) {
        if (ped.role === 'debtor' && !ped.collected && distance(ctx.pos, ped.pos) < 3.2) {
          const guardsUp = ctx.peds.some((g) => g.role === 'guard' && g.state !== 'down');
          if (guardsUp && ped.guarded) {
            ctx.toast('Preman itu menjaga dia — jatuhkan mereka dulu (F untuk memukul)!');
            break;
          }
          ped.collected = true;
          ped.state = 'flee';
          ped.timer = 5;
          story.collected += 1;
          const paid = ctx.addCash(DEBTOR_CASH);
          ctx.toast(`Utang ditagih! ${story.collected}/3. +$${paid} tunai.`);
          ctx.pickupSound();
          if (story.collected >= 3) return finishMission(story, ctx, def);
          break;
        }
      }
    }
  } else if (story.index === 2) {
    if (story.stage === 0) {
      story.stage = 1;
      ctx.addWanted(3);
      ctx.toast('WANTED 3 — kabur ke gudang dermaga!');
      setWaypoint(story, HIDEOUT, 'Kabur ke gudang tua di dermaga barat. Polisi mengejarmu!');
    }
    if (distance(ctx.pos, HIDEOUT) < 7) {
      if (ctx.inCar) return finishMission(story, ctx, def);
      story.objective = 'Masuk mobil dulu — gudang hanya terbuka untuk mobil.';
    }
  }
  return null;
}

function finishMission(story, ctx, def) {
  const paid = ctx.addCash(def.reward);
  ctx.missionSound();
  ctx.toast(`${def.title} selesai! +$${paid}`);
  story.index += 1;
  story.stage = 0;
  story.collected = 0;
  story.planted = false;
  if (story.index >= MISSION_DEFS.length) {
    story.done = true;
    story.objective = 'Cerita selesai — Solmarina milikmu. Jelajahi sesukamu!';
    return 'story';
  }
  const next = MISSION_DEFS[story.index];
  story.objective = next.intro;
  if (story.index === 0) setWaypoint(story, PICKUP, next.intro);
  return 'complete';
}

export function beginStoryAt(story, index) {
  story.index = index;
  story.stage = 0;
  story.collected = 0;
  story.planted = false;
  story.done = false;
  if (index === 0) setWaypoint(story, PICKUP, MISSION_DEFS[0].intro);
}
