import { useEffect, useState } from 'react';
import type { QRItem, QRSize, ErrorCorrection } from '@/types';
import { QR_SIZE_PX } from '@/types';
import { generateQRDataURL } from '@/lib/qr';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  item: QRItem;
  index: number;
  total: number;
  qrSize: QRSize;
  errorCorrection: ErrorCorrection;
  margin: number;
  regenToken: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
};

export function FullscreenMode({
  item,
  index,
  total,
  qrSize,
  errorCorrection,
  margin,
  regenToken,
  onPrev,
  onNext,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const size = QR_SIZE_PX[qrSize];
  const fsSize = Math.min(size * 1.4, Math.min(window.innerWidth - 64, window.innerHeight - 240));

  const [dataUrl, setDataUrl] = useState('');
  useEffect(() => {
    let cancelled = false;
    generateQRDataURL(item.value, fsSize, errorCorrection, margin).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => { cancelled = true; };
  }, [item.value, fsSize, errorCorrection, margin, regenToken]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-slate-950">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        aria-label="Exit fullscreen"
      >
        <X size={24} />
      </button>

      <div className="text-sm font-medium text-slate-400 dark:text-slate-500">
        {index + 1} / {total}
      </div>

      <div className="my-6 flex items-center justify-center">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR code for ${item.value}`}
            className="rounded-xl bg-white p-3 shadow-2xl"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div className="h-16 w-16 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        )}
      </div>

      <div className="font-mono text-2xl font-semibold tracking-wide text-slate-900 dark:text-white">
        {item.value}
      </div>

      <div className="mt-8 flex items-center gap-6">
        <button
          onClick={onPrev}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ChevronLeft size={18} /> Previous
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Next <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-10 text-xs text-slate-400 dark:text-slate-500">
        Arrow keys / Space / Enter to navigate · R regenerate · Esc to exit
      </div>
    </div>
  );
}
