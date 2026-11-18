// All sound is synthesised with WebAudio — no audio files, no licences.
// A lazy AudioContext starts on the first user gesture; a tiny step
// sequencer plays a sunny bass-and-hats groove, and one-shot helpers make
// the gunshot, punch, siren, horn, pickup chime and mission sting.

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

  // A 16-step loop at 112 BPM: root-note bass on the beat, hats off-beat,
  // a little lead sparkle every bar. Sunny, cheap, original.
  const BASS = [55, 0, 55, 0, 65.4, 0, 55, 0, 49, 0, 49, 0, 58.3, 0, 73.4, 0];
  const LEAD = [220, 0, 0, 261.6, 0, 0, 329.6, 0, 0, 0, 293.7, 0, 0, 392, 0, 0];

  function startMusic() {
    if (!ensure() || musicTimer) return;
    const stepDur = 60 / 112 / 4;
    musicTimer = window.setInterval(() => {
      if (muted || !ctx) return;
      const bass = BASS[step % 16];
      if (bass) blip(bass, stepDur * 1.8, 'triangle', 0.16);
      if (step % 2 === 1) noiseHit(0.03, 0.05, 8000);
      const lead = LEAD[step % 16];
      if (lead) blip(lead, stepDur * 1.4, 'sine', 0.05);
      step += 1;
    }, stepDur * 1000);
  }

  function startEngine() {
    if (!ensure() || engineOsc) return;
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(filter);
    filter.connect(engineGain);
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
