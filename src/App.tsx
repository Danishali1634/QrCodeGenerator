import { useCallback, useEffect, useRef, useState } from 'react';
import {
  QrCode, Play, Trash2, ChevronLeft, ChevronRight, Download, Copy,
  Search, Maximize2, Sun, Moon, Monitor, X,
  AlertCircle, ShieldCheck, RotateCw, ListChecks,
} from 'lucide-react';
import type { ThemeMode } from '@/types';
import { QR_SIZE_PX } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useQueueStore } from '@/hooks/useQueueStore';
import { countDetected, countUnique } from '@/lib/parse';
import { sanitizeFilename, generateQRBlob } from '@/lib/qr';
import { downloadBlob } from '@/lib/download';
import { CodeQueue } from '@/components/CodeQueue';
import { QRViewer } from '@/components/QRViewer';
import { ProgressBar } from '@/components/ProgressBar';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ImportButtons } from '@/components/ImportButtons';
import { BulkExport } from '@/components/BulkExport';
import { FullscreenMode } from '@/components/FullscreenMode';

export default function App() {
  const { theme, changeTheme } = useTheme('system');
  const { restorable, persist, dismissRestore, clearAll } = usePersistedState();
  const store = useQueueStore();
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [resumeDismissed, setResumeDismissed] = useState(false);

  const hasItems = store.items.length > 0;
  const detectedCount = countDetected(inputText);
  const uniqueCount = countUnique(inputText);

  const doRestore = () => {
    if (!restorable) return;
    store.setItems(restorable.items);
    store.setCurrentIndex(restorable.currentIndex);
    store.updateSettings(restorable.settings);
    setInputText(restorable.inputText ?? '');
    if (restorable.theme) changeTheme(restorable.theme);
    dismissRestore();
    setResumeDismissed(true);
  };

  const skipRestore = () => {
    dismissRestore();
    setResumeDismissed(true);
  };

  useEffect(() => {
    if (hasItems || inputText) {
      persist({
        items: store.items,
        currentIndex: store.currentIndex,
        settings: store.settings,
        theme,
        inputText,
      });
    }
  }, [store.items, store.currentIndex, store.settings, theme, inputText, hasItems, persist]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!hasItems) return;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
      case 'Enter':
        e.preventDefault();
        store.next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        store.prev();
        break;
      case 'Home':
        e.preventDefault();
        store.first();
        break;
      case 'End':
        e.preventDefault();
        store.last();
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        store.regenerate();
        break;
      case 'Escape':
        if (fullscreen) return;
        setSearch('');
        setShowSettings(false);
        setConfirmClear(false);
        break;
    }
  }, [fullscreen, hasItems, store]);

  useKeyboardShortcuts(handleKey);

  const handleGenerate = () => {
    if (countDetected(inputText) === 0) return;
    store.generateQueue(inputText);
  };

  const handleClear = () => {
    if (hasItems && !confirmClear) {
      setConfirmClear(true);
      return;
    }
    store.reset();
    setInputText('');
    setSearch('');
    setConfirmClear(false);
    clearAll();
  };

  const handleCopyValue = async () => {
    if (!store.current) return;
    try {
      await navigator.clipboard.writeText(store.current.value);
      setCopyMsg('Copied!');
      setTimeout(() => setCopyMsg(''), 1500);
    } catch {
      setCopyMsg('Copy failed');
      setTimeout(() => setCopyMsg(''), 1500);
    }
  };

  const handleDownloadPNG = async () => {
    if (!store.current) return;
    setDownloadError('');
    try {
      const blob = await generateQRBlob(
        store.current.value,
        QR_SIZE_PX[store.settings.qrSize],
        store.settings.errorCorrection,
        store.settings.margin,
      );
      downloadBlob(blob, `${sanitizeFilename(store.current.value)}.png`);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed.');
    }
  };

  const themeIcon = theme === 'light' ? <Sun size={16} /> : theme === 'dark' ? <Moon size={16} /> : <Monitor size={16} />;
  const cycleTheme = () => {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    changeTheme(next);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <QrCode size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight sm:text-base">Asian QR / Barcode Testing Workbench</h1>
              <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                Bulk QR generation & scanner testing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasItems && (
              <button
                onClick={() => setFullscreen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                <Maximize2 size={15} /> <span className="hidden sm:inline">Fullscreen</span>
              </button>
            )}
            <button
              onClick={() => setShowSettings((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              <ListChecks size={15} /> <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              onClick={cycleTheme}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-2.5 py-1.5 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
              title={`Theme: ${theme}`}
            >
              {themeIcon}
            </button>
          </div>
        </div>
      </header>

      {restorable && !resumeDismissed && (
        <div className="mx-auto max-w-[1400px] px-4 pt-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-900 dark:bg-blue-950/50">
            <div className="flex items-center gap-2">
              <RotateCw size={16} className="text-blue-600 dark:text-blue-400" />
              <span className="text-slate-700 dark:text-slate-200">
                Previous session found: {restorable.items.length} codes, index {restorable.currentIndex + 1}.
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={doRestore}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                Resume
              </button>
              <button
                onClick={skipRestore}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1400px] px-4 py-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <label className="mb-2 block text-sm font-semibold">Paste Codes</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your barcode/code values here... (separated by spaces, tabs, or new lines)"
            className="h-28 w-full resize-y rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            spellCheck={false}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <ImportButtons onText={(text) => setInputText((prev) => (prev ? prev + '\n' + text : text))} />
              {detectedCount > 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {store.settings.removeDuplicates && uniqueCount !== detectedCount
                    ? `${detectedCount} codes detected · ${uniqueCount} unique`
                    : `${detectedCount} codes detected`}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={detectedCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play size={16} /> Generate QR Queue
              </button>
              <button
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                <Trash2 size={16} /> Clear
              </button>
            </div>
          </div>
          {confirmClear && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-800 dark:bg-amber-950/50">
              <AlertCircle size={16} className="text-amber-600" />
              <span className="flex-1 text-slate-700 dark:text-slate-200">
                You have {store.items.length} codes loaded. Clear everything?
              </span>
              <button
                onClick={handleClear}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Yes, Clear
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          )}
        </section>

        {hasItems ? (
          <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
            <div className="flex flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 p-3 dark:border-slate-800">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Code Queue</h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {store.items.length} total
                  </span>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search codes..."
                    className="w-full rounded-md border border-slate-300 bg-slate-50 py-1.5 pl-8 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={store.items.length}
                    placeholder="Go to #"
                    className="w-20 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const n = parseInt((e.target as HTMLInputElement).value, 10);
                        if (!isNaN(n)) store.goTo(n - 1);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                      const n = parseInt(input.value, 10);
                      if (!isNaN(n)) store.goTo(n - 1);
                      input.value = '';
                    }}
                    className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                  >
                    Go
                  </button>
                </div>
              </div>
              <div className="h-[420px] overflow-hidden">
                <CodeQueue
                  items={store.items}
                  currentIndex={store.currentIndex}
                  search={search}
                  onSelect={store.goToId}
                />
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold tabular-nums">
                    {store.currentIndex + 1} / {store.items.length}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {store.items.length - store.currentIndex - 1} remaining
                  </span>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-center rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50" style={{ minHeight: '380px' }}>
                {store.current && (
                  <QRViewer
                    value={store.current.value}
                    size={store.settings.qrSize}
                    errorCorrection={store.settings.errorCorrection}
                    margin={store.settings.margin}
                    regenToken={store.regenToken}
                  />
                )}
              </div>

              <div className="mt-3 text-center">
                <div className="font-mono text-lg font-semibold tracking-wide">{store.current?.value}</div>
              </div>

              <div className="mt-4">
                <ProgressBar
                  current={store.currentIndex}
                  total={store.items.length}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={store.prev}
                  disabled={store.currentIndex === 0 && !store.settings.wrapAround}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <button
                  onClick={store.next}
                  disabled={store.currentIndex === store.items.length - 1 && !store.settings.wrapAround}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={handleDownloadPNG}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  <Download size={14} /> Download PNG
                </button>
                <button
                  onClick={handleCopyValue}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  <Copy size={14} /> Copy Value
                </button>
                <button
                  onClick={store.regenerate}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  <RotateCw size={14} /> Regenerate
                </button>
              </div>
              {copyMsg && <p className="mt-1 text-center text-xs text-emerald-600 dark:text-emerald-400">{copyMsg}</p>}
              {downloadError && <p className="mt-1 text-center text-xs text-red-600 dark:text-red-400">{downloadError}</p>}
            </div>
          </section>
        ) : (
          <section className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
            <QrCode size={48} className="mb-4 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No codes loaded. Paste your codes above to begin.
            </p>
          </section>
        )}

        {hasItems && (
          <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="font-medium">Total: {store.items.length}</span>
              <span className="text-slate-500 dark:text-slate-400">Current: {store.currentIndex + 1}</span>
            </div>
            <BulkExport
              items={store.items}
              errorCorrection={store.settings.errorCorrection}
              margin={store.settings.margin}
              size={QR_SIZE_PX[store.settings.qrSize]}
            />
          </section>
        )}

        <footer className="mt-4 flex items-center justify-center gap-2 pb-8 text-xs text-slate-400 dark:text-slate-600">
          <ShieldCheck size={14} />
          <span>Your codes stay in your browser. No barcode data is uploaded to a server.</span>
        </footer>
      </main>

      {showSettings && (
        <div className="fixed right-4 top-16 z-40 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Settings</h3>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          <SettingsPanel settings={store.settings} update={store.updateSettings} />
        </div>
      )}

      {fullscreen && store.current && (
        <FullscreenMode
          item={store.current}
          index={store.currentIndex}
          total={store.items.length}
          qrSize={store.settings.qrSize}
          errorCorrection={store.settings.errorCorrection}
          margin={store.settings.margin}
          regenToken={store.regenToken}
          onPrev={store.prev}
          onNext={store.next}
          onClose={() => setFullscreen(false)}
        />
      )}
    </div>
  );
}
