// SOLMARINA — missions and story. Three chained jobs for Rae: a dawn courier
// run, three debts to collect for Marlo, and a harbour escape. Each step has
// a waypoint, a payout, and a line of story; Rush Hour pays 50% extra.

import { CONFIG, MISSION_SPOTS } from './game-config.js';

export function createMissions(world, hooks) {
  const spots = MISSION_SPOTS;
  const defs = CONFIG.missions.list;

  const missions = {
    index: 0,
    step: 0,
    collected: 0,
    debtsDone: [false, false, false],
    hasPackage: false,
    earned: 0,
    done: false,
    story: 'Rae baru tiba di Solmarina. Marlo menunggunya di ujung telepon.',
    objective: null,

    get current() {
      return defs[this.index] || null;
    },

    get totalEarned() {
      return this.earned;
    },

    // The active waypoint: where the beam points and the minimap marks.
    waypoint() {
      if (this.done) return null;
      if (this.index === 0) {
        return this.step === 0 ? spots.packagePickup : spots.packageDrop;
      }
      if (this.index === 1) {
        for (let i = 0; i < spots.debts.length; i++) {
          if (!this.debtsDone[i]) return spots.debts[i];
        }
        return spots.debts[2];
      }
      return spots.harborEscape;
    },

    objectiveText() {
      if (this.done) return 'Semua misi selesai — Solmarina milikmu, Rae.';
      if (this.index === 0) {
        return this.step === 0 ? 'Ambil paket di sudut barat kota' : 'Antar paket ke titik selatan';
      }
      if (this.index === 1) {
        const left = this.debtsDone.filter((d) => !d).length;
        return `Tagih utang Marlo — tersisa ${left} orang`;
      }
      return 'Kabur ke kapal di pelabuhan timur';
    },

    refreshObjective() {
      const w = this.waypoint();
      this.objective = w ? { ...w, text: this.objectiveText() } : null;
    },

    pay(amount) {
      const bonus = hooks.rushBonus ? hooks.rushBonus() : 1;
      const total = Math.round(amount * bonus);
      this.earned += total;
      if (hooks.onPay) hooks.onPay(total, bonus > 1);
      return total;
    },

    advanceMission() {
      this.index += 1;
      this.step = 0;
      this.hasPackage = false;
      if (this.index >= defs.length) {
        this.done = true;
        this.story = 'Rae lepas landas dari Solmarina — $1.250 di saku, kota di belakang.';
        if (hooks.onAllDone) hooks.onAllDone();
      } else {
        this.story = defs[this.index].blurb;
        if (hooks.onMissionStart) hooks.onMissionStart(defs[this.index]);
      }
      this.refreshObjective();
    },

    // Called every fixed step; E near the waypoint completes the step.
    update(dt, player, interactPressed) {
      if (this.done) return;
      const w = this.waypoint();
      if (!w) return;
      const d = Math.hypot(player.x - w.x, player.z - w.z);
      if (d > 4.5 || !interactPressed) return;

      if (this.index === 0 && this.step === 0) {
        this.hasPackage = true;
        this.step = 1;
        this.story = 'Paket di tangan. Jangan berhenti — antar ke selatan sebelum polisi sadar.';
        if (hooks.onPickup) hooks.onPickup('Paket kurir');
      } else if (this.index === 0 && this.step === 1) {
        this.pay(defs[0].pay);
        this.story = 'Paket terkirim. $250. Marlo sudah punya kerjaan berikutnya.';
        this.advanceMission();
      } else if (this.index === 1) {
        for (let i = 0; i < spots.debts.length; i++) {
          if (!this.debtsDone[i] && Math.hypot(player.x - spots.debts[i].x, player.z - spots.debts[i].z) <= 4.5) {
            this.debtsDone[i] = true;
            this.collected += spots.debts[i].pay;
            this.pay(spots.debts[i].pay);
            this.story = `${spots.debts[i].label} lunas. Sisa ${this.debtsDone.filter((x) => !x).length} utang.`;
            if (hooks.onCollect) hooks.onCollect(spots.debts[i]);
            break;
          }
        }
        if (this.debtsDone.every(Boolean)) {
          this.story = 'Semua utang lunas — $400 total. Sekarang kabur sebelum gengnya datang.';
          this.advanceMission();
        }
      } else if (this.index === 2) {
        this.pay(defs[2].pay);
        this.story = 'Rae naik ke kapal. Pelabuhan mengecil di belakang — selesai.';
        this.advanceMission();
      }
      this.refreshObjective();
    },

    reset() {
      this.index = 0;
      this.step = 0;
      this.collected = 0;
      this.debtsDone = [false, false, false];
      this.hasPackage = false;
      this.earned = 0;
      this.done = false;
      this.story = 'Rae baru tiba di Solmarina. Marlo menunggunya di ujung telepon.';
      this.refreshObjective();
    },
  };

  missions.refreshObjective();
  return missions;
}
