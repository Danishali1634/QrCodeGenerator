import { useEffect, useRef } from 'react';
import type { QRItem } from '@/types';

type Props = {
  items: QRItem[];
  currentIndex: number;
  search: string;
  onSelect: (id: string) => void;
};

export function CodeQueue({ items, currentIndex, search, onSelect }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const q = search.trim().toLowerCase();
  const filtered = q ? items.filter((i) => i.value.toLowerCase().includes(q)) : items;

  useEffect(() => {
    if (activeRef.current && listRef.current) {
      const el = activeRef.current;
      const container = listRef.current;
      const elTop = el.offsetTop;
      const elBottom = elTop + el.offsetHeight;
      if (elTop < container.scrollTop) {
        container.scrollTo({ top: elTop - 8, behavior: 'auto' });
      } else if (elBottom > container.scrollTop + container.clientHeight) {
        container.scrollTo({ top: elBottom - container.clientHeight + 8, behavior: 'auto' });
      }
    }
  }, [currentIndex, q]);

  if (q && filtered.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
        No codes match "{search}"
      </div>
    );
  }

  return (
    <div ref={listRef} className="h-full overflow-y-auto py-1">
      {filtered.map((item) => {
        const realIdx = items.findIndex((i) => i.id === item.id);
        const isActive = realIdx === currentIndex;
        return (
          <button
            key={item.id}
            ref={isActive ? activeRef : undefined}
            onClick={() => onSelect(item.id)}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            aria-current={isActive ? 'true' : undefined}
          >
            <span className="w-5 shrink-0 text-center">
              {isActive ? '→' : ''}
            </span>
            <span className="w-10 shrink-0 text-xs tabular-nums opacity-60">
              {realIdx + 1}
            </span>
            <span className="truncate font-mono">{item.value}</span>
          </button>
        );
      })}
    </div>
  );
}
