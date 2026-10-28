import { useId } from 'react';

const CREATOR = {
  name: 'Danish Akhtar',
  photo: '/danish-akhtar.jpg',
};

// QR Muse mark: three leaf-shaped finder eyes and a spark where the fourth would be.
export function BrandMark({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const eye = (x: number, y: number, flip: boolean) => {
    const [a, b] = flip ? [0, 8] : [8, 0];
    return (
      <g key={`${x}-${y}`}>
        <path
          fillRule="evenodd"
          d={
            `M${x + a} ${y}H${x + 18 - b}${b ? `A${b} ${b} 0 0 1 ${x + 18} ${y + b}` : ''}V${y + 18 - a}${a ? `A${a} ${a} 0 0 1 ${x + 18 - a} ${y + 18}` : ''}H${x + b}${b ? `A${b} ${b} 0 0 1 ${x} ${y + 18 - b}` : ''}V${y + a}${a ? `A${a} ${a} 0 0 1 ${x + a} ${y}` : ''}Z` +
            `M${x + 4} ${y + 4}h10v10h-10Z`
          }
        />
        <rect x={x + 6} y={y + 6} width={6} height={6} rx={2} />
      </g>
    );
  };
  return (
    <svg viewBox="0 0 64 64" className={className} aria-label="QR Muse logo" role="img">
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset=".55" stopColor="#c026d3" />
          <stop offset="1" stopColor="#f43f5e" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id}bg)`} />
      <g fill="#fff">
        {eye(9, 9, false)}
        {eye(37, 9, true)}
        {eye(9, 37, true)}
        <path d="M46 35c1 6.5 3 8.5 9.5 9.5-6.5 1-8.5 3-9.5 9.5-1-6.5-3-8.5-9.5-9.5 6.5-1 8.5-3 9.5-9.5Z" />
      </g>
    </svg>
  );
}

export function CreatorAvatar({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`relative inline-block shrink-0 rounded-full bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-rose-500 p-[2px] shadow-lg shadow-fuchsia-500/20 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={CREATOR.photo}
        alt={CREATOR.name}
        className="h-full w-full rounded-full border-2 border-white object-cover dark:border-slate-900"
        draggable={false}
      />
    </span>
  );
}
