// Input keyboard + mouse. Tombol ditahan di dalam set; aksi diskret
// (interact, pukul, tembak, jeda, konfirmasi, klakson) dikonsumsi sekali
// per tekan lewat takeActions(), jadi menahan tombol tidak pernah
// menembak dua kali ke menu.

export const ACTION_INTERACT = 1;
export const ACTION_PUNCH = 2;
export const ACTION_SHOOT = 4;
export const ACTION_PAUSE = 8;
export const ACTION_CONFIRM = 16;
export const ACTION_HORN = 32;

const KEY_ACTIONS = {
  KeyE: ACTION_INTERACT,
  KeyF: ACTION_PUNCH,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  Enter: ACTION_CONFIRM,
  Space: ACTION_CONFIRM,
  KeyH: ACTION_HORN,
};

export function createKeyboardInput(canvas) {
  const keys = new Set();
  let queued = 0;
  let mouseDown = false;
  let mouseDx = 0;
  let mouseDy = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let wheel = 0;

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    const action = KEY_ACTIONS[event.code];
    if (action !== undefined) queued |= action;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onMouseDown(event) {
    mouseDown = true;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    if (event.button === 0) queued |= ACTION_SHOOT;
  }
  function onMouseUp() {
    mouseDown = false;
    dragging = false;
  }
  function onMouseMove(event) {
    if (!dragging) return;
    mouseDx += event.clientX - lastX;
    mouseDy += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
  }
  function onWheel(event) {
    wheel += event.deltaY;
  }
  function onBlur() {
    keys.clear();
    mouseDown = false;
    dragging = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('blur', onBlur);

  return {
    held(code) {
      return keys.has(code);
    },
    /** Niat belok / strafe -1..1 dari A/D atau panah. */
    steer() {
      let value = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) value -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) value += 1;
      return value;
    },
    /** Niat maju -1..1 dari W/S atau panah. */
    throttle() {
      let value = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) value += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) value -= 1;
      return value;
    },
    sprint() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    mouseDown() {
      return mouseDown;
    },
    /** Drag mouse sejak panggilan terakhir, dalam piksel; reset tiap panggil. */
    takeMouseDelta() {
      const out = { dx: mouseDx, dy: mouseDy };
      mouseDx = 0;
      mouseDy = 0;
      return out;
    },
    /** Scroll sejak panggilan terakhir; reset tiap panggil. */
    wheelDelta() {
      const out = wheel;
      wheel = 0;
      return out;
    },
    // Konsumsi dan kembalikan hanya bit di `mask` (default: semua). Lapisan
    // menu mengambil PAUSE/CONFIRM sementara dunia mengambil
    // INTERACT/PUNCH/SHOOT/HORN, jadi keduanya tidak saling memakan tombol.
    takeActions(mask = 0xffff) {
      const out = queued & mask;
      queued &= ~mask;
      return out;
    },
    clear() {
      keys.clear();
      queued = 0;
    },
  };
}
