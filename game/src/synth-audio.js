// SOLMARINA — synthesized sound. No audio files: a tiny WebAudio rig plays a
// bass-driven music loop plus engine hum, sirens, gunshots and pickup blips.
// Everything is lazy (first gesture) and guarded, so a silent browser never
// breaks the game.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let step = 0;

  // A slow, sunny bassline in A minor; the melody rides on top of it.
  const bassNotes = [110, 110, 130.81, 98, 110, 110, 146.83, 164.81];
  const leadNotes = [440, 523.25, 659.25, 523.25, 440, 392, 493.88, 587.33];

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + when);
      gain.gain.setValueAtTime(vol, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + dur + 0.05);
    } catch (err) {
      // A failed blip is never worth crashing the game over.
      void err;
    }
  }

  const audio = {
    get ready() {
      return ctx !== null;
    },

    get isMuted() {
      return muted;
    },

    ensure() {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        return true;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
        return true;
      } catch (err) {
        void err;
        return false;
      }
    },

    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.5;
      if (value) this.stopSiren();
    },

    startMusic() {
      if (!ctx || musicTimer) return;
      musicTimer = window.setInterval(() => {
        if (muted) return;
        const bar = step % bassNotes.length;
        tone(bassNotes[bar], 0.42, 'triangle', 0.22);
        tone(leadNotes[bar], 0.3, 'sine', 0.1, 0.05);
        step += 1;
      }, 460);
    },

    stopMusic() {
      if (musicTimer) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
    },

    shot() {
      if (!ctx || muted) return;
      try {
        const noise = ctx.createBufferSource();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        noise.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = 0.4;
        noise.connect(gain);
        gain.connect(master);
        noise.start();
      } catch (err) {
        void err;
      }
    },

    punch() {
      tone(90, 0.12, 'square', 0.25);
    },

    pickup() {
      tone(660, 0.12, 'sine', 0.25);
      tone(880, 0.18, 'sine', 0.25, 0.09);
    },

    cash() {
      tone(523.25, 0.12, 'sine', 0.22);
      tone(659.25, 0.12, 'sine', 0.22, 0.08);
      tone(783.99, 0.22, 'sine', 0.22, 0.16);
    },

    engine(speedNorm) {
      if (!ctx || muted) return;
      try {
        if (!engineOsc) {
          engineOsc = ctx.createOscillator();
          engineGain = ctx.createGain();
          engineOsc.type = 'sawtooth';
          engineOsc.frequency.value = 60;
          engineGain.gain.value = 0;
          engineOsc.connect(engineGain);
          engineGain.connect(master);
          engineOsc.start();
        }
        engineOsc.frequency.setValueAtTime(55 + speedNorm * 140, ctx.currentTime);
        engineGain.gain.setValueAtTime(0.02 + speedNorm * 0.05, ctx.currentTime);
      } catch (err) {
        void err;
      }
    },

    startSiren() {
      if (!ctx || muted || sirenOsc) return;
      try {
        sirenOsc = ctx.createOscillator();
        sirenGain = ctx.createGain();
        sirenOsc.type = 'sine';
        sirenOsc.frequency.value = 700;
        sirenGain.gain.value = 0.05;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 1.4;
        lfoGain.gain.value = 220;
        lfo.connect(lfoGain);
        lfoGain.connect(sirenOsc.frequency);
        lfo.start();
        sirenOsc._lfo = lfo;
      } catch (err) {
        void err;
      }
    },

    stopSiren() {
      try {
        if (sirenOsc) {
          if (sirenOsc._lfo) sirenOsc._lfo.stop();
          sirenOsc.stop();
          sirenOsc = null;
        }
      } catch (err) {
        void err;
      }
    },
  };

  return audio;
}
