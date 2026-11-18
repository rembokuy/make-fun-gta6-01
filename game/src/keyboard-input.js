// SOLMARINA — keyboard (and mouse) input. Tracks held keys plus one-frame
// "pressed" edges, so a tap of E interacts exactly once. The test harness can
// also inject keys through the same path the game reads.

import { CONFIG } from './game-config.js';

export function createInput() {
  const down = new Set();
  const pressed = new Set();
  let mouseDown = false;
  let mousePressed = false;
  let attached = false;

  function onKeyDown(event) {
    if (event.repeat) return;
    down.add(event.code);
    pressed.add(event.code);
    if (event.code === 'Space') event.preventDefault();
  }

  function onKeyUp(event) {
    down.delete(event.code);
  }

  function onMouseDown(event) {
    if (event.button === 0) {
      mouseDown = true;
      mousePressed = true;
    }
  }

  function onMouseUp(event) {
    if (event.button === 0) mouseDown = false;
  }

  function onBlur() {
    down.clear();
  }

  const input = {
    attach() {
      if (attached) return;
      attached = true;
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('blur', onBlur);
    },

    detach() {
      if (!attached) return;
      attached = false;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onBlur);
    },

    isDown(code) {
      return down.has(code);
    },

    anyDown(codes) {
      return codes.some((c) => down.has(c));
    },

    // True once for the frame the key went down; consumes the edge.
    wasPressed(code) {
      if (pressed.has(code)) {
        pressed.delete(code);
        return true;
      }
      return false;
    },

    anyPressed(codes) {
      return codes.some((c) => this.wasPressed(c));
    },

    mouseClicked() {
      if (mousePressed) {
        mousePressed = false;
        return true;
      }
      return false;
    },

    mouseHeld() {
      return mouseDown;
    },

    // Test path: pretend a key was pressed this frame.
    inject(code) {
      down.add(code);
      pressed.add(code);
    },

    release(code) {
      down.delete(code);
    },

    // Steering + throttle axes from WASD / arrows, -1..1.
    axes() {
      const fwd = (this.anyDown(CONFIG.keys.up) ? 1 : 0) - (this.anyDown(CONFIG.keys.down) ? 1 : 0);
      const strafe = (this.anyDown(CONFIG.keys.right) ? 1 : 0) - (this.anyDown(CONFIG.keys.left) ? 1 : 0);
      return { fwd, strafe };
    },

    running() {
      return this.anyDown(CONFIG.keys.run);
    },

    endFrame() {
      pressed.clear();
      mousePressed = false;
    },
  };

  return input;
}
