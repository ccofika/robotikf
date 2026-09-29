// Vreme uvek po Srbiji (Europe/Belgrade), bez obzira na podešavanja računara
const TZ = 'Europe/Belgrade';
const pad = (n) => String(n).padStart(2, '0');

const fmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' });
const DOWS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function parts(date) {
  const p = {};
  fmt.formatToParts(new Date(date)).forEach((x) => { p[x.type] = x.value; });
  const hour = (+p.hour) % 24;
  return { ymd: `${p.year}-${p.month}-${p.day}`, hh: pad(hour), mm: p.minute, dow: DOWS[p.weekday], y: +p.year, m: +p.month, d: +p.day };
}

export const DAY_SHORT = ['ned', 'pon', 'uto', 'sre', 'čet', 'pet', 'sub'];
export const DAY_LONG = ['nedelja', 'ponedeljak', 'utorak', 'sreda', 'četvrtak', 'petak', 'subota'];
export const MONTHS = ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'];

export const hm = (d) => (d ? `${parts(d).hh}:${parts(d).mm}` : '');
export const ymdOf = (d) => parts(d).ymd;
export const todayYmd = () => parts(new Date()).ymd;
export const fmtYmd = (ymd) => { if (!ymd) return ''; const [y, m, d] = ymd.split('-'); return `${d}.${m}.${y}.`; };
export const fmtYmdShort = (ymd) => { if (!ymd) return ''; const [, m, d] = ymd.split('-'); return `${d}.${m}.`; };
export const fmtDate = (d) => (d ? fmtYmd(parts(d).ymd) : '');
export const fmtDateTime = (d) => (d ? `${fmtYmd(parts(d).ymd)} ${hm(d)}` : '');
export const dowOfYmd = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };

export function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
export function weekStart(ymd) {
  const dow = dowOfYmd(ymd);
  return addDays(ymd, dow === 0 ? -6 : 1 - dow);
}
export const monthOf = (ymd) => ymd.slice(0, 7);
export function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}`;
}
export const monthLabel = (month) => { const [y, m] = month.split('-').map(Number); return `${MONTHS[m - 1]} ${y}.`; };

// "danas", "sutra", "juče" ili datum
export function dayWord(ymd) {
  const t = todayYmd();
  if (ymd === t) return 'danas';
  if (ymd === addDays(t, 1)) return 'sutra';
  if (ymd === addDays(t, -1)) return 'juče';
  return `${DAY_SHORT[dowOfYmd(ymd)]} ${fmtYmdShort(ymd)}`;
}

export function durText(min) {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60), r = m % 60;
  if (h && r) return `${h} h ${r} min`;
  if (h) return `${h} h`;
  return `${r} min`;
}
export const hoursText = (min) => `${Math.floor(Math.max(0, min) / 60)}:${pad(Math.max(0, Math.round(min)) % 60)}`;

// "za 1 h 10 min" / "pre 5 min" / "sada"
export function relText(date, now = Date.now()) {
  const diff = Math.round((new Date(date).getTime() - now) / 60000);
  if (Math.abs(diff) < 1) return 'sada';
  return diff > 0 ? `za ${durText(diff)}` : `pre ${durText(-diff)}`;
}

export const rsd = (n) => `${Math.round(n || 0).toLocaleString('de-DE')} RSD`;
export const initials = (name = '') => name.split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
