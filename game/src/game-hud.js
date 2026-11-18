// SOLMARINA — the HUD: health, wanted stars, money, mission panel, the Rush
// Hour banner with its countdown, toasts, and the live top-down minimap.
// All DOM lives in index.html; this module only reads and paints it.

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const els = {
    healthFill: $('health-fill'),
    healthText: $('health-text'),
    money: $('money'),
    stars: $('stars'),
    missionName: $('mission-name'),
    missionObjective: $('mission-objective'),
    missionPay: $('mission-pay'),
    totalEarned: $('total-earned'),
    rushBanner: $('rush-banner'),
    rushCountdown: $('rush-countdown'),
    toast: $('toast'),
    minimap: $('minimap'),
    startScreen: $('start-screen'),
    pauseScreen: $('pause-screen'),
    gameOverScreen: $('gameover-screen'),
    storyLine: $('story-line'),
  };
  const mapCtx = els.minimap ? els.minimap.getContext('2d') : null;
  let toastTimer = 0;

  function starsText(level) {
    let out = '';
    for (let i = 0; i < 5; i++) out += i < level ? '★' : '☆';
    return out;
  }

  const hud = {
    toast(message, seconds = 3) {
      if (!els.toast) return;
      els.toast.textContent = message;
      els.toast.style.opacity = '1';
      toastTimer = seconds;
    },

    tickToast(dt) {
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0 && els.toast) els.toast.style.opacity = '0';
      }
    },

    showStart(show) {
      if (els.startScreen) els.startScreen.style.display = show ? 'flex' : 'none';
    },

    showPause(show) {
      if (els.pauseScreen) els.pauseScreen.style.display = show ? 'flex' : 'none';
    },

    showGameOver(show) {
      if (els.gameOverScreen) els.gameOverScreen.style.display = show ? 'flex' : 'none';
    },

    update(state) {
      if (els.healthFill) els.healthFill.style.width = `${Math.max(0, state.health)}%`;
      if (els.healthText) els.healthText.textContent = `${Math.ceil(Math.max(0, state.health))}`;
      if (els.money) els.money.textContent = `$${state.earned.toLocaleString('en-US')}`;
      if (els.stars) {
        els.stars.textContent = starsText(state.wanted);
        els.stars.classList.toggle('hot', state.wanted >= 3);
      }
      if (els.missionName) els.missionName.textContent = state.missionName;
      if (els.missionObjective) els.missionObjective.textContent = state.objective;
      if (els.missionPay) els.missionPay.textContent = state.missionPay;
      if (els.totalEarned) els.totalEarned.textContent = `$${state.earned} / $1.250`;
      if (els.storyLine) els.storyLine.textContent = state.story;
      if (els.rushBanner) {
        els.rushBanner.style.display = state.rushActive ? 'block' : 'none';
        if (state.rushActive && els.rushCountdown) els.rushCountdown.textContent = `${state.rushCountdown}s`;
      }
      this.drawMinimap(state);
    },

    drawMinimap(state) {
      if (!mapCtx || !els.minimap) return;
      const size = els.minimap.width;
      const half = size / 2;
      const scale = size / 620;
      const toMap = (x, z) => [half + (x - 40) * scale, half + (z - 20) * scale];
      mapCtx.clearRect(0, 0, size, size);
      mapCtx.fillStyle = 'rgba(10, 24, 18, 0.82)';
      mapCtx.fillRect(0, 0, size, size);
      // Roads.
      mapCtx.strokeStyle = 'rgba(200, 205, 215, 0.5)';
      mapCtx.lineWidth = 2;
      for (const r of [-180, -120, -60, 0, 60, 120, 180]) {
        const [ax] = toMap(r, 0);
        const [, bz] = toMap(0, r);
        mapCtx.beginPath();
        mapCtx.moveTo(ax, 0);
        mapCtx.lineTo(ax, size);
        mapCtx.moveTo(0, bz);
        mapCtx.lineTo(size, bz);
        mapCtx.stroke();
      }
      // Beach + harbour.
      mapCtx.fillStyle = 'rgba(232, 210, 154, 0.7)';
      mapCtx.fillRect(0, half + (210 - 20) * scale, size, 12);
      mapCtx.fillStyle = 'rgba(42, 111, 142, 0.7)';
      mapCtx.fillRect(half + (210 - 40) * scale, 0, size, size);
      // Roadblocks.
      for (const rb of state.roadblocks) {
        const [x, y] = toMap(rb.x, rb.z);
        mapCtx.fillStyle = '#ff7a1a';
        mapCtx.fillRect(x - 4, y - 4, 8, 8);
      }
      // Waypoint.
      if (state.waypoint) {
        const [x, y] = toMap(state.waypoint.x, state.waypoint.z);
        mapCtx.fillStyle = '#ffd23e';
        mapCtx.beginPath();
        mapCtx.arc(x, y, 5, 0, Math.PI * 2);
        mapCtx.fill();
      }
      // Police.
      mapCtx.fillStyle = '#3a7ac6';
      for (const p of state.police) {
        const [x, y] = toMap(p.x, p.z);
        mapCtx.beginPath();
        mapCtx.arc(x, y, 3, 0, Math.PI * 2);
        mapCtx.fill();
      }
      // Player arrow.
      const [px, py] = toMap(state.playerX, state.playerZ);
      mapCtx.save();
      mapCtx.translate(px, py);
      mapCtx.rotate(Math.atan2(Math.sin(state.heading), Math.cos(state.heading)) + Math.PI);
      mapCtx.fillStyle = '#ff4444';
      mapCtx.beginPath();
      mapCtx.moveTo(0, -6);
      mapCtx.lineTo(4, 5);
      mapCtx.lineTo(-4, 5);
      mapCtx.closePath();
      mapCtx.fill();
      mapCtx.restore();
    },
  };

  return hud;
}
