import type { LucideIcon } from 'lucide-react';
import {
  Globe, Instagram, Facebook, Twitter, Linkedin, Youtube, Music2, Github,
  MessageCircle, Send, Type, Mail, Phone, MessageSquareText, Wifi, Contact,
  MapPin, CalendarDays, IndianRupee, Share2,
} from 'lucide-react';

export type FieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'textarea' | 'password' | 'datetime-local' | 'select';
  options?: { value: string; label: string }[];
  required?: boolean;
};

export type ContentType = {
  id: string;
  label: string;
  group: 'Social' | 'Essentials';
  icon: LucideIcon;
  fields: FieldDef[];
  build: (v: Record<string, string>) => string;
  sample: string;
  cta: string;
  brand?: { from: string; to: string };
};

const trim = (s: string | undefined) => (s ?? '').trim();

function withScheme(url: string): string {
  if (!url) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

// Accepts "@handle", "handle" or a full profile URL.
function profile(base: string, prefix = '') {
  return (v: Record<string, string>) => {
    const raw = trim(v.handle);
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw) || raw.includes('.com/')) return withScheme(raw);
    return `${base}${prefix}${raw.replace(/^@/, '')}`;
  };
}

const handleField = (placeholder: string): FieldDef => ({
  key: 'handle', label: 'Username or profile link', placeholder, required: true,
});

function escWifi(s: string): string {
  return s.replace(/([\\;,:"])/g, '\\$1');
}

function icsDate(local: string): string {
  // "2026-10-27T18:30" -> "20261027T183000"
  return local.replace(/[-:]/g, '').padEnd(15, '0').slice(0, 15);
}

const digits = (s: string) => s.replace(/[^\d+]/g, '');

// Platforms that can be bundled into one "All my socials" QR.
export const MULTI_LINKS: { key: string; typeId: string; field: string; label: string; placeholder: string }[] = [
  { key: 'ig', typeId: 'instagram', field: 'handle', label: 'Instagram', placeholder: '@username' },
  { key: 'fb', typeId: 'facebook', field: 'handle', label: 'Facebook', placeholder: 'your.page' },
  { key: 'x', typeId: 'x', field: 'handle', label: 'X / Twitter', placeholder: '@handle' },
  { key: 'li', typeId: 'linkedin', field: 'handle', label: 'LinkedIn', placeholder: 'profile-name' },
  { key: 'yt', typeId: 'youtube', field: 'handle', label: 'YouTube', placeholder: '@channel' },
  { key: 'tt', typeId: 'tiktok', field: 'handle', label: 'TikTok', placeholder: '@handle' },
  { key: 'gh', typeId: 'github', field: 'handle', label: 'GitHub', placeholder: 'username' },
  { key: 'wa', typeId: 'whatsapp', field: 'phone', label: 'WhatsApp', placeholder: '+92 300 1234567' },
  { key: 'tg', typeId: 'telegram', field: 'handle', label: 'Telegram', placeholder: '@username' },
  { key: 'web', typeId: 'url', field: 'url', label: 'Website', placeholder: 'example.com' },
  { key: 'mail', typeId: 'email', field: 'to', label: 'Email', placeholder: 'you@example.com' },
];

export const LINK_PAGE_PREFIX = '#/me?';

export function multiLinkUrl(key: string, value: string): string {
  const def = MULTI_LINKS.find((m) => m.key === key);
  return def ? getContentType(def.typeId).build({ [def.field]: value }) : '';
}

function defaultSite(): string {
  return typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}`;
}

export function isLocalAddress(url: string): boolean {
  return /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(url);
}

export const CONTENT_TYPES: ContentType[] = [
  {
    id: 'multi', label: 'All my socials', group: 'Social', icon: Share2,
    fields: [
      {
        key: 'mode', label: 'When scanned, open', type: 'select',
        options: [
          { value: 'page', label: 'A link page with all my profiles' },
          { value: 'vcard', label: 'A contact card with all my profiles' },
        ],
      },
      { key: 'name', label: 'Your name', placeholder: 'Danish Akhtar', required: true },
      ...MULTI_LINKS.map((m) => ({ key: m.key, label: m.label, placeholder: m.placeholder })),
      { key: 'site', label: 'Link page address (where QR Muse is hosted)', placeholder: 'https://your-qr-muse-site.com' },
    ],
    build: (v) => {
      const name = trim(v.name);
      const links = MULTI_LINKS.filter((m) => trim(v[m.key]));
      if (!name || links.length === 0) return '';
      if (v.mode === 'vcard') {
        return [
          'BEGIN:VCARD', 'VERSION:3.0', `FN:${name}`, `N:${name};;;;`,
          ...links.flatMap((m) => {
            const url = multiLinkUrl(m.key, v[m.key]);
            if (m.key === 'mail') return [`EMAIL:${trim(v[m.key])}`];
            if (m.key === 'web') return [`URL:${url}`];
            return [`X-SOCIALPROFILE;type=${m.label.split(' ')[0].toLowerCase()}:${url}`, `URL;type=${m.label.split(' ')[0]}:${url}`];
          }),
          'END:VCARD',
        ].join('\n');
      }
      const q = new URLSearchParams({ n: name });
      for (const m of links) q.set(m.key, trim(v[m.key]));
      const site = (trim(v.site) || defaultSite()).replace(/#.*$/, '');
      return `${withScheme(site)}${LINK_PAGE_PREFIX}${q.toString()}`;
    },
    sample: 'https://example.com/#/me?n=Me&ig=me', cta: 'FIND ME ONLINE',
    brand: { from: '#6366f1', to: '#ec4899' },
  },
  {
    id: 'instagram', label: 'Instagram', group: 'Social', icon: Instagram,
    fields: [handleField('@danishakhtar')],
    build: profile('https://instagram.com/'),
    sample: 'https://instagram.com/', cta: 'FOLLOW ME',
    brand: { from: '#dd2a7b', to: '#515bd4' },
  },
  {
    id: 'facebook', label: 'Facebook', group: 'Social', icon: Facebook,
    fields: [handleField('your.page')],
    build: profile('https://facebook.com/'),
    sample: 'https://facebook.com/', cta: 'LIKE US',
    brand: { from: '#1877f2', to: '#0b3d91' },
  },
  {
    id: 'x', label: 'X / Twitter', group: 'Social', icon: Twitter,
    fields: [handleField('@handle')],
    build: profile('https://x.com/'),
    sample: 'https://x.com/', cta: 'FOLLOW',
    brand: { from: '#0f1419', to: '#3a4450' },
  },
  {
    id: 'linkedin', label: 'LinkedIn', group: 'Social', icon: Linkedin,
    fields: [
      {
        key: 'kind', label: 'Profile type', type: 'select',
        options: [{ value: 'in', label: 'Person' }, { value: 'company', label: 'Company' }],
      },
      handleField('danish-akhtar'),
    ],
    build: (v) => profile(`https://www.linkedin.com/${v.kind || 'in'}/`)(v),
    sample: 'https://www.linkedin.com/', cta: 'CONNECT',
    brand: { from: '#0a66c2', to: '#004182' },
  },
  {
    id: 'youtube', label: 'YouTube', group: 'Social', icon: Youtube,
    fields: [handleField('@channel')],
    build: profile('https://youtube.com/', '@'),
    sample: 'https://youtube.com/', cta: 'SUBSCRIBE',
    brand: { from: '#ff0000', to: '#8b0000' },
  },
  {
    id: 'tiktok', label: 'TikTok', group: 'Social', icon: Music2,
    fields: [handleField('@handle')],
    build: profile('https://www.tiktok.com/', '@'),
    sample: 'https://www.tiktok.com/', cta: 'WATCH ME',
    brand: { from: '#111111', to: '#fe2c55' },
  },
  {
    id: 'github', label: 'GitHub', group: 'Social', icon: Github,
    fields: [handleField('username')],
    build: profile('https://github.com/'),
    sample: 'https://github.com/', cta: 'MY CODE',
    brand: { from: '#24292f', to: '#57606a' },
  },
  {
    id: 'whatsapp', label: 'WhatsApp', group: 'Social', icon: MessageCircle,
    fields: [
      { key: 'phone', label: 'Phone (with country code)', placeholder: '+92 300 1234567', required: true },
      { key: 'text', label: 'Pre-filled message', type: 'textarea', placeholder: 'Hi! I found you via your QR code.' },
    ],
    build: (v) => {
      const p = digits(trim(v.phone)).replace(/^\+/, '');
      if (!p) return '';
      const t = trim(v.text);
      return `https://wa.me/${p}${t ? `?text=${encodeURIComponent(t)}` : ''}`;
    },
    sample: 'https://wa.me/', cta: 'CHAT NOW',
    brand: { from: '#128c7e', to: '#075e54' },
  },
  {
    id: 'telegram', label: 'Telegram', group: 'Social', icon: Send,
    fields: [handleField('@username')],
    build: profile('https://t.me/'),
    sample: 'https://t.me/', cta: 'MESSAGE ME',
    brand: { from: '#1c8ad1', to: '#0b5a8c' },
  },
  {
    id: 'url', label: 'Website', group: 'Essentials', icon: Globe,
    fields: [{ key: 'url', label: 'Website URL', placeholder: 'example.com', required: true }],
    build: (v) => withScheme(trim(v.url)),
    sample: 'https://example.com', cta: 'SCAN ME',
  },
  {
    id: 'text', label: 'Text', group: 'Essentials', icon: Type,
    fields: [{ key: 'text', label: 'Text', type: 'textarea', placeholder: 'Any message…', required: true }],
    build: (v) => trim(v.text),
    sample: 'Hello from QR Muse', cta: 'SCAN ME',
  },
  {
    id: 'wifi', label: 'Wi‑Fi', group: 'Essentials', icon: Wifi,
    fields: [
      { key: 'ssid', label: 'Network name (SSID)', placeholder: 'Home Wi-Fi', required: true },
      { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
      {
        key: 'enc', label: 'Security', type: 'select',
        options: [
          { value: 'WPA', label: 'WPA / WPA2 / WPA3' },
          { value: 'WEP', label: 'WEP' },
          { value: 'nopass', label: 'None (open)' },
        ],
      },
      {
        key: 'hidden', label: 'Hidden network', type: 'select',
        options: [{ value: '', label: 'No' }, { value: 'true', label: 'Yes' }],
      },
    ],
    build: (v) => {
      const ssid = trim(v.ssid);
      if (!ssid) return '';
      const enc = v.enc || 'WPA';
      const pass = enc === 'nopass' ? '' : `P:${escWifi(v.password ?? '')};`;
      return `WIFI:T:${enc};S:${escWifi(ssid)};${pass}${v.hidden ? 'H:true;' : ''};`;
    },
    sample: 'WIFI:T:WPA;S:Guest;P:password;;', cta: 'JOIN WI‑FI',
  },
  {
    id: 'vcard', label: 'Contact card', group: 'Essentials', icon: Contact,
    fields: [
      { key: 'first', label: 'First name', placeholder: 'Danish', required: true },
      { key: 'last', label: 'Last name', placeholder: 'Akhtar' },
      { key: 'org', label: 'Company', placeholder: 'Company' },
      { key: 'title', label: 'Job title', placeholder: 'Designer' },
      { key: 'phone', label: 'Phone', placeholder: '+92 300 1234567' },
      { key: 'email', label: 'Email', placeholder: 'you@example.com' },
      { key: 'url', label: 'Website', placeholder: 'example.com' },
    ],
    build: (v) => {
      const first = trim(v.first);
      if (!first) return '';
      const last = trim(v.last);
      const lines = [
        'BEGIN:VCARD', 'VERSION:3.0',
        `N:${last};${first};;;`, `FN:${[first, last].filter(Boolean).join(' ')}`,
        trim(v.org) && `ORG:${trim(v.org)}`,
        trim(v.title) && `TITLE:${trim(v.title)}`,
        trim(v.phone) && `TEL;TYPE=CELL:${digits(v.phone)}`,
        trim(v.email) && `EMAIL:${trim(v.email)}`,
        trim(v.url) && `URL:${withScheme(trim(v.url))}`,
        'END:VCARD',
      ];
      return lines.filter(Boolean).join('\n');
    },
    sample: 'BEGIN:VCARD\nVERSION:3.0\nFN:Your Name\nEND:VCARD', cta: 'SAVE CONTACT',
  },
  {
    id: 'email', label: 'Email', group: 'Essentials', icon: Mail,
    fields: [
      { key: 'to', label: 'Email address', placeholder: 'you@example.com', required: true },
      { key: 'subject', label: 'Subject', placeholder: 'Hello!' },
      { key: 'body', label: 'Message', type: 'textarea' },
    ],
    build: (v) => {
      const to = trim(v.to);
      if (!to) return '';
      const q = new URLSearchParams();
      if (trim(v.subject)) q.set('subject', trim(v.subject));
      if (trim(v.body)) q.set('body', trim(v.body));
      const qs = q.toString().replace(/\+/g, '%20');
      return `mailto:${to}${qs ? `?${qs}` : ''}`;
    },
    sample: 'mailto:hello@example.com', cta: 'EMAIL ME',
  },
  {
    id: 'phone', label: 'Call', group: 'Essentials', icon: Phone,
    fields: [{ key: 'phone', label: 'Phone number', placeholder: '+92 300 1234567', required: true }],
    build: (v) => (digits(trim(v.phone)) ? `tel:${digits(v.phone)}` : ''),
    sample: 'tel:+10000000000', cta: 'CALL ME',
  },
  {
    id: 'sms', label: 'SMS', group: 'Essentials', icon: MessageSquareText,
    fields: [
      { key: 'phone', label: 'Phone number', placeholder: '+92 300 1234567', required: true },
      { key: 'text', label: 'Message', type: 'textarea' },
    ],
    build: (v) => (digits(trim(v.phone)) ? `SMSTO:${digits(v.phone)}:${trim(v.text)}` : ''),
    sample: 'SMSTO:+10000000000:Hi', cta: 'TEXT ME',
  },
  {
    id: 'location', label: 'Location', group: 'Essentials', icon: MapPin,
    fields: [{ key: 'q', label: 'Address or "lat, lng"', placeholder: 'Badshahi Mosque, Lahore', required: true }],
    build: (v) => {
      const q = trim(v.q);
      if (!q) return '';
      return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(q)
        ? `geo:${q.replace(/\s/g, '')}`
        : `https://maps.google.com/?q=${encodeURIComponent(q)}`;
    },
    sample: 'https://maps.google.com/?q=Lahore', cta: 'FIND US',
  },
  {
    id: 'event', label: 'Event', group: 'Essentials', icon: CalendarDays,
    fields: [
      { key: 'title', label: 'Event title', placeholder: 'Launch party', required: true },
      { key: 'start', label: 'Starts', type: 'datetime-local', required: true },
      { key: 'end', label: 'Ends', type: 'datetime-local' },
      { key: 'where', label: 'Location', placeholder: 'Venue' },
    ],
    build: (v) => {
      if (!trim(v.title) || !v.start) return '';
      return [
        'BEGIN:VEVENT',
        `SUMMARY:${trim(v.title)}`,
        `DTSTART:${icsDate(v.start)}`,
        v.end && `DTEND:${icsDate(v.end)}`,
        trim(v.where) && `LOCATION:${trim(v.where)}`,
        'END:VEVENT',
      ].filter(Boolean).join('\n');
    },
    sample: 'BEGIN:VEVENT\nSUMMARY:Event\nEND:VEVENT', cta: 'SAVE THE DATE',
  },
  {
    id: 'upi', label: 'UPI Payment', group: 'Essentials', icon: IndianRupee,
    fields: [
      { key: 'pa', label: 'UPI ID', placeholder: 'name@bank', required: true },
      { key: 'pn', label: 'Payee name', placeholder: 'Danish Akhtar' },
      { key: 'am', label: 'Amount (optional)', placeholder: '499' },
      { key: 'tn', label: 'Note', placeholder: 'Order #123' },
    ],
    build: (v) => {
      if (!trim(v.pa)) return '';
      const q = new URLSearchParams({ pa: trim(v.pa) });
      if (trim(v.pn)) q.set('pn', trim(v.pn));
      if (trim(v.am)) q.set('am', trim(v.am));
      if (trim(v.tn)) q.set('tn', trim(v.tn));
      q.set('cu', 'INR');
      return `upi://pay?${q.toString().replace(/\+/g, '%20')}`;
    },
    sample: 'upi://pay?pa=name@bank&cu=INR', cta: 'PAY HERE',
  },
];

export function getContentType(id: string): ContentType {
  return CONTENT_TYPES.find((t) => t.id === id) ?? CONTENT_TYPES[0];
}
