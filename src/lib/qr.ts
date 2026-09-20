import QRCode from 'qrcode';
import type { ErrorCorrection } from '@/types';

export async function generateQRDataURL(
  value: string,
  size: number,
  errorCorrection: ErrorCorrection,
  margin: number,
): Promise<string> {
  return QRCode.toDataURL(value, {
    width: size,
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
): Promise<Blob> {
  const dataUrl = await QRCode.toDataURL(value, {
    width: size,
    errorCorrectionLevel: errorCorrection,
    margin,
    color: { dark: '#000000', light: '#ffffff' },
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

export function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'code';
}
