import { useEffect, useMemo, useState } from 'react';
import { AudioLines, Mic, MicOff, Play, Trash2, Wand2, Check, Loader2, X } from 'lucide-react';
import { PRESET_SOUNDS, cosine, peakHz, playSound, type SoundProfile } from '@/lib/soundMatch';
import { useSoundTrigger } from '@/hooks/useSoundTrigger';

type Saved = {
  selectedId: string;
  custom: SoundProfile[];
  sensitivity: number; // 1–10
  cooldownMs: number;
};

const KEY = 'qr-muse-sound-v1';
const DEFAULTS: Saved = { selectedId: PRESET_SOUNDS[0].id, custom: [], sensitivity: 6, cooldownMs: 800 };
const RECORD_MS = 4000;

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Saved>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

const thresholdFor = (sensitivity: number) => 0.95 - (sensitivity - 1) * 0.04;

type Teach =
  | { phase: 'idle' }
  | { phase: 'recording'; endsAt: number }
  | { phase: 'result'; bands: number[]; clip?: string; matches: { profile: SoundProfile; score: number }[] }
  | { phase: 'nothing' };

export function SoundAutoNext({ onNext, position }: { onNext: () => void; position: string }) {
  const [saved, setSaved] = useState<Saved>(loadSaved);
  const [teach, setTeach] = useState<Teach>({ phase: 'idle' });
  const [customName, setCustomName] = useState('My scanner');
  const [flash, setFlash] = useState(false);
  const [now, setNow] = useState(0);
  const [playError, setPlayError] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      // ignore
    }
  }, [saved]);

  const all = useMemo(() => [...saved.custom, ...PRESET_SOUNDS], [saved.custom]);
  const selected = all.find((p) => p.id === saved.selectedId) ?? PRESET_SOUNDS[0];
  const threshold = thresholdFor(saved.sensitivity);

  const mic = useSoundTrigger({
    target: teach.phase === 'idle' ? selected.bands : null,
    threshold,
    cooldownMs: saved.cooldownMs,
    onTrigger: () => {
      onNext();
      setFlash(true);
      setTimeout(() => setFlash(false), 350);
    },
  });

  useEffect(() => {
    if (teach.phase !== 'recording') return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [teach.phase]);

  const startTeach = async () => {
    if (!(await mic.start())) return;
    setTeach({ phase: 'recording', endsAt: Date.now() + RECORD_MS });
    const rec = await mic.record(RECORD_MS);
    if (!rec) {
      setTeach({ phase: 'nothing' });
      return;
    }
    const { bands, clip } = rec;
    const matches = PRESET_SOUNDS.map((profile) => ({ profile, score: cosine(bands, profile.bands) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    setTeach({ phase: 'result', bands, clip, matches });
  };

  const choose = (id: string) => {
    setSaved((s) => ({ ...s, selectedId: id }));
    setTeach({ phase: 'idle' });
  };

  const saveCustom = (bands: number[], clip?: string) => {
    const profile: SoundProfile = { id: `custom-${Date.now()}`, name: customName.trim() || 'My scanner', bands, clip };
    setSaved((s) => ({ ...s, custom: [profile, ...s.custom].slice(0, 5), selectedId: profile.id }));
    setTeach({ phase: 'idle' });
  };

  const removeCustom = (id: string) =>
    setSaved((s) => ({
      ...s,
      custom: s.custom.filter((p) => p.id !== id),
      selectedId: s.selectedId === id ? PRESET_SOUNDS[0].id : s.selectedId,
    }));

  const play = (p: SoundProfile) => {
    setPlayError('');
    playSound(p).catch(() => setPlayError('Your browser blocked audio playback. Check the tab is not muted and try again.'));
  };

  const scorePct = mic.lastScore === null ? null : Math.max(0, Math.round(mic.lastScore * 100));
  const btn = 'inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800';

  return (
    <section
      className={`mt-4 rounded-xl border bg-white p-4 transition-colors dark:bg-slate-900 ${
        flash ? 'border-emerald-400 ring-2 ring-emerald-400/40' : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${mic.listening ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
            <AudioLines size={18} className={mic.listening ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Auto-next by sound</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              When your scanner beeps, the next QR appears automatically. No clicking.
            </p>
          </div>
        </div>
        <button
          onClick={() => (mic.listening ? mic.stop() : mic.start())}
          disabled={teach.phase === 'recording'}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
            mic.listening ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {mic.listening ? <><MicOff size={16} /> Stop listening</> : <><Mic size={16} /> Start listening</>}
        </button>
      </div>

      {mic.error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{mic.error}</p>}

      {mic.listening && teach.phase === 'idle' && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/50">
          <span className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Mic</span>
            <span className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <span className="block h-full rounded-full bg-emerald-500 transition-[width] duration-75" style={{ width: `${mic.level * 100}%` }} />
            </span>
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            Last sound match:{' '}
            <strong className={scorePct !== null && scorePct >= threshold * 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}>
              {scorePct === null ? '–' : `${scorePct}%`}
            </strong>{' '}
            (needs {Math.round(threshold * 100)}%)
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            Auto-advanced: <strong className="text-slate-700 dark:text-slate-200">{mic.triggers}</strong> · now on {position}
          </span>
        </div>
      )}

      {/* Teach flow */}
      {teach.phase === 'recording' && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-3 text-sm dark:border-indigo-900 dark:bg-indigo-950/40">
          <Loader2 size={16} className="animate-spin text-indigo-600" />
          <span>
            <strong>Scan any code now</strong> so your scanner beeps. Listening for {Math.max(0, Math.ceil((teach.endsAt - now) / 1000))}s…
          </span>
          <span className="ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-indigo-200 dark:bg-indigo-900">
            <span className="block h-full bg-indigo-600 transition-[width] duration-75" style={{ width: `${mic.level * 100}%` }} />
          </span>
        </div>
      )}
      {teach.phase === 'nothing' && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs dark:border-amber-800 dark:bg-amber-950/40">
          <span>No beep heard. Turn the scanner volume up, move it closer to the microphone, then try again.</span>
          <button onClick={() => setTeach({ phase: 'idle' })} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
        </div>
      )}
      {teach.phase === 'result' && (
        <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 text-xs dark:border-indigo-900 dark:bg-indigo-950/30">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold">
              Heard a sound around {peakHz(teach.bands).toLocaleString()} Hz. Closest built-in sounds:
            </span>
            <button onClick={() => setTeach({ phase: 'idle' })} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
          </div>
          <div className="space-y-1.5">
            {teach.matches.map(({ profile, score }) => (
              <div key={profile.id} className="flex items-center gap-2">
                <span className="w-12 font-bold tabular-nums">{Math.max(0, Math.round(score * 100))}%</span>
                <span className="flex-1">{profile.name}</span>
                <button onClick={() => play(profile)} className={btn} title="Play"><Play size={12} /></button>
                <button onClick={() => choose(profile.id)} className={btn}><Check size={12} /> Use this</button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-indigo-200 pt-3 dark:border-indigo-900">
            <span className="text-slate-600 dark:text-slate-300">Or save the exact sound you recorded:</span>
            {teach.clip && (
              <button onClick={() => play({ id: 'rec', name: 'Recording', bands: teach.bands, clip: teach.clip })} className={btn}>
                <Play size={12} /> Hear it
              </button>
            )}
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-36 rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
            />
            <button onClick={() => saveCustom(teach.bands, teach.clip)} className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700">
              <Check size={12} /> Save my sound
            </button>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.4fr)_1fr_1fr]">
        <div>
          <div className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Trigger sound</div>
          <div className="flex gap-2">
            <select
              value={selected.id}
              onChange={(e) => choose(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {saved.custom.length > 0 && (
                <optgroup label="My sounds">
                  {saved.custom.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              )}
              <optgroup label="Built-in scanner sounds">
                {PRESET_SOUNDS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
            </select>
            <button
              onClick={() => play(selected)}
              disabled={!selected.tone && !selected.clip}
              className={btn}
              title={selected.tone || selected.clip ? 'Play this sound' : 'Recorded before playback was added. Teach it again to hear it.'}
            >
              <Play size={14} />
            </button>
            {!selected.builtIn && (
              <button onClick={() => removeCustom(selected.id)} className={btn} title="Delete this sound"><Trash2 size={14} /></button>
            )}
          </div>
          {playError && <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{playError}</p>}
          <button
            onClick={startTeach}
            disabled={teach.phase === 'recording'}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50 dark:text-indigo-400"
          >
            <Wand2 size={13} /> Teach it my scanner's sound
          </button>
        </div>
        <label className="block">
          <div className="mb-1 flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Sensitivity</span><span>{saved.sensitivity}</span>
          </div>
          <input type="range" min={1} max={10} value={saved.sensitivity} onChange={(e) => setSaved((s) => ({ ...s, sensitivity: Number(e.target.value) }))} className="w-full accent-emerald-600" />
          <div className="text-[11px] text-slate-400">Higher catches more beeps but may react to other sounds</div>
        </label>
        <label className="block">
          <div className="mb-1 flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Wait between scans</span><span>{(saved.cooldownMs / 1000).toFixed(1)}s</span>
          </div>
          <input type="range" min={300} max={3000} step={100} value={saved.cooldownMs} onChange={(e) => setSaved((s) => ({ ...s, cooldownMs: Number(e.target.value) }))} className="w-full accent-emerald-600" />
          <div className="text-[11px] text-slate-400">Stops one beep (or an echo) from skipping two codes</div>
        </label>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">
        Your sounds and settings are saved in this browser only. Audio is analysed on your device and never recorded or uploaded.
      </p>
    </section>
  );
}
