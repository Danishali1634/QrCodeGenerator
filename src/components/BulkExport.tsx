import { useState } from 'react';
import JSZip from 'jszip';
import type { QRItem, ErrorCorrection, CodeFormat } from '@/types';
import { generateQRBlob } from '@/lib/qr';
import { sanitizeFilename } from '@/lib/qr';
import { downloadBlob } from '@/lib/download';
import { Download, Loader2 } from 'lucide-react';

type Props = {
  items: QRItem[];
  errorCorrection: ErrorCorrection;
  margin: number;
  size: number;
  format: CodeFormat;
  disabled?: boolean;
};

export function BulkExport({ items, errorCorrection, margin, size, format, disabled }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleExport = async () => {
    if (items.length === 0 || busy) return;
    setBusy(true);
    setError('');
    setProgress(0);
    try {
      const zip = new JSZip();
      const folder = zip.folder('qr-codes');
      if (!folder) throw new Error('Could not create ZIP folder.');
      const BATCH = 20;
      for (let i = 0; i < items.length; i += BATCH) {
        const batch = items.slice(i, i + BATCH);
        await Promise.all(
          batch.map(async (item) => {
            const blob = await generateQRBlob(item.value, size, errorCorrection, margin, format);
            folder.file(`${sanitizeFilename(item.value)}.png`, blob);
          }),
        );
        setProgress(Math.min(i + BATCH, items.length));
        await new Promise((r) => setTimeout(r, 0));
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, 'qr-codes.zip');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={disabled || busy || items.length === 0}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {busy ? `Exporting... ${progress}/${items.length}` : format === 'qr' ? 'Download All QR Codes' : 'Download All Barcodes'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
