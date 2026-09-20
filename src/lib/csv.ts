export type ParsedCSV = {
  headers: string[];
  rows: string[][];
};

export function parseCSV(text: string): ParsedCSV {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
    }
    result.push(cur);
    return result;
  };

  const first = parseLine(lines[0]);
  const hasHeader = first.some((h) => h.trim().length > 0) && !first.every((c) => /^-?\d+(\.\d+)?$/.test(c.trim()));
  const headers = hasHeader ? first : first.map((_, i) => `Column ${i + 1}`);
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows = dataLines.map(parseLine);
  return { headers, rows };
}
