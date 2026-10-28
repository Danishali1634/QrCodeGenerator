import type { ReactNode } from 'react';

export function Panel({ step, title, hint, children }: { step?: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-4 flex items-baseline gap-3">
        {step && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-[11px] font-bold text-white">
            {step}
          </span>
        )}
        <div>
          <h2 className="text-sm font-bold tracking-tight">{title}</h2>
          {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{children}</div>;
}

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-800">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 cursor-pointer rounded-md border-0 bg-transparent p-0"
        />
        <input
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase());
          }}
          className="w-full min-w-0 bg-transparent font-mono text-xs uppercase outline-none"
          spellCheck={false}
          key={value}
          defaultValue={value}
        />
      </div>
    </label>
  );
}

export function Slider({
  label, value, min, max, step = 1, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span className="tabular-nums text-slate-700 dark:text-slate-200">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600"
      />
    </label>
  );
}

export function Segmented<T extends string>({
  value, options, onChange, disabled,
}: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean;
}) {
  return (
    <div className={`flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800 ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-all ${
            value === o.value
              ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex items-center gap-2.5 text-sm">
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
      <span className="text-slate-700 dark:text-slate-200">{label}</span>
    </button>
  );
}

export function Tile({
  active, onClick, children, label,
}: {
  active: boolean; onClick: () => void; children: ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`group flex flex-col items-center gap-1.5 rounded-xl border p-2 text-[11px] font-semibold transition-all ${
        active
          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/25 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-200'
          : 'border-slate-200 text-slate-600 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600'
      }`}
    >
      {children}
      <span className="truncate">{label}</span>
    </button>
  );
}
