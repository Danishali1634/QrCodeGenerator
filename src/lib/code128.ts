// Minimal Code 128 encoder (sets B and C) for 1D barcode scanners.

const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];
const START_B = 104;
const START_C = 105;
const CODE_B = 100;
const STOP = 106;

function symbolValues(value: string): number[] {
  if (!value) throw new Error('Nothing to encode.');
  if (!/^[\x20-\x7e]+$/.test(value)) {
    throw new Error('Code 128 supports plain letters, digits and symbols only. Use QR for this value.');
  }
  const out: number[] = [];
  // Pure digit runs are packed two per symbol (set C), which makes a shorter, easier-to-scan barcode.
  if (/^\d{4,}$/.test(value)) {
    const even = value.length - (value.length % 2);
    out.push(START_C);
    for (let i = 0; i < even; i += 2) out.push(Number(value.slice(i, i + 2)));
    if (even < value.length) out.push(CODE_B, value.charCodeAt(even) - 32);
  } else {
    out.push(START_B);
    for (const ch of value) out.push(ch.charCodeAt(0) - 32);
  }
  const check = out.reduce((sum, v, i) => sum + v * (i === 0 ? 1 : i), 0) % 103;
  return [...out, check, STOP];
}

// Bar/space widths in modules, starting with a bar.
export function code128Widths(value: string): number[] {
  return symbolValues(value).flatMap((v) => PATTERNS[v].split('').map(Number));
}

const QUIET = 10;

export function code128Canvas(value: string, targetWidth: number, height: number): HTMLCanvasElement {
  const widths = code128Widths(value);
  const modules = widths.reduce((a, b) => a + b, 0) + QUIET * 2;
  const scale = Math.max(2, Math.floor(targetWidth / modules));
  const canvas = document.createElement('canvas');
  canvas.width = modules * scale;
  canvas.height = Math.round(height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  let x = QUIET * scale;
  widths.forEach((w, i) => {
    if (i % 2 === 0) ctx.fillRect(x, 0, w * scale, canvas.height);
    x += w * scale;
  });
  return canvas;
}
