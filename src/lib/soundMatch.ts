// Sound fingerprints for "auto-next on scanner beep".
// A fingerprint is the energy in log-spaced frequency bands, L2-normalised,
// so two sounds match when their spectra have the same shape (cosine similarity).

export const BAND_COUNT = 48;
const F_MIN = 300;
const F_MAX = 9000;

export type SoundProfile = {
  id: string;
  name: string;
  bands: number[];
  builtIn?: boolean;
  tone?: { freq: number; wave: OscillatorType; ms: number; repeat?: number };
  clip?: string; // WAV data URL of a recorded sound
};

const bandEdges = Array.from({ length: BAND_COUNT + 1 }, (_, i) => F_MIN * (F_MAX / F_MIN) ** (i / BAND_COUNT));

function bandOf(freq: number): number {
  return (Math.log(freq / F_MIN) / Math.log(F_MAX / F_MIN)) * BAND_COUNT;
}

function normalize(v: number[]): number[] {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < BAND_COUNT; i++) s += a[i] * b[i];
  return s;
}

// dB spectrum from AnalyserNode.getFloatFrequencyData -> normalised band vector.
export function spectrumToBands(db: Float32Array, sampleRate: number): number[] {
  const binHz = sampleRate / 2 / db.length;
  const out = new Array<number>(BAND_COUNT).fill(0);
  for (let b = 0; b < BAND_COUNT; b++) {
    const lo = Math.max(1, Math.floor(bandEdges[b] / binHz));
    const hi = Math.max(lo + 1, Math.ceil(bandEdges[b + 1] / binHz));
    let e = 0;
    for (let k = lo; k < hi && k < db.length; k++) e += 10 ** (db[k] / 10);
    out[b] = Math.sqrt(e);
  }
  return normalize(out);
}

export function averageBands(frames: number[][]): number[] {
  const sum = new Array<number>(BAND_COUNT).fill(0);
  for (const f of frames) for (let i = 0; i < BAND_COUNT; i++) sum[i] += f[i];
  return normalize(sum);
}

// Ideal fingerprint of a synthetic tone, including the harmonics of square/sawtooth waves.
function toneBands(freq: number, wave: OscillatorType): number[] {
  const out = new Array<number>(BAND_COUNT).fill(0);
  const partials: [number, number][] = [[1, 1]];
  if (wave === 'square') partials.push([3, 1 / 3], [5, 1 / 5], [7, 1 / 7]);
  if (wave === 'sawtooth') partials.push([2, 1 / 2], [3, 1 / 3], [4, 1 / 4]);
  if (wave === 'triangle') partials.push([3, 1 / 9], [5, 1 / 25]);
  for (const [h, amp] of partials) {
    const f = freq * h;
    if (f < F_MIN || f > F_MAX) continue;
    const c = bandOf(f);
    for (let i = 0; i < BAND_COUNT; i++) out[i] += amp * Math.exp(-(((i + 0.5 - c) / 0.7) ** 2));
  }
  return normalize(out);
}

const preset = (id: string, name: string, freq: number, wave: OscillatorType, ms: number, repeat?: number): SoundProfile => ({
  id, name, builtIn: true, tone: { freq, wave, ms, repeat }, bands: toneBands(freq, wave),
});

export const PRESET_SOUNDS: SoundProfile[] = [
  preset('handheld', 'Handheld scanner beep (2.7 kHz)', 2700, 'square', 110),
  preset('retail', 'Retail POS beep (3.2 kHz)', 3200, 'sine', 140),
  preset('highchirp', 'High chirp (4 kHz)', 4000, 'sine', 80),
  preset('wireless', 'Wireless scanner (2.2 kHz)', 2200, 'square', 120),
  preset('mobile', 'Phone scanner app (1.8 kHz)', 1800, 'sine', 150),
  preset('double', 'Double beep (2.5 kHz)', 2500, 'square', 70, 2),
  preset('low', 'Low beep (1 kHz)', 1000, 'triangle', 160),
];

let sharedCtx: AudioContext | null = null;

// One reusable context, resumed on every click: browsers start new contexts paused.
async function outputContext(): Promise<AudioContext> {
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new AudioContext();
  if (sharedCtx.state !== 'running') await sharedCtx.resume();
  return sharedCtx;
}

export function scheduleTone(ctx: BaseAudioContext, p: SoundProfile, at: number): void {
  if (!p.tone) return;
  const { freq, wave, ms, repeat = 1 } = p.tone;
  for (let i = 0; i < repeat; i++) {
    const t0 = at + (i * (ms + 70)) / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.25, t0 + 0.005);
    gain.gain.setValueAtTime(0.25, t0 + ms / 1000 - 0.01);
    gain.gain.linearRampToValueAtTime(0, t0 + ms / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + ms / 1000 + 0.02);
  }
}

// Plays a built-in tone, or the clip saved with a recorded sound.
export async function playSound(p: SoundProfile): Promise<void> {
  if (p.clip) {
    await new Audio(p.clip).play();
    return;
  }
  const ctx = await outputContext();
  scheduleTone(ctx, p, ctx.currentTime + 0.03);
}

// Cuts the loudest moment out of a recording and returns it as a small WAV data URL.
export function beepClip(buf: AudioBuffer): string {
  const data = buf.getChannelData(0);
  const win = Math.max(1, Math.round(buf.sampleRate * 0.01));
  let peakAt = 0;
  let peakE = 0;
  for (let i = 0; i + win <= data.length; i += win) {
    let e = 0;
    for (let k = i; k < i + win; k++) e += data[k] * data[k];
    if (e > peakE) {
      peakE = e;
      peakAt = i;
    }
  }
  const from = Math.max(0, peakAt - Math.round(buf.sampleRate * 0.25));
  const to = Math.min(data.length, peakAt + Math.round(buf.sampleRate * 0.45));
  const step = buf.sampleRate >= 44100 ? 2 : 1;
  const rate = Math.round(buf.sampleRate / step);
  let max = 1e-6;
  for (let i = from; i < to; i++) max = Math.max(max, Math.abs(data[i]));
  const count = Math.floor((to - from) / step);
  const out = new DataView(new ArrayBuffer(44 + count * 2));
  const str = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); out.setUint32(4, 36 + count * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, rate, true); out.setUint32(28, rate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
  str(36, 'data'); out.setUint32(40, count * 2, true);
  for (let j = 0; j < count; j++) {
    let v = 0;
    for (let k = 0; k < step; k++) v += data[from + j * step + k];
    v = (v / step / max) * 0.8;
    out.setInt16(44 + j * 2, Math.max(-1, Math.min(1, v)) * 0x7fff, true);
  }
  let bin = '';
  const bytes = new Uint8Array(out.buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:audio/wav;base64,${btoa(bin)}`;
}

// Dominant frequency of a fingerprint, for display.
export function peakHz(bands: number[]): number {
  let best = 0;
  for (let i = 1; i < bands.length; i++) if (bands[i] > bands[best]) best = i;
  return Math.round(Math.sqrt(bandEdges[best] * bandEdges[best + 1]));
}
