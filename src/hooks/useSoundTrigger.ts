import { useCallback, useEffect, useRef, useState } from 'react';
import { averageBands, beepClip, cosine, spectrumToBands } from '@/lib/soundMatch';

type Options = {
  target: number[] | null;
  threshold: number; // cosine similarity needed to count as a match, 0–1
  cooldownMs: number;
  onTrigger: () => void;
};

const TICK_MS = 20;
const HITS_NEEDED = 2;

export function useSoundTrigger(opts: Options) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [level, setLevel] = useState(0);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [triggers, setTriggers] = useState(0);

  const optsRef = useRef(opts);
  optsRef.current = opts;
  const audio = useRef<{ ctx: AudioContext; stream: MediaStream; analyser: AnalyserNode; timer: number } | null>(null);
  const floor = useRef(0.002);
  const hits = useRef(0);
  const lastTrigger = useRef(0);
  const capture = useRef<{ bands: number[]; rms: number }[] | null>(null);
  const tickNo = useRef(0);

  const stop = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    clearInterval(a.timer);
    a.stream.getTracks().forEach((t) => t.stop());
    a.ctx.close().catch(() => undefined);
    audio.current = null;
    setListening(false);
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    if (audio.current) return true;
    setError('');
    try {
      // Browser voice processing would filter out short beeps, so turn it all off.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const time = new Float32Array(analyser.fftSize);
      const freq = new Float32Array(analyser.frequencyBinCount);

      const timer = window.setInterval(() => {
        analyser.getFloatTimeDomainData(time);
        let sum = 0;
        for (let i = 0; i < time.length; i++) sum += time[i] * time[i];
        const rms = Math.sqrt(sum / time.length);
        if (++tickNo.current % 3 === 0) setLevel(Math.min(1, rms * 8));

        const loud = rms > Math.max(floor.current * 4, 0.008);
        if (!loud) {
          floor.current = floor.current * 0.97 + rms * 0.03;
          hits.current = 0;
          return;
        }
        analyser.getFloatFrequencyData(freq);
        const bands = spectrumToBands(freq, ctx.sampleRate);

        if (capture.current) {
          capture.current.push({ bands, rms });
          return;
        }
        const { target, threshold, cooldownMs, onTrigger } = optsRef.current;
        if (!target) return;
        const score = cosine(bands, target);
        setLastScore(score);
        hits.current = score >= threshold ? hits.current + 1 : 0;
        const now = performance.now();
        if (hits.current >= HITS_NEEDED && now - lastTrigger.current > cooldownMs) {
          lastTrigger.current = now;
          hits.current = 0;
          setTriggers((n) => n + 1);
          onTrigger();
        }
      }, TICK_MS);

      audio.current = { ctx, stream, analyser, timer };
      setListening(true);
      return true;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'Microphone permission was blocked. Allow it from the address bar and try again.'
          : name === 'NotFoundError'
            ? 'No microphone found on this device.'
            : 'Could not start the microphone.',
      );
      return false;
    }
  }, []);

  // Records for `ms` and returns the fingerprint of the loudest sound heard (plus a
  // playable clip of it when the browser can record), or null if nothing was heard.
  const record = useCallback(async (ms: number) => {
    if (!(await start()) || !audio.current) return null;
    const { stream, ctx } = audio.current;
    let recorder: MediaRecorder | null = null;
    const chunks: Blob[] = [];
    try {
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.start();
    } catch {
      recorder = null;
    }
    capture.current = [];
    await new Promise((r) => setTimeout(r, ms));
    const frames = capture.current ?? [];
    capture.current = null;
    let clip: string | undefined;
    if (recorder) {
      await new Promise<void>((resolve) => {
        recorder!.onstop = () => resolve();
        recorder!.stop();
      });
      try {
        const buf = await ctx.decodeAudioData(await new Blob(chunks).arrayBuffer());
        clip = beepClip(buf);
      } catch {
        // Fingerprint still works without a playable clip.
      }
    }
    if (frames.length < 2) return null;
    const peak = Math.max(...frames.map((f) => f.rms));
    return { bands: averageBands(frames.filter((f) => f.rms >= peak * 0.5).map((f) => f.bands)), clip };
  }, [start]);

  useEffect(() => stop, [stop]);

  return { listening, error, level, lastScore, triggers, start, stop, record };
}
