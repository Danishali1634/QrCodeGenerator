import { useEffect, useState } from 'react';
import type { QRSize, ErrorCorrection } from '@/types';
import { QR_SIZE_PX } from '@/types';
import { generateQRDataURL } from '@/lib/qr';

type Props = {
  value: string;
  size: QRSize;
  errorCorrection: ErrorCorrection;
  margin: number;
  regenToken: number;
};

export function QRViewer({ value, size, errorCorrection, margin, regenToken }: Props) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setDataUrl('');
      return;
    }
    setError('');
    generateQRDataURL(value, QR_SIZE_PX[size], errorCorrection, margin)
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to generate QR code');
          setDataUrl('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [value, size, errorCorrection, margin, regenToken]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <img
        src={dataUrl}
        alt={`QR code for ${value}`}
        className="max-h-full max-w-full rounded-lg bg-white p-2 shadow-lg"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
