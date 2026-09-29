// Osnovni elementi novog Security izgleda (sx-): dugme sa kupolom, lampica stanja, oznake,
// odbrojavanje, krug obilaska. Stil je u sx.css i overlays.css.
import React, { useEffect, useState } from 'react';

export const cx = (...a) => a.filter(Boolean).join(' ');

// Množina uz broj (srpski ima tri oblika): 1 smena, 2-4 smene, 5+ smena (11-14 kao 5+)
export function plural(n, one, few, many) {
  const m10 = Math.abs(n) % 10, m100 = Math.abs(n) % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
export const withCount = (n, one, few, many) => `${Number(n || 0).toLocaleString('sr-Latn-RS')} ${plural(Number(n || 0), one, few, many)}`;
export const telOf = (phone) => (phone ? `tel:${String(phone).replace(/[^0-9+]/g, '')}` : undefined);

// Širina elementa (ResizeObserver), za raspored koji zavisi od prostora a ne od ekrana
export function useWidth(ref) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => { const cr = entries[0] && entries[0].contentRect; if (cr) setW(Math.round(cr.width)); });
    ro.observe(el);
    setW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

// Stanje u tabeli: znak (ISO oblik) + tekst, opciono sitan dodatak
export const Sign = ({ tone = 'idle', live, children, sub, className, testId, title }) => (
  <span className={cx('sx-sign', `is-${tone}`, className)} data-testid={testId} title={title}><Led tone={tone} live={live} />{children}{sub && <small>{sub}</small>}</span>
);

// Dugme (ili link, kad ima href): pilula, ispuna "kupola" ulazi odozdo i izlazi kroz vrh
export const Btn = React.forwardRef(function Btn({ variant = 'secondary', size, icon: Icon, iconRight: IconRight, busy, href, className, children, type = 'button', ...rest }, ref) {
  const cls = cx('sx-btn sx-fill', variant !== 'secondary' && `sx-btn--${variant}`, size && `sx-btn--${size}`, !children && Icon && 'sx-btn--icon', busy && 'is-busy', className);
  const inner = (
    <>
      {Icon ? <Icon aria-hidden="true" strokeWidth={1.9} /> : null}
      {children}
      {IconRight ? <IconRight aria-hidden="true" strokeWidth={1.9} /> : null}
    </>
  );
  if (href) return <a ref={ref} href={href} className={cls} {...rest}>{inner}</a>;
  return <button ref={ref} type={type} className={cls} disabled={rest.disabled || busy} aria-busy={busy || undefined} {...rest}>{inner}</button>;
});

export const Led = ({ tone = 'idle', live, lg, className, title }) => (
  <span className={cx('sx-led', lg && 'sx-led--lg', className)} data-tone={tone} data-live={live ? 'true' : undefined} aria-hidden={title ? undefined : 'true'} title={title} />
);

export const State = ({ tone = 'idle', live, children, testId }) => (
  <span className="sx-state" data-tone={tone} data-testid={testId}><Led tone={tone} live={live} />{children}</span>
);

export const Flag = ({ tone, icon: Icon, children, title }) => (
  <span className="sx-flag" data-tone={tone} title={title}>{Icon && <Icon aria-hidden="true" strokeWidth={2} />}{children}</span>
);

export const Eyebrow = ({ children, className }) => <span className={cx('sx-eyebrow', className)}>{children}</span>;
export const Count = ({ children }) => <span className="sx-count">{children}</span>;
export const Kbd = ({ children }) => <kbd className="sx-kbd">{children}</kbd>;
export const initials = (name = '') => name.split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
export const Avatar = ({ name, className }) => <span className={cx('sx-avatar', className)} aria-hidden="true">{initials(name)}</span>;
export const Skeleton = ({ h = 16, w = '100%', r, style, className }) => <div className={cx('sx-skeleton', className)} style={{ height: h, width: w, borderRadius: r, ...style }} />;

export function Empty({ title, text, action }) {
  return (
    <div className="sx-empty">
      {title && <b>{title}</b>}
      {text && <span>{text}</span>}
      {action}
    </div>
  );
}

// Sat koji otkucava; komponente koje ga koriste se osvežavaju same, bez ponovnog crtanja cele strane
export function useTick(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

const pad = (n) => String(n).padStart(2, '0');
// "za 1 h 20 min", "za 12 min", ispod 10 min "za 04:12"; posle roka "kasni 6 min"
export function untilText(at, now, { lateWord = 'kasni' } = {}) {
  const diff = new Date(at).getTime() - now;
  const abs = Math.abs(diff);
  const min = Math.floor(abs / 60000);
  if (diff >= 0) {
    if (abs < 10 * 60000) return `za ${pad(Math.floor(abs / 60000))}:${pad(Math.floor((abs % 60000) / 1000))}`;
    if (min < 60) return `za ${min} min`;
    const h = Math.floor(min / 60), r = min % 60;
    return `za ${h} h${r ? ` ${r} min` : ''}`;
  }
  if (min < 1) return `${lateWord} manje od minuta`;
  if (min < 60) return `${lateWord} ${min} min`;
  const h = Math.floor(min / 60), r = min % 60;
  return `${lateWord} ${h} h${r ? ` ${r} min` : ''}`;
}

// "pre 3 min", "pre 1 h 12 min"
export function agoText(at, now) {
  const min = Math.max(0, Math.floor((now - new Date(at).getTime()) / 60000));
  if (min < 1) return 'upravo';
  if (min < 60) return `pre ${min} min`;
  const h = Math.floor(min / 60), r = min % 60;
  return `pre ${h} h${r ? ` ${r} min` : ''}`;
}

export function Countdown({ at, className, lateWord, testId }) {
  const now = useTick(1000);
  const late = new Date(at).getTime() < now;
  const soon = !late && new Date(at).getTime() - now < 10 * 60000;
  return <span className={cx('sx-countdown', late && 'is-late', soon && 'is-soon', className)} data-testid={testId}>{untilText(at, now, { lateWord })}</span>;
}

export function Ago({ at, className }) {
  const now = useTick(15000);
  return <span className={className}>{agoText(at, now)}</span>;
}

// Krug obilaska (motiv): tačke po obodu; očitane su pune, propuštena prekida krug
export function Ring({ done = 0, total = 0, missed = 0, size = 46, className }) {
  const r = size / 2 - 5;
  const c = size / 2;
  const n = Math.max(total, 1);
  const nodes = Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { x: c + r * Math.cos(a), y: c + r * Math.sin(a), state: i < done ? 'done' : i < done + missed ? 'miss' : 'wait' };
  });
  const circ = 2 * Math.PI * r;
  const doneLen = total ? (done / total) * circ : 0;
  const missLen = total ? (missed / total) * circ : 0;
  return (
    <svg className={cx('sx-ring', className)} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={c} cy={c} r={r} className="sx-ring__track" />
      {doneLen > 0 && <circle cx={c} cy={c} r={r} className="sx-ring__done" strokeDasharray={`${doneLen} ${circ}`} transform={`rotate(-90 ${c} ${c})`} />}
      {missLen > 0 && <circle cx={c} cy={c} r={r} className="sx-ring__miss" strokeDasharray={`${Math.max(0, missLen - 3)} ${circ}`} strokeDashoffset={-(doneLen + 1.5)} transform={`rotate(-90 ${c} ${c})`} />}
      {total <= 16 && nodes.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.state === 'wait' ? 1.6 : 2.2} className={`sx-ring__node is-${p.state}`} />)}
    </svg>
  );
}
