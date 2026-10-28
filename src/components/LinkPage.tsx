import { ArrowUpRight } from 'lucide-react';
import { MULTI_LINKS, LINK_PAGE_PREFIX, getContentType, multiLinkUrl } from '@/lib/qrPayloads';
import { BrandMark } from '@/components/Brand';

// Public "link in bio" page opened by an "All my socials" QR. Everything it shows comes from the URL.
export function LinkPage({ hash }: { hash: string }) {
  const q = new URLSearchParams(hash.slice(LINK_PAGE_PREFIX.length));
  const name = q.get('n') || 'My links';
  const links = MULTI_LINKS.filter((m) => q.get(m.key)).map((m) => {
    const type = getContentType(m.typeId);
    return { ...m, type, url: multiLinkUrl(m.key, q.get(m.key) ?? ''), handle: q.get(m.key) ?? '' };
  }).filter((l) => /^(https?:|mailto:|tel:)/i.test(l.url)); // the URL is untrusted input
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12 text-white">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/30 blur-3xl" />
      <main className="relative mx-auto flex max-w-md flex-col items-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-rose-500 p-[3px] shadow-2xl shadow-fuchsia-500/30">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950 text-3xl font-black">{initials}</div>
        </div>
        <h1 className="mt-5 text-center text-3xl font-black tracking-tight">{name}</h1>
        <p className="mt-1 text-sm text-slate-400">Find me everywhere</p>

        <ul className="mt-8 w-full space-y-3">
          {links.map((l) => (
            <li key={l.key}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3 pr-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-lg"
                  style={{ background: l.type.brand ? `linear-gradient(135deg, ${l.type.brand.from}, ${l.type.brand.to})` : 'linear-gradient(135deg,#475569,#1e293b)' }}
                >
                  <l.type.icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{l.label}</span>
                  <span className="block truncate text-xs text-slate-400">{l.handle}</span>
                </span>
                <ArrowUpRight size={18} className="text-slate-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
              </a>
            </li>
          ))}
        </ul>

        <a href={window.location.pathname} className="mt-12 flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300">
          <BrandMark className="h-5 w-5" /> Made with QR Muse
        </a>
      </main>
    </div>
  );
}
