// Semua suara disintesis dengan WebAudio — tanpa file audio, tanpa lisensi.
// AudioContext malas dimulai pada gestur pertama pengguna; sequencer langkah
// kecil memainkan groove bass-dan-hat yang cerah, dan helper one-shot
// membuat tembakan, pukulan, sirene, klakson, bunyi pickup, sting misi,
// dan klakson Rush Hour.

export function createSynthAudio() {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let step = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function noiseBuffer(seconds) {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noiseHit(dur, vol, filterFreq) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  function startMusic() {
    if (!ensure() || musicTimer) return;
    // Groove cerah: bass di A minor pentatonik + hat tiap langkah.
    const bassNotes = [110, 0, 130.81, 0, 98, 0, 146.83, 0, 110, 0, 130.81, 164.81, 98, 0, 123.47, 0];
    musicTimer = window.setInterval(() => {
      if (muted) {
        step = (step + 1) % 16;
        return;
      }
      const note = bassNotes[step % 16];
      if (note) blip(note, 0.22, 'triangle', 0.16);
      if (step % 2 === 0) noiseHit(0.03, 0.05, 8000);
      step = (step + 1) % 16;
    }, 170);
  }

  function startEngine() {
    if (!ensure() || engineOsc) return;
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 50;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
  }

  function setEngine(speed01, on) {
    if (!engineOsc || !engineGain || !ctx) return;
    const t = ctx.currentTime;
    engineGain.gain.setTargetAtTime(on && !muted ? 0.05 + speed01 * 0.06 : 0, t, 0.1);
    engineOsc.frequency.setTargetAtTime(50 + speed01 * 130, t, 0.08);
  }

  function startSiren() {
    if (!ensure() || sirenOsc) return;
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'square';
    sirenOsc.frequency.value = 720;
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(master);
    sirenOsc.start();
    let high = true;
    sirenOsc._timer = window.setInterval(() => {
      if (!sirenOsc) return;
      high = !high;
      sirenOsc.frequency.setTargetAtTime(high ? 720 : 540, ctx.currentTime, 0.05);
    }, 450);
  }

  function setSiren(on) {
    if (!sirenGain || !ctx) return;
    sirenGain.gain.setTargetAtTime(on && !muted ? 0.035 : 0, ctx.currentTime, 0.2);
  }

  return {
    unlock,
    startMusic,
    startEngine,
    setEngine,
    startSiren,
    setSiren,
    gunshot() {
      noiseHit(0.14, 0.5, 2600);
      blip(160, 0.08, 'square', 0.2, 60);
    },
    punch() {
      noiseHit(0.09, 0.35, 500);
      blip(90, 0.1, 'sine', 0.3, 45);
    },
    horn() {
      blip(370, 0.35, 'square', 0.12);
      blip(466, 0.35, 'square', 0.1);
    },
    rushHorn() {
      // Klakson tiga nada saat Rush Hour dimulai.
      [370, 466, 622].forEach((f, i) => window.setTimeout(() => blip(f, 0.3, 'square', 0.14), i * 130));
    },
    pickup() {
      blip(880, 0.12, 'sine', 0.18);
      window.setTimeout(() => blip(1318, 0.18, 'sine', 0.18), 90);
    },
    missionDone() {
      [523, 659, 784, 1046].forEach((f, i) => window.setTimeout(() => blip(f, 0.22, 'triangle', 0.2), i * 110));
    },
    busted() {
      [392, 311, 233].forEach((f, i) => window.setTimeout(() => blip(f, 0.3, 'sawtooth', 0.15), i * 160));
    },
    crash() {
      noiseHit(0.25, 0.4, 900);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
  };
}
