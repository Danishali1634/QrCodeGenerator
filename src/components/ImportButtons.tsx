import { useRef, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { parseCSV } from '@/lib/csv';

type Props = {
  onText: (text: string, fileName: string) => void;
};

export function ImportButtons({ onText }: Props) {
  const txtRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][]; fileName: string } | null>(null);
  const [error, setError] = useState('');

  const readTextFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large (max 10MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onText(String(reader.result || ''), file.name);
    reader.onerror = () => setError('Could not read file.');
    reader.readAsText(file);
  };

  const handleTxt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (!/\.(txt|csv)$/i.test(file.name) && file.type && !file.type.startsWith('text/')) {
      setError('Please upload a .txt or .csv file.');
      return;
    }
    readTextFile(file);
    e.target.value = '';
  };

  const handleCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large (max 10MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parseCSV(text);
      if (parsed.rows.length === 0) {
        setError('CSV file is empty.');
        return;
      }
      setCsvData({ ...parsed, fileName: file.name });
    };
    reader.onerror = () => setError('Could not read CSV file.');
    reader.readAsText(file);
    e.target.value = '';
  };

  const pickColumn = (idx: number) => {
    if (!csvData) return;
    const values = csvData.rows.map((r) => r[idx] ?? '').join('\n');
    onText(values, csvData.fileName);
    setCsvData(null);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => txtRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <FileText size={15} /> Upload TXT
        </button>
        <button
          onClick={() => csvRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Upload size={15} /> Upload CSV
        </button>
        <input ref={txtRef} type="file" accept=".txt,.csv,text/plain" onChange={handleTxt} className="hidden" />
        <input ref={csvRef} type="file" accept=".csv,text/csv" onChange={handleCsv} className="hidden" />
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {csvData && (
        <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/50">
          <div className="mb-2 font-medium text-slate-700 dark:text-slate-200">
            Select column from "{csvData.fileName}" ({csvData.rows.length} rows):
          </div>
          <div className="flex flex-wrap gap-2">
            {csvData.headers.map((h, i) => (
              <button
                key={i}
                onClick={() => pickColumn(i)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {h || `Column ${i + 1}`}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCsvData(null)}
            className="mt-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
