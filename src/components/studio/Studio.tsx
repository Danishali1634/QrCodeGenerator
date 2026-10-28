import { createElement, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Download, FileCode2, Copy, Check, Shuffle, Sparkles, Upload, ImageOff, BadgeCheck,
  ScanLine, AlertTriangle, Bookmark, Trash2, Loader2,
} from 'lucide-react';
import type { ErrorCorrection } from '@/types';
import { CONTENT_TYPES, getContentType, isLocalAddress } from '@/lib/qrPayloads';
import {
  DEFAULT_STYLE, renderQRSvg, svgToPngBlob, svgToCanvas, contrastRatio, eyePreviewSvg,
  type QRStyle, type DotStyle, type EyeFrameStyle, type EyeBallStyle, type GradientType,
  type FrameStyle, type LogoSource,
} from '@/lib/qrArt';
import { downloadBlob } from '@/lib/download';
import { sanitizeFilename } from '@/lib/qr';
import { Panel, Label, ColorField, Slider, Segmented, Switch, Tile, inputCls } from './controls';

type LogoMode = 'none' | 'icon' | 'upload';

type StudioState = {
  typeId: string;
  values: Record<string, Record<string, string>>;
  style: QRStyle;
  logoMode: LogoMode;
  logoData: string;
};

type SavedDesign = StudioState & { id: string; createdAt: number };

const STATE_KEY = 'qr-muse-studio-v1';
const LIBRARY_KEY = 'qr-muse-library-v1';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked; the studio still works without it
  }
}

const INITIAL: StudioState = {
  typeId: 'instagram',
  values: {},
  style: { ...DEFAULT_STYLE, frameText: 'FOLLOW ME' },
  logoMode: 'icon',
  logoData: '',
};

const THEMES: { name: string; style: Partial<QRStyle> }[] = [
  { name: 'Aurora', style: { fg: '#4f46e5', fg2: '#db2777', gradient: 'linear', angle: 45, bg: '#ffffff', dotStyle: 'fluid', eyeFrame: 'rounded', eyeBall: 'circle', eyeColor: null, frameColor: '#1e1b4b', frameTextColor: '#ffffff' } },
  { name: 'Sunset', style: { fg: '#ea580c', fg2: '#be123c', gradient: 'linear', angle: 135, bg: '#fff7ed', dotStyle: 'dots', eyeFrame: 'circle', eyeBall: 'circle', eyeColor: '#9f1239', frameColor: '#9f1239', frameTextColor: '#ffffff' } },
  { name: 'Ocean', style: { fg: '#0369a1', fg2: '#0f766e', gradient: 'radial', bg: '#f0f9ff', dotStyle: 'rounded', eyeFrame: 'leaf', eyeBall: 'leaf', eyeColor: '#0c4a6e', frameColor: '#0c4a6e', frameTextColor: '#ffffff' } },
  { name: 'Forest', style: { fg: '#166534', fg2: '#3f6212', gradient: 'linear', angle: 90, bg: '#f7fee7', dotStyle: 'bars', eyeFrame: 'rounded', eyeBall: 'rounded', eyeColor: '#14532d', frameColor: '#14532d', frameTextColor: '#ecfccb' } },
  { name: 'Rose', style: { fg: '#be185d', fg2: '#7e22ce', gradient: 'linear', angle: 20, bg: '#fdf2f8', dotStyle: 'diamond', eyeFrame: 'leaf', eyeBall: 'diamond', eyeColor: null, frameColor: '#831843', frameTextColor: '#ffffff' } },
  { name: 'Gold', style: { fg: '#78350f', fg2: '#b45309', gradient: 'radial', bg: '#fffbeb', dotStyle: 'fluid', eyeFrame: 'square', eyeBall: 'diamond', eyeColor: '#78350f', frameColor: '#78350f', frameTextColor: '#fef3c7' } },
  { name: 'Neon', style: { fg: '#a3e635', fg2: '#22d3ee', gradient: 'linear', angle: 30, bg: '#0b1020', dotStyle: 'dots', eyeFrame: 'circle', eyeBall: 'diamond', eyeColor: '#f0abfc', frameColor: '#a3e635', frameTextColor: '#0b1020' } },
  { name: 'Noir', style: { fg: '#0a0a0a', fg2: '#0a0a0a', gradient: 'none', bg: '#ffffff', dotStyle: 'square', eyeFrame: 'square', eyeBall: 'square', eyeColor: null, frameColor: '#0a0a0a', frameTextColor: '#ffffff' } },
];

const DOT_STYLES: { value: DotStyle; label: string }[] = [
  { value: 'fluid', label: 'Fluid' },
  { value: 'dots', label: 'Dots' },
  { value: 'rounded', label: 'Soft' },
  { value: 'bars', label: 'Bars' },
  { value: 'diamond', label: 'Gems' },
  { value: 'square', label: 'Classic' },
];
const EYE_FRAMES: { value: EyeFrameStyle; label: string }[] = [
  { value: 'rounded', label: 'Soft' },
  { value: 'circle', label: 'Ring' },
  { value: 'leaf', label: 'Leaf' },
  { value: 'square', label: 'Square' },
];
const EYE_BALLS: { value: EyeBallStyle; label: string }[] = [
  { value: 'circle', label: 'Dot' },
  { value: 'rounded', label: 'Soft' },
  { value: 'leaf', label: 'Leaf' },
  { value: 'diamond', label: 'Gem' },
  { value: 'square', label: 'Square' },
];

function hsl(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const c = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [c(0), c(8), c(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

function randomStyle(base: QRStyle): QRStyle {
  const h = Math.floor(Math.random() * 360);
  const h2 = (h + 40 + Math.floor(Math.random() * 120)) % 360;
  return {
    ...base,
    fg: hsl(h, 70 + Math.random() * 25, 28 + Math.random() * 10),
    fg2: hsl(h2, 70 + Math.random() * 25, 30 + Math.random() * 10),
    gradient: pick<GradientType>(['linear', 'linear', 'radial', 'none']),
    angle: Math.floor(Math.random() * 360),
    bg: hsl(h, 60, 97),
    transparent: false,
    dotStyle: pick(DOT_STYLES).value,
    eyeFrame: pick(EYE_FRAMES).value,
    eyeBall: pick(EYE_BALLS).value,
    eyeColor: Math.random() > 0.5 ? hsl(h2, 80, 25) : null,
    frameColor: hsl(h, 60, 18),
    frameTextColor: '#ffffff',
  };
}

type BarcodeDetectorCtor = new (opts: { formats: string[] }) => {
  detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};
const Detector = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;

type ScanState = 'idle' | 'checking' | 'ok' | 'mismatch' | 'fail' | 'unsupported';

function Svg({ markup, className }: { markup: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: markup }} />;
}

export function Studio() {
  const [state, setState] = useState<StudioState>(() => {
    const s = load<StudioState>(STATE_KEY, INITIAL);
    return { ...INITIAL, ...s, style: { ...DEFAULT_STYLE, ...s.style } };
  });
  const [library, setLibrary] = useState<SavedDesign[]>(() => load<SavedDesign[]>(LIBRARY_KEY, []));
  const [exportSize, setExportSize] = useState(1024);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  const [scan, setScan] = useState<ScanState>(Detector ? 'idle' : 'unsupported');
  const fileRef = useRef<HTMLInputElement>(null);

  const { style, typeId, logoMode, logoData } = state;
  const type = getContentType(typeId);
  const values = state.values[typeId] ?? {};
  const payload = type.build(values);
  const isPlaceholder = !payload;

  useEffect(() => save(STATE_KEY, state), [state]);
  useEffect(() => save(LIBRARY_KEY, library), [library]);

  const setStyle = (p: Partial<QRStyle>) => setState((s) => ({ ...s, style: { ...s.style, ...p } }));
  const setValue = (key: string, v: string) =>
    setState((s) => ({ ...s, values: { ...s.values, [s.typeId]: { ...(s.values[s.typeId] ?? {}), [key]: v } } }));

  const chooseType = (id: string) => {
    const next = getContentType(id);
    setState((s) => {
      const prev = getContentType(s.typeId);
      const keepText = s.style.frameText && s.style.frameText !== prev.cta;
      return {
        ...s,
        typeId: id,
        logoMode: s.logoMode === 'upload' ? 'upload' : next.group === 'Social' ? 'icon' : s.logoMode === 'icon' ? 'none' : s.logoMode,
        style: keepText ? s.style : { ...s.style, frameText: next.cta },
      };
    });
  };

  const iconInner = useMemo(
    () => renderToStaticMarkup(createElement(type.icon)).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''),
    [type],
  );

  const logo: LogoSource | null =
    logoMode === 'upload' && logoData
      ? { kind: 'image', href: logoData }
      : logoMode === 'icon'
        ? { kind: 'svg', inner: iconInner, color: style.eyeColor ?? style.fg }
        : null;

  const result = useMemo(() => {
    try {
      return renderQRSvg(payload || type.sample, style, logo);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'This content is too long for a QR code.' };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, type.sample, style, logoMode, logoData, iconInner]);

  const rendered = 'svg' in result ? result : null;

  // Live scannability check using the browser's own QR decoder, where available.
  useEffect(() => {
    if (!Detector || !rendered || isPlaceholder) {
      if (Detector) setScan('idle');
      return;
    }
    let cancelled = false;
    setScan('checking');
    const t = setTimeout(async () => {
      try {
        const canvas = await svgToCanvas(rendered.svg, rendered.width, rendered.height, 640);
        const hits = await new Detector({ formats: ['qr_code'] }).detect(canvas);
        if (cancelled) return;
        if (!hits.length) setScan('fail');
        else setScan(hits.some((h) => h.rawValue === payload) ? 'ok' : 'mismatch');
      } catch {
        if (!cancelled) setScan('unsupported');
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [rendered, payload, isPlaceholder]);

  const contrast = useMemo(() => {
    if (style.transparent) return null;
    const stops = style.gradient === 'none' ? [style.fg] : [style.fg, style.fg2];
    const min = Math.min(...stops.map((c) => contrastRatio(c, style.bg)));
    const inverted = contrastRatio(style.fg, '#000000') > contrastRatio(style.bg, '#000000');
    return { min, inverted };
  }, [style.fg, style.fg2, style.bg, style.gradient, style.transparent]);

  const notify = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(''), 1600);
  };

  const fileBase = () => sanitizeFilename(`qr-${type.id}-${Object.values(values).find(Boolean) ?? 'design'}`).slice(0, 60);

  const downloadPng = async () => {
    if (!rendered) return;
    setError('');
    try {
      const blob = await svgToPngBlob(rendered.svg, rendered.width, rendered.height, exportSize);
      downloadBlob(blob, `${fileBase()}.png`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    }
  };

  const downloadSvg = () => {
    if (!rendered) return;
    downloadBlob(new Blob([rendered.svg], { type: 'image/svg+xml' }), `${fileBase()}.svg`);
  };

  const copyImage = async () => {
    if (!rendered) return;
    setError('');
    try {
      const blob = svgToPngBlob(rendered.svg, rendered.width, rendered.height, 1024);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      notify('Image copied');
    } catch {
      setError('Your browser blocked image copy. Try Download PNG instead.');
    }
  };

  const saveToLibrary = () => {
    const entry: SavedDesign = {
      ...state,
      logoData: state.logoData.length < 300_000 ? state.logoData : '',
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setLibrary((l) => [entry, ...l].slice(0, 12));
    notify('Saved to your library');
  };

  const onUpload = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_000_000) {
      setError('Logo must be under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setState((s) => ({ ...s, logoMode: 'upload', logoData: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const dotPreviews = useMemo(
    () =>
      Object.fromEntries(
        DOT_STYLES.map((d) => [
          d.value,
          renderQRSvg('QR Muse', { ...DEFAULT_STYLE, dotStyle: d.value, gradient: 'none', fg: 'currentColor', eyeColor: null, frame: 'none', margin: 1, transparent: true, ecc: 'L' }).svg,
        ]),
      ),
    [],
  );

  const groups = ['Social', 'Essentials'] as const;
  const checker = 'repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 18px 18px';

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-8 dark:border-slate-800 dark:bg-slate-900 sm:px-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-fuchsia-500/30 to-indigo-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-gradient-to-br from-amber-400/20 to-rose-500/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
            <Sparkles size={13} /> QR Studio
          </span>
          <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
            QR codes people{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 bg-clip-text text-transparent">actually want</span>{' '}
            to scan.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            Social profiles, Wi‑Fi, contact cards, payments and more. Choose fluid shapes, gradients, your own logo and a
            call-to-action frame, then check that it scans before you print it.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          {/* Content type */}
          <Panel step="1" title="What should it open?" hint="Pick a destination, then fill in the details.">
            {groups.map((g) => (
              <div key={g} className="mb-4 last:mb-0">
                <Label>{g}</Label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-6">
                  {CONTENT_TYPES.filter((t) => t.group === g).map((t) => (
                    <Tile key={t.id} active={t.id === typeId} onClick={() => chooseType(t.id)} label={t.label}>
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm"
                        style={{ background: t.brand ? `linear-gradient(135deg, ${t.brand.from}, ${t.brand.to})` : 'linear-gradient(135deg,#475569,#1e293b)' }}
                      >
                        <t.icon size={18} />
                      </span>
                    </Tile>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:grid-cols-2">
              {type.fields.map((fd) => (
                <label key={fd.key} className={fd.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <Label>
                    {fd.label}
                    {fd.required && <span className="text-rose-500"> *</span>}
                  </Label>
                  {fd.type === 'textarea' ? (
                    <textarea
                      value={values[fd.key] ?? ''}
                      onChange={(e) => setValue(fd.key, e.target.value)}
                      placeholder={fd.placeholder}
                      rows={3}
                      className={`${inputCls} resize-y`}
                    />
                  ) : fd.type === 'select' ? (
                    <select value={values[fd.key] ?? fd.options?.[0]?.value ?? ''} onChange={(e) => setValue(fd.key, e.target.value)} className={inputCls}>
                      {fd.options?.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={fd.type ?? 'text'}
                      value={values[fd.key] ?? ''}
                      onChange={(e) => setValue(fd.key, e.target.value)}
                      placeholder={fd.placeholder}
                      className={inputCls}
                      spellCheck={false}
                    />
                  )}
                </label>
              ))}
            </div>
          </Panel>

          {/* Themes */}
          <Panel step="2" title="Pick a look" hint="Start from a theme, then fine-tune anything below.">
            <div className="flex flex-wrap gap-2">
              {type.brand && (
                <button
                  onClick={() => setStyle({ fg: type.brand!.from, fg2: type.brand!.to, gradient: 'linear', angle: 45, bg: '#ffffff', eyeColor: null, frameColor: type.brand!.to, frameTextColor: '#ffffff' })}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 py-1.5 pl-1.5 pr-3 text-xs font-semibold hover:shadow-md dark:border-slate-700"
                >
                  <span className="h-6 w-6 rounded-full" style={{ background: `linear-gradient(135deg, ${type.brand.from}, ${type.brand.to})` }} />
                  {type.label} colors
                </button>
              )}
              {THEMES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setStyle(t.style)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 py-1.5 pl-1.5 pr-3 text-xs font-semibold transition-shadow hover:shadow-md dark:border-slate-700"
                >
                  <span
                    className="h-6 w-6 rounded-full ring-2 ring-inset"
                    style={{
                      background: `linear-gradient(135deg, ${t.style.fg}, ${t.style.gradient === 'none' ? t.style.fg : t.style.fg2})`,
                      ['--tw-ring-color' as string]: t.style.bg,
                    }}
                  />
                  {t.name}
                </button>
              ))}
              <button
                onClick={() => setState((s) => ({ ...s, style: randomStyle(s.style) }))}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105"
              >
                <Shuffle size={13} /> Surprise me
              </button>
            </div>
          </Panel>

          {/* Pattern */}
          <Panel title="Pattern" hint="Shape of the data dots and the three corner eyes.">
            <Label>Dots</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {DOT_STYLES.map((d) => (
                <Tile key={d.value} label={d.label} active={style.dotStyle === d.value} onClick={() => setStyle({ dotStyle: d.value })}>
                  <Svg markup={dotPreviews[d.value]} className="h-14 w-14 text-slate-800 dark:text-slate-100 [&>svg]:h-full [&>svg]:w-full" />
                </Tile>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Eye frame</Label>
                <div className="grid grid-cols-4 gap-2">
                  {EYE_FRAMES.map((e) => (
                    <Tile key={e.value} label={e.label} active={style.eyeFrame === e.value} onClick={() => setStyle({ eyeFrame: e.value })}>
                      <Svg markup={eyePreviewSvg(e.value, null)} className="h-8 w-8" />
                    </Tile>
                  ))}
                </div>
              </div>
              <div>
                <Label>Eye center</Label>
                <div className="grid grid-cols-5 gap-2">
                  {EYE_BALLS.map((e) => (
                    <Tile key={e.value} label={e.label} active={style.eyeBall === e.value} onClick={() => setStyle({ eyeBall: e.value })}>
                      <Svg markup={eyePreviewSvg(null, e.value)} className="h-8 w-8" />
                    </Tile>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          {/* Colors */}
          <Panel title="Colors">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Fill</Label>
                <Segmented<GradientType>
                  value={style.gradient}
                  onChange={(v) => setStyle({ gradient: v })}
                  options={[{ value: 'none', label: 'Solid' }, { value: 'linear', label: 'Linear' }, { value: 'radial', label: 'Radial' }]}
                />
              </div>
              {style.gradient === 'linear' ? (
                <Slider label="Gradient angle" value={style.angle} min={0} max={360} onChange={(v) => setStyle({ angle: v })} format={(v) => `${v}°`} />
              ) : <div className="hidden sm:block" />}
              <ColorField label={style.gradient === 'none' ? 'Dot color' : 'Gradient start'} value={style.fg} onChange={(v) => setStyle({ fg: v })} />
              {style.gradient !== 'none' && <ColorField label="Gradient end" value={style.fg2} onChange={(v) => setStyle({ fg2: v })} />}
              <div className="space-y-2">
                <Switch label="Custom eye color" checked={style.eyeColor !== null} onChange={(v) => setStyle({ eyeColor: v ? style.fg : null })} />
                {style.eyeColor !== null && <ColorField label="Eye color" value={style.eyeColor} onChange={(v) => setStyle({ eyeColor: v })} />}
              </div>
              <div className="space-y-2">
                <Switch label="Transparent background" checked={style.transparent} onChange={(v) => setStyle({ transparent: v })} />
                {!style.transparent && <ColorField label="Background" value={style.bg} onChange={(v) => setStyle({ bg: v })} />}
              </div>
              {!style.transparent && style.frame !== 'card' && (
                <Slider label="Corner roundness" value={style.bgRadius} min={0} max={20} onChange={(v) => setStyle({ bgRadius: v })} format={(v) => `${v}%`} />
              )}
            </div>
          </Panel>

          {/* Logo */}
          <Panel title="Center logo" hint="Logos switch error correction to H so the code still scans.">
            <div className="grid grid-cols-3 gap-2 sm:max-w-md">
              <Tile label="None" active={logoMode === 'none'} onClick={() => setState((s) => ({ ...s, logoMode: 'none' }))}>
                <ImageOff size={22} className="my-1" />
              </Tile>
              <Tile label={`${type.label} icon`} active={logoMode === 'icon'} onClick={() => setState((s) => ({ ...s, logoMode: 'icon' }))}>
                <type.icon size={22} className="my-1" />
              </Tile>
              <Tile
                label={logoData ? 'Your logo' : 'Upload'}
                active={logoMode === 'upload'}
                onClick={() => (logoData ? setState((s) => ({ ...s, logoMode: 'upload' })) : fileRef.current?.click())}
              >
                {logoData ? <img src={logoData} alt="" className="my-0.5 h-7 w-7 rounded object-cover" /> : <Upload size={22} className="my-1" />}
              </Tile>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ''; }} />
            {logoMode !== 'none' && (
              <div className="mt-4 grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
                <Slider label="Logo size" value={Math.round(style.logoScale * 100)} min={14} max={30} onChange={(v) => setStyle({ logoScale: v / 100 })} format={(v) => `${v}%`} />
                <div className="flex flex-wrap items-center gap-4">
                  <Switch label="Background plate" checked={style.logoPlate} onChange={(v) => setStyle({ logoPlate: v })} />
                  {logoMode === 'upload' && (
                    <button onClick={() => fileRef.current?.click()} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                      Replace image
                    </button>
                  )}
                </div>
              </div>
            )}
          </Panel>

          {/* Frame */}
          <Panel title="Frame & call to action" hint="A short label tells people why they should scan.">
            <Segmented<FrameStyle>
              value={style.frame}
              onChange={(v) => setStyle({ frame: v })}
              options={[{ value: 'none', label: 'None' }, { value: 'card', label: 'Card' }, { value: 'pill', label: 'Bubble' }, { value: 'minimal', label: 'Outline' }]}
            />
            {style.frame !== 'none' && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label>
                  <Label>Label text</Label>
                  <input value={style.frameText} maxLength={24} onChange={(e) => setStyle({ frameText: e.target.value })} className={inputCls} />
                </label>
                <ColorField label="Frame color" value={style.frameColor} onChange={(v) => setStyle({ frameColor: v })} />
                {style.frame !== 'minimal' && <ColorField label="Label color" value={style.frameTextColor} onChange={(v) => setStyle({ frameTextColor: v })} />}
              </div>
            )}
          </Panel>

          {/* Advanced */}
          <Panel title="Advanced">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Error correction {logoMode !== 'none' && '(locked to H by logo)'}</Label>
                <Segmented<ErrorCorrection>
                  value={logoMode !== 'none' ? 'H' : style.ecc}
                  disabled={logoMode !== 'none'}
                  onChange={(v) => setStyle({ ecc: v })}
                  options={[{ value: 'L', label: 'L 7%' }, { value: 'M', label: 'M 15%' }, { value: 'Q', label: 'Q 25%' }, { value: 'H', label: 'H 30%' }]}
                />
              </div>
              <Slider label="Quiet zone" value={style.margin} min={1} max={6} onChange={(v) => setStyle({ margin: v })} format={(v) => `${v} modules`} />
            </div>
          </Panel>
        </div>

        {/* Preview */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-indigo-500/5 dark:border-slate-800 dark:bg-slate-900">
            <div
              className="relative flex items-center justify-center rounded-2xl p-6"
              style={{ background: style.transparent ? checker : 'linear-gradient(135deg, rgba(99,102,241,.08), rgba(236,72,153,.08))' }}
            >
              {rendered ? (
                <Svg
                  markup={rendered.svg}
                  className={`w-full max-w-[320px] drop-shadow-xl transition-opacity [&>svg]:h-auto [&>svg]:w-full ${isPlaceholder ? 'opacity-30' : ''}`}
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-center text-sm text-rose-600">{'error' in result ? result.error : ''}</div>
              )}
              {isPlaceholder && rendered && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-slate-900/85 px-4 py-2 text-xs font-semibold text-white shadow-lg">
                    Add your {type.label} details to go live
                  </span>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="mt-4 space-y-2">
              {!isPlaceholder && (
                <div className="truncate rounded-lg bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400" title={payload}>
                  {payload.replace(/\n/g, ' ⏎ ')}
                </div>
              )}
              {!isPlaceholder && <ScanBadge state={scan} />}
              {contrast && contrast.min < 3 && (
                <Warn>Low contrast ({contrast.min.toFixed(1)}:1). Darken the dots or lighten the background so phones can read it.</Warn>
              )}
              {contrast && contrast.min >= 3 && contrast.inverted && (
                <Warn>Light dots on a dark background. Most modern phones read this, but some older scanners don't.</Warn>
              )}
              {typeId === 'multi' && !isPlaceholder && isLocalAddress(payload) && (
                <Warn>
                  This link page points to your own computer (localhost), so phones can't open it yet. Put QR Muse online
                  (for example on Netlify or Vercel) and enter that address below, or switch to “contact card”, which works offline.
                </Warn>
              )}
              {typeId === 'multi' && !isPlaceholder && !isLocalAddress(payload) && values.mode !== 'vcard' && (
                <a href={payload} target="_blank" rel="noreferrer" className="block text-center text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                  Preview the link page ↗
                </a>
              )}
              {rendered && logoMode !== 'none' && style.logoScale > 0.26 && (
                <Warn>Large logo. Test it on your phone before printing.</Warn>
              )}
            </div>

            {/* Export */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={downloadPng}
                disabled={!rendered || isPlaceholder}
                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                <Download size={16} /> Download PNG
              </button>
              <div className="col-span-2">
                <Segmented<string>
                  value={String(exportSize)}
                  onChange={(v) => setExportSize(Number(v))}
                  options={[{ value: '512', label: '512px' }, { value: '1024', label: '1024px' }, { value: '2048', label: '2048px' }, { value: '4096', label: 'Print 4K' }]}
                />
              </div>
              <ActionButton onClick={downloadSvg} disabled={!rendered || isPlaceholder} icon={<FileCode2 size={15} />}>SVG</ActionButton>
              <ActionButton onClick={copyImage} disabled={!rendered || isPlaceholder} icon={<Copy size={15} />}>Copy image</ActionButton>
              <ActionButton onClick={saveToLibrary} disabled={!rendered || isPlaceholder} icon={<Bookmark size={15} />} wide>Save to library</ActionButton>
            </div>
            {flash && (
              <p className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Check size={13} /> {flash}
              </p>
            )}
            {error && <p className="mt-2 text-center text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          </div>

          {library.length > 0 && (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold">Your library</h3>
                <span className="text-xs text-slate-400">{library.length} saved</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {library.map((d) => (
                  <LibraryThumb
                    key={d.id}
                    design={d}
                    onOpen={() => setState({ typeId: d.typeId, values: { ...state.values, ...d.values }, style: { ...DEFAULT_STYLE, ...d.style }, logoMode: d.logoMode, logoData: d.logoData || state.logoData })}
                    onDelete={() => setLibrary((l) => l.filter((x) => x.id !== d.id))}
                  />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ActionButton({ onClick, disabled, icon, children, wide }: { onClick: () => void; disabled?: boolean; icon: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800 ${wide ? 'col-span-2' : ''}`}
    >
      {icon} {children}
    </button>
  );
}

function Warn({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function ScanBadge({ state }: { state: ScanState }) {
  const map: Record<ScanState, { cls: string; icon: ReactNode; text: string }> = {
    idle: { cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800', icon: <ScanLine size={14} />, text: 'Scan check ready' },
    checking: { cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', icon: <Loader2 size={14} className="animate-spin" />, text: 'Test-scanning your design…' },
    ok: { cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', icon: <BadgeCheck size={14} />, text: 'Scan verified: decodes to exactly your content' },
    mismatch: { cls: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200', icon: <AlertTriangle size={14} />, text: 'Scanned, but the result differs. Simplify the style.' },
    fail: { cls: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300', icon: <AlertTriangle size={14} />, text: 'Could not scan this design. Raise contrast, shrink the logo or use simpler dots.' },
    unsupported: { cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', icon: <ScanLine size={14} />, text: 'Automatic scan check needs Chrome or Edge. Test with your phone camera.' },
  };
  const s = map[state];
  return <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${s.cls}`}>{s.icon}{s.text}</div>;
}

function LibraryThumb({ design, onOpen, onDelete }: { design: SavedDesign; onOpen: () => void; onDelete: () => void }) {
  const markup = useMemo(() => {
    const t = getContentType(design.typeId);
    const data = t.build(design.values[design.typeId] ?? {}) || t.sample;
    const logo: LogoSource | null =
      design.logoMode === 'upload' && design.logoData ? { kind: 'image', href: design.logoData } : null;
    try {
      return renderQRSvg(data, { ...DEFAULT_STYLE, ...design.style }, logo).svg;
    } catch {
      return '';
    }
  }, [design]);
  return (
    <div className="group relative">
      <button onClick={onOpen} className="block w-full overflow-hidden rounded-xl border border-slate-200 p-1 transition-transform hover:scale-105 dark:border-slate-700" title={getContentType(design.typeId).label}>
        <Svg markup={markup} className="[&>svg]:h-auto [&>svg]:w-full" />
      </button>
      <button
        onClick={onDelete}
        className="absolute -right-1.5 -top-1.5 hidden rounded-full bg-slate-900 p-1 text-white shadow group-hover:block"
        title="Remove"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}
