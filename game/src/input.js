// Keyboard + mouse input. Keys are held in a set; discrete actions
// (interact, punch, shoot, pause, confirm) are consumed once per press
// through takeActions(), so holding a key never double-fires a menu.

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

export function createInput(canvas) {
  const keys = new Set();
  let queued = 0;
  let mouseDown = false;
  let mouseDx = 0;
  let mouseDy = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

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
  window.addEventListener('blur', onBlur);

  return {
    held(code) {
      return keys.has(code);
    },
    /** -1..1 steering / strafe intent from A/D or arrow keys. */
    steer() {
      let value = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) value -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) value += 1;
      return value;
    },
    /** -1..1 forward intent from W/S or arrow keys. */
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
    /** Mouse drag since the last call, in pixels; resets each call. */
    takeMouseDelta() {
      const out = { dx: mouseDx, dy: mouseDy };
      mouseDx = 0;
      mouseDy = 0;
      return out;
    },
    // Consume and return only the bits in `mask` (default: all). The menu
    // layer takes PAUSE/CONFIRM while the world takes INTERACT/PUNCH/
    // SHOOT/HORN, so neither layer can eat the other's keypress.
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
