// SOLMARINA — deterministic random numbers. The whole city, the traffic and
// every staged screenshot draw from this generator, never from Math.random,
// so the same seed always builds the same Solmarina.

export class SeededRandom {
  constructor(seed = 7) {
    this.state = (seed >>> 0) || 7;
  }

  reseed(seed = 7) {
    this.state = (seed >>> 0) || 7;
  }

  // Mulberry32: small, fast, and stable across engines.
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + (max - min) * this.next();
  }

  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  chance(p) {
    return this.next() < p;
  }

  // A jittered value that stays deterministic for a given seed and index.
  jitter(index, amount) {
    const saved = this.state;
    this.state = (saved + index * 0x9e3779b9) >>> 0;
    const v = (this.next() - 0.5) * 2 * amount;
    this.state = saved;
    return v;
  }
}

export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
