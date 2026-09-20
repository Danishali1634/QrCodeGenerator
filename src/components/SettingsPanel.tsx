import type { Settings, QRSize, ErrorCorrection } from '@/types';

type Props = {
  settings: Settings;
  update: (partial: Partial<Settings>) => void;
};

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <span>
        <span className="block text-slate-700 dark:text-slate-200">{label}</span>
        {hint && <span className="block text-xs text-slate-400 dark:text-slate-500">{hint}</span>}
      </span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="px-2 py-1.5">
      <div className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="flex rounded-md bg-slate-100 p-0.5 dark:bg-slate-800">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              value === opt.value
                ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsPanel({ settings, update }: Props) {
  return (
    <div className="space-y-1">
      <Toggle
        label="Remove duplicates"
        hint="Deduplicate codes on generation"
        checked={settings.removeDuplicates}
        onChange={(v) => update({ removeDuplicates: v })}
      />
      <Toggle
        label="Wrap around"
        hint="Loop from last back to first"
        checked={settings.wrapAround}
        onChange={(v) => update({ wrapAround: v })}
      />
      <Segmented<QRSize>
        label="QR Size"
        value={settings.qrSize}
        onChange={(v) => update({ qrSize: v })}
        options={[
          { value: 'small', label: 'S' },
          { value: 'medium', label: 'M' },
          { value: 'large', label: 'L' },
          { value: 'xl', label: 'XL' },
        ]}
      />
      <Segmented<ErrorCorrection>
        label="Error Correction"
        value={settings.errorCorrection}
        onChange={(v) => update({ errorCorrection: v })}
        options={[
          { value: 'L', label: 'L' },
          { value: 'M', label: 'M' },
          { value: 'Q', label: 'Q' },
          { value: 'H', label: 'H' },
        ]}
      />
      <div className="px-2 py-1.5">
        <div className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          Margin / Quiet Zone: {settings.margin}
        </div>
        <input
          type="range"
          min={0}
          max={8}
          step={1}
          value={settings.margin}
          onChange={(e) => update({ margin: Number(e.target.value) })}
          className="w-full accent-blue-600"
        />
      </div>
    </div>
  );
}
