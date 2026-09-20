import type { QRItem } from '@/types';

let idCounter = 0;
export function makeId(): string {
  idCounter += 1;
  return `item-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

// Strip punctuation/symbols, keep alphanumerics, hyphens, underscores
function cleanToken(t: string): string {
  return t.replace(/[^a-zA-Z0-9_-]/g, '');
}

function tokenize(input: string): string[] {
  return input
    .split(/\s+/)
    .map((t) => cleanToken(t.trim()))
    .filter((t) => t.length > 0);
}

export function parseCodes(input: string, removeDuplicates: boolean): QRItem[] {
  const tokens = tokenize(input);
  if (removeDuplicates) {
    const seen = new Set<string>();
    const out: QRItem[] = [];
    for (const t of tokens) {
      if (!seen.has(t)) {
        seen.add(t);
        out.push({ id: makeId(), value: t });
      }
    }
    return out;
  }
  return tokens.map((t) => ({ id: makeId(), value: t }));
}

export function countDetected(input: string): number {
  return tokenize(input).length;
}

export function countUnique(input: string): number {
  return new Set(tokenize(input)).size;
}
