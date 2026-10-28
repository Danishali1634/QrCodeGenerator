import QRCode from 'qrcode';
import type { CodeFormat, ErrorCorrection } from '@/types';
import { code128Canvas } from '@/lib/code128';

// Whole pixels per module: fractional scaling makes some modules wider than
// others, which hardware imagers often refuse to read.
function integerScale(value: string, size: number, errorCorrection: ErrorCorrection, margin: number): number {
  const modules = QRCode.create(value, { errorCorrectionLevel: errorCorrection }).modules.size + margin * 2;
  return Math.max(2, Math.round(size / modules));
}

export async function generateQRDataURL(
  value: string,
  size: number,
  errorCorrection: ErrorCorrection,
  margin: number,
  format: CodeFormat = 'qr',
): Promise<string> {
  if (format === 'code128') {
    return code128Canvas(value, size * 1.6, size * 0.6).toDataURL('image/png');
  }
  return QRCode.toDataURL(value, {
    scale: integerScale(value, size, errorCorrection, margin),
    errorCorrectionLevel: errorCorrection,
    margin,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

export async function generateQRBlob(
  value: string,
  size: number,
  errorCorrection: ErrorCorrection,
  margin: number,
  format: CodeFormat = 'qr',
): Promise<Blob> {
  const dataUrl = await generateQRDataURL(value, size, errorCorrection, margin, format);
  const res = await fetch(dataUrl);
  return res.blob();
}

export function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'code';
}
