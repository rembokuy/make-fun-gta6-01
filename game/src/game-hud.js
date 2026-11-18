// HUD: panel DOM untuk uang, total penghasilan, kesehatan, wanted,
// objective misi, toast, banner Rush Hour, dan minimap 2D live Solmarina
// yang menampilkan jalan, panah pemain, waypoint, traffic, polisi, dan
// roadblock. Menu (judul / jeda / tertangkap / cerita selesai) juga
// overlay DOM. Semua animasi minimap memakai waktu dunia (state.time),
// bukan jam dinding — supaya screenshot deterministik.

import { CITY, ROAD_LINES, RUSH } from './game-config.js';

export function createGameHud() {
  const el = (id) => document.getElementById(id);
  const money = el('hud-money');
  const earned = el('hud-earned');
  const healthFill = el('hud-health-fill');
  const healthText = el('hud-health-text');
  const stars = el('hud-stars');
  const objective = el('hud-objective');
  const missionTitle = el('hud-mission');
  const bonusLine = el('hud-bonus');
  const speed = el('hud-speed');
  const toast = el('hud-toast');
  const prompt = el('hud-prompt');
  const rushBanner = el('hud-rush');
  const rushText = el('hud-rush-text');
  const minimap = el('minimap');
  const mapCtx = minimap.getContext('2d');
  let toastTimer = null;

  function showToast(text, ms = 3200) {
    toast.textContent = text;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
  }

  function drawMinimap(state) {
    const size = minimap.width;
    const scale = size / (CITY.half * 2);
    const toMap = (x, z) => [(x + CITY.half) * scale, (z + CITY.half) * scale];
    mapCtx.fillStyle = '#20262e';
    mapCtx.fillRect(0, 0, size, size);
    // Laut + pantai di barat.
    mapCtx.fillStyle = '#2e7fa8';
    mapCtx.fillRect(0, 0, (CITY.oceanX + 200 + 40) * scale, size);
    mapCtx.fillStyle = '#e8d29a';
    mapCtx.fillRect((CITY.beachX + 200 - 11) * scale, 0, 22 * scale, size);
    // Jalan.
    mapCtx.strokeStyle = '#5a636e';
    mapCtx.lineWidth = 7;
    for (const c of ROAD_LINES) {
      const [x1, y1] = toMap(c, -200);
      const [x2, y2] = toMap(c, 200);
      mapCtx.beginPath();
      mapCtx.moveTo(x1, y1);
      mapCtx.lineTo(x2, y2);
      mapCtx.stroke();
      const [hx1, hy1] = toMap(-200, c);
      const [hx2, hy2] = toMap(200, c);
      mapCtx.beginPath();
      mapCtx.moveTo(hx1, hy1);
      mapCtx.lineTo(hx2, hy2);
      mapCtx.stroke();
    }
    // Roadblock Rush Hour: kotak oranye berkedip.
    const blink = Math.floor(state.time / 0.35) % 2 === 0;
    mapCtx.fillStyle = blink ? '#ff7a1a' : '#ffd34d';
    for (const block of state.roadblocks || []) {
      const [bx, by] = toMap(block.x, block.z);
      mapCtx.fillRect(bx - 3, by - 3, 6, 6);
    }
    // Waypoint (belah ketupat kuning berdenyut).
    if (state.waypoint) {
      const [wx, wy] = toMap(state.waypoint.x, state.waypoint.z);
      const pulse = 5 + Math.sin(state.time * 4) * 2;
      mapCtx.fillStyle = '#ffd34d';
      mapCtx.beginPath();
      mapCtx.moveTo(wx, wy - pulse);
      mapCtx.lineTo(wx + pulse, wy);
      mapCtx.lineTo(wx, wy + pulse);
      mapCtx.lineTo(wx - pulse, wy);
      mapCtx.closePath();
      mapCtx.fill();
    }
    // Titik traffic.
    mapCtx.fillStyle = '#cfd6dd';
    for (const car of state.trafficCars) {
      const [cx, cy] = toMap(car.pos.x, car.pos.z);
      mapCtx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    }
    // Blip polisi (merah/biru bergantian).
    mapCtx.fillStyle = blink ? '#ff2a2a' : '#2a6bff';
    for (const cop of state.cops) {
      const [cx, cy] = toMap(cop.pos.x, cop.pos.z);
      mapCtx.beginPath();
      mapCtx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      mapCtx.fill();
    }
    // Panah pemain.
    const [px, py] = toMap(state.playerX, state.playerZ);
    mapCtx.save();
    mapCtx.translate(px, py);
    mapCtx.rotate(-state.playerHeading);
    mapCtx.fillStyle = '#ffffff';
    mapCtx.strokeStyle = '#111';
    mapCtx.lineWidth = 1;
    mapCtx.beginPath();
    mapCtx.moveTo(0, -7);
    mapCtx.lineTo(5, 6);
    mapCtx.lineTo(-5, 6);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.stroke();
    mapCtx.restore();
  }

  function fmtMoney(n) {
    return `$${Math.floor(n).toLocaleString('en-US')}`;
  }

  return {
    showToast,
    setPrompt(text) {
      if (text) {
        prompt.textContent = text;
        prompt.classList.add('show');
      } else {
        prompt.classList.remove('show');
      }
    },
    update(state) {
      money.textContent = fmtMoney(state.money);
      earned.textContent = `TOTAL DIDAPAT ${fmtMoney(state.totalEarned)} / $1.250`;
      healthFill.style.width = `${Math.max(0, state.health)}%`;
      healthFill.style.background = state.health > 50 ? '#58d68d' : state.health > 25 ? '#f7c948' : '#e5534b';
      healthText.textContent = `${Math.ceil(state.health)}`;
      stars.textContent = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
      stars.style.color = state.wanted > 0 ? '#ffd34d' : 'rgba(255,255,255,0.35)';
      missionTitle.textContent = state.missionTitle;
      objective.textContent = state.objective;
      if (state.rushActive) {
        bonusLine.textContent = `RUSH HOUR — payout misi +${Math.round((RUSH.payoutMultiplier - 1) * 100)}%!`;
        bonusLine.style.display = '';
        rushBanner.classList.add('show');
        rushText.textContent = `RUSH HOUR · ${Math.ceil(state.rushRemaining)} dtk · traffic ×${RUSH.trafficMultiplier} · payout +50%`;
      } else {
        bonusLine.textContent = `Rush Hour berikutnya: ${state.rushNextIn} dtk`;
        bonusLine.style.display = '';
        rushBanner.classList.remove('show');
      }
      speed.textContent = state.inCar ? `${Math.round(Math.abs(state.speed) * 3.6)} km/h` : '';
      drawMinimap(state);
    },
  };
}

// Helper overlay: judul, jeda, tertangkap, cerita selesai. Tiap overlay
// adalah <div class="overlay"> di index.html; showOverlay menyembunyikan
// sisanya.
export function showOverlay(id) {
  for (const el of document.querySelectorAll('.overlay')) el.classList.remove('show');
  if (id) {
    const target = document.getElementById(id);
    if (target) target.classList.add('show');
  }
}
