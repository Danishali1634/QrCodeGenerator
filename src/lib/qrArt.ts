import QRCode from 'qrcode';
import type { ErrorCorrection } from '@/types';

export type DotStyle = 'square' | 'rounded' | 'dots' | 'fluid' | 'diamond' | 'bars';
export type EyeFrameStyle = 'square' | 'rounded' | 'circle' | 'leaf';
export type EyeBallStyle = 'square' | 'rounded' | 'circle' | 'leaf' | 'diamond';
export type GradientType = 'none' | 'linear' | 'radial';
export type FrameStyle = 'none' | 'card' | 'pill' | 'minimal';

export type QRStyle = {
  dotStyle: DotStyle;
  eyeFrame: EyeFrameStyle;
  eyeBall: EyeBallStyle;
  fg: string;
  fg2: string;
  gradient: GradientType;
  angle: number;
  eyeColor: string | null; // null = follow the dot fill
  bg: string;
  transparent: boolean;
  bgRadius: number; // percent of the canvas side, 0–20
  margin: number;
  ecc: ErrorCorrection;
  logoScale: number; // fraction of the symbol width, 0.15–0.3
  logoPlate: boolean;
  frame: FrameStyle;
  frameText: string;
  frameColor: string;
  frameTextColor: string;
};

export type LogoSource =
  | { kind: 'image'; href: string }
  | { kind: 'svg'; inner: string; color: string };

export const DEFAULT_STYLE: QRStyle = {
  dotStyle: 'fluid',
  eyeFrame: 'rounded',
  eyeBall: 'circle',
  fg: '#4f46e5',
  fg2: '#db2777',
  gradient: 'linear',
  angle: 45,
  eyeColor: null,
  bg: '#ffffff',
  transparent: false,
  bgRadius: 6,
  margin: 3,
  ecc: 'Q',
  logoScale: 0.22,
  logoPlate: true,
  frame: 'none',
  frameText: 'SCAN ME',
  frameColor: '#111827',
  frameTextColor: '#ffffff',
};

const U = 10; // user units per module

const f = (n: number) => +n.toFixed(2);

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Rectangle with an individual radius per corner: [tl, tr, br, bl].
function rr(x: number, y: number, w: number, h: number, [tl, tr, br, bl]: number[]): string {
  return (
    `M${f(x + tl)} ${f(y)}H${f(x + w - tr)}` +
    (tr ? `A${f(tr)} ${f(tr)} 0 0 1 ${f(x + w)} ${f(y + tr)}` : '') +
    `V${f(y + h - br)}` +
    (br ? `A${f(br)} ${f(br)} 0 0 1 ${f(x + w - br)} ${f(y + h)}` : '') +
    `H${f(x + bl)}` +
    (bl ? `A${f(bl)} ${f(bl)} 0 0 1 ${f(x)} ${f(y + h - bl)}` : '') +
    `V${f(y + tl)}` +
    (tl ? `A${f(tl)} ${f(tl)} 0 0 1 ${f(x + tl)} ${f(y)}` : '') +
    'Z'
  );
}

function circle(cx: number, cy: number, r: number): string {
  return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
}

function diamond(x: number, y: number, s: number): string {
  const c = s / 2;
  return `M${f(x + c)} ${f(y)}L${f(x + s)} ${f(y + c)}L${f(x + c)} ${f(y + s)}L${f(x)} ${f(y + c)}Z`;
}

type Corner = 'tl' | 'tr' | 'bl';

function eyeFramePath(style: EyeFrameStyle, x: number, y: number, corner: Corner): string {
  const o = 7 * U;
  const i = 5 * U;
  switch (style) {
    case 'circle':
      return circle(x + o / 2, y + o / 2, o / 2) + circle(x + o / 2, y + o / 2, i / 2);
    case 'rounded':
      return rr(x, y, o, o, [2.2 * U, 2.2 * U, 2.2 * U, 2.2 * U]) + rr(x + U, y + U, i, i, [1.5 * U, 1.5 * U, 1.5 * U, 1.5 * U]);
    case 'leaf': {
      const big = corner === 'tl' ? [3 * U, 0, 3 * U, 0] : [0, 3 * U, 0, 3 * U];
      const small = big.map((v) => (v ? 2 * U : 0));
      return rr(x, y, o, o, big) + rr(x + U, y + U, i, i, small);
    }
    default:
      return rr(x, y, o, o, [0, 0, 0, 0]) + rr(x + U, y + U, i, i, [0, 0, 0, 0]);
  }
}

function eyeBallPath(style: EyeBallStyle, x: number, y: number, corner: Corner): string {
  const s = 3 * U;
  const bx = x + 2 * U;
  const by = y + 2 * U;
  switch (style) {
    case 'circle':
      return circle(bx + s / 2, by + s / 2, s / 2);
    case 'rounded':
      return rr(bx, by, s, s, [0.9 * U, 0.9 * U, 0.9 * U, 0.9 * U]);
    case 'leaf':
      return rr(bx, by, s, s, corner === 'tl' ? [1.4 * U, 0, 1.4 * U, 0] : [0, 1.4 * U, 0, 1.4 * U]);
    case 'diamond':
      return diamond(bx - 0.3 * U, by - 0.3 * U, s + 0.6 * U);
    default:
      return rr(bx, by, s, s, [0, 0, 0, 0]);
  }
}

let renderSeq = 0;

export type RenderResult = { svg: string; width: number; height: number; ecc: ErrorCorrection };

export function renderQRSvg(data: string, style: QRStyle, logo?: LogoSource | null): RenderResult {
  // A centre logo hides modules, so it needs the strongest error correction.
  const ecc: ErrorCorrection = logo ? 'H' : style.ecc;
  const qr = QRCode.create(data || ' ', { errorCorrectionLevel: ecc });
  const n = qr.modules.size;
  const m = style.margin;
  const side = (n + 2 * m) * U;
  const id = `qm${++renderSeq}`;

  // Layout of the optional frame around the symbol.
  let width = side;
  let height = side;
  let qx = 0;
  let qy = 0;
  const pad = 1.5 * U;
  if (style.frame === 'card') {
    width = side + 2 * pad;
    height = side + 2 * pad + 7 * U;
    qx = pad;
    qy = pad;
  } else if (style.frame === 'pill') {
    height = side + 9 * U;
  } else if (style.frame === 'minimal') {
    height = side + 6 * U;
  }
  const ox = qx + m * U;
  const oy = qy + m * U;

  // Modules hidden behind the logo.
  let logoBox: { start: number; size: number } | null = null;
  if (logo) {
    let ls = Math.round(n * Math.min(0.3, Math.max(0.12, style.logoScale)));
    if ((n - ls) % 2) ls += 1;
    logoBox = { start: (n - ls) / 2, size: ls };
  }
  const clearPad = style.logoPlate ? 1 : 0;
  const inLogo = (r: number, c: number) =>
    !!logoBox &&
    r >= logoBox.start - clearPad && r < logoBox.start + logoBox.size + clearPad &&
    c >= logoBox.start - clearPad && c < logoBox.start + logoBox.size + clearPad;
  const inFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const dark = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < n && c < n && !inFinder(r, c) && !inLogo(r, c) && !!qr.modules.get(r, c);

  let dots = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!dark(r, c)) continue;
      const x = ox + c * U;
      const y = oy + r * U;
      switch (style.dotStyle) {
        case 'dots':
          dots += circle(x + U / 2, y + U / 2, U * 0.42);
          break;
        case 'rounded':
          dots += rr(x + 0.05 * U, y + 0.05 * U, 0.9 * U, 0.9 * U, [3, 3, 3, 3]);
          break;
        case 'diamond':
          dots += diamond(x, y, U);
          break;
        case 'fluid': {
          const t = dark(r - 1, c), b = dark(r + 1, c), l = dark(r, c - 1), rt = dark(r, c + 1);
          const k = U / 2;
          dots += rr(x, y, U, U, [!t && !l ? k : 0, !t && !rt ? k : 0, !b && !rt ? k : 0, !b && !l ? k : 0]);
          break;
        }
        case 'bars': {
          const t = dark(r - 1, c), b = dark(r + 1, c);
          const k = 0.35 * U;
          dots += rr(x + 0.15 * U, y, 0.7 * U, U, [t ? 0 : k, t ? 0 : k, b ? 0 : k, b ? 0 : k]);
          break;
        }
        default:
          dots += `M${f(x)} ${f(y)}h${U + 0.02}v${U + 0.02}h${-(U + 0.02)}Z`;
      }
    }
  }

  const eyes: [number, number, Corner][] = [[0, 0, 'tl'], [0, n - 7, 'tr'], [n - 7, 0, 'bl']];
  let eyeFrames = '';
  let eyeBalls = '';
  for (const [r, c, corner] of eyes) {
    const x = ox + c * U;
    const y = oy + r * U;
    eyeFrames += eyeFramePath(style.eyeFrame, x, y, corner);
    eyeBalls += eyeBallPath(style.eyeBall, x, y, corner);
  }

  // Paint
  const defs: string[] = [];
  let fill = style.fg;
  if (style.gradient !== 'none') {
    const cx = ox + (n * U) / 2;
    const cy = oy + (n * U) / 2;
    const w = n * U;
    if (style.gradient === 'linear') {
      defs.push(
        `<linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="${f(cx - w / 2)}" y1="${f(cy)}" x2="${f(cx + w / 2)}" y2="${f(cy)}" gradientTransform="rotate(${style.angle} ${f(cx)} ${f(cy)})">` +
          `<stop offset="0" stop-color="${style.fg}"/><stop offset="1" stop-color="${style.fg2}"/></linearGradient>`,
      );
    } else {
      defs.push(
        `<radialGradient id="${id}g" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(w * 0.72)}">` +
          `<stop offset="0" stop-color="${style.fg}"/><stop offset="1" stop-color="${style.fg2}"/></radialGradient>`,
      );
    }
    fill = `url(#${id}g)`;
  }
  const eyeFill = style.eyeColor ?? fill;
  const plate = style.transparent ? '#ffffff' : style.bg;
  const radius = (Math.min(20, Math.max(0, style.bgRadius)) / 100) * side;

  const parts: string[] = [];

  // Background / frame
  if (style.frame === 'card') {
    parts.push(`<rect width="${width}" height="${height}" rx="${3 * U}" fill="${style.frameColor}"/>`);
    if (!style.transparent) {
      parts.push(`<rect x="${qx}" y="${qy}" width="${side}" height="${side}" rx="${2 * U}" fill="${style.bg}"/>`);
    }
  } else if (!style.transparent) {
    parts.push(`<rect width="${width}" height="${height}" rx="${f(radius)}" fill="${style.bg}"/>`);
  }
  if (style.frame === 'minimal') {
    const sw = 0.6 * U;
    parts.push(
      `<rect x="${sw / 2}" y="${sw / 2}" width="${width - sw}" height="${height - sw}" rx="${f(Math.max(radius, U))}" fill="none" stroke="${style.frameColor}" stroke-width="${sw}"/>`,
    );
  }

  parts.push(`<path fill="${fill}" d="${dots}"/>`);
  parts.push(`<path fill="${eyeFill}" fill-rule="evenodd" d="${eyeFrames}"/>`);
  parts.push(`<path fill="${eyeFill}" d="${eyeBalls}"/>`);

  // Logo
  if (logo && logoBox) {
    const lx = ox + logoBox.start * U;
    const ly = oy + logoBox.start * U;
    const ls = logoBox.size * U;
    if (style.logoPlate) {
      const pp = 0.6 * U;
      parts.push(`<rect x="${f(lx - pp)}" y="${f(ly - pp)}" width="${f(ls + 2 * pp)}" height="${f(ls + 2 * pp)}" rx="${f(ls * 0.22)}" fill="${plate}"/>`);
    }
    const inset = ls * 0.12;
    const ix = lx + inset;
    const iy = ly + inset;
    const is = ls - 2 * inset;
    if (logo.kind === 'image') {
      defs.push(`<clipPath id="${id}c"><rect x="${f(ix)}" y="${f(iy)}" width="${f(is)}" height="${f(is)}" rx="${f(is * 0.18)}"/></clipPath>`);
      parts.push(
        `<image href="${esc(logo.href)}" x="${f(ix)}" y="${f(iy)}" width="${f(is)}" height="${f(is)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}c)"/>`,
      );
    } else {
      parts.push(
        `<svg x="${f(ix)}" y="${f(iy)}" width="${f(is)}" height="${f(is)}" viewBox="0 0 24 24" fill="none" stroke="${logo.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${logo.inner}</svg>`,
      );
    }
  }

  // Call-to-action label
  const text = style.frameText.trim();
  if (style.frame !== 'none' && text) {
    const font = `font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="800" letter-spacing="1.5"`;
    const fit = (avail: number, max: number) => Math.min(max, avail / Math.max(1, text.length * 0.68));
    if (style.frame === 'card') {
      const fs = fit(width - 4 * U, 4 * U);
      const ty = qy + side + (height - qy - side) / 2;
      parts.push(`<text x="${f(width / 2)}" y="${f(ty)}" text-anchor="middle" dominant-baseline="central" font-size="${f(fs)}" fill="${style.frameTextColor}" ${font}>${esc(text)}</text>`);
    } else if (style.frame === 'pill') {
      const fs = fit(side - 8 * U, 3.4 * U);
      const pw = Math.min(side - 4 * U, text.length * fs * 0.68 + 6 * U);
      const ph = 6.4 * U;
      const px = (width - pw) / 2;
      const py = side + 0.8 * U;
      const cx = width / 2;
      parts.push(`<path fill="${style.frameColor}" d="M${f(cx - 1.4 * U)} ${f(py + 0.2)}L${f(cx)} ${f(py - 1.4 * U)}L${f(cx + 1.4 * U)} ${f(py + 0.2)}Z"/>`);
      parts.push(`<rect x="${f(px)}" y="${f(py)}" width="${f(pw)}" height="${f(ph)}" rx="${f(ph / 2)}" fill="${style.frameColor}"/>`);
      parts.push(`<text x="${f(cx)}" y="${f(py + ph / 2)}" text-anchor="middle" dominant-baseline="central" font-size="${f(fs)}" fill="${style.frameTextColor}" ${font}>${esc(text)}</text>`);
    } else {
      const fs = fit(side - 6 * U, 3.4 * U);
      parts.push(`<text x="${f(width / 2)}" y="${f(side + 2 * U)}" text-anchor="middle" dominant-baseline="central" font-size="${f(fs)}" fill="${style.frameColor}" ${font}>${esc(text)}</text>`);
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="geometricPrecision">` +
    (defs.length ? `<defs>${defs.join('')}</defs>` : '') +
    parts.join('') +
    '</svg>';
  return { svg, width, height, ecc };
}

export function withPixelSize(svg: string, w: number, h: number): string {
  return svg.replace(/width="[\d.]+" height="[\d.]+"/, `width="${w}" height="${h}"`);
}

export async function svgToCanvas(svg: string, width: number, height: number, targetWidth: number): Promise<HTMLCanvasElement> {
  const scale = targetWidth / width;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const url = URL.createObjectURL(new Blob([withPixelSize(svg, w, h)], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not render the QR image.'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available.');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function svgToPngBlob(svg: string, width: number, height: number, targetWidth: number): Promise<Blob> {
  const canvas = await svgToCanvas(svg, width, height, targetWidth);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed.'))), 'image/png');
  });
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const [r, g, b] = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Small stand-alone glyphs for the eye-style pickers.
export function eyePreviewSvg(frame: EyeFrameStyle | null, ball: EyeBallStyle | null): string {
  const d1 = frame ? eyeFramePath(frame, 0, 0, 'tl') : '';
  const d2 = ball ? eyeBallPath(ball, 0, 0, 'tl') : '';
  const ghost = frame ? '' : `<path fill="currentColor" opacity=".18" fill-rule="evenodd" d="${eyeFramePath('square', 0, 0, 'tl')}"/>`;
  const ghostBall = ball ? '' : `<path fill="currentColor" opacity=".18" d="${eyeBallPath('square', 0, 0, 'tl')}"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 82 82" width="100%" height="100%">${ghost}${ghostBall}` +
    (d1 ? `<path fill="currentColor" fill-rule="evenodd" d="${d1}"/>` : '') +
    (d2 ? `<path fill="currentColor" d="${d2}"/>` : '') +
    '</svg>'
  );
}
