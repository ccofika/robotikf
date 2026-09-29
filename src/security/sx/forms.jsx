// Polja forme u stilu Security dela (umesto sistemskih kontrola pregledača): polje sa natpisom,
// unos, tekst, padajuća lista (i sam spisak je u stilu aplikacije), broj sa jedinicom, prekidač,
// štikliranje, pilule izbora, pretraga, vreme (24 h) i datum sa sopstvenim kalendarom.
// Vrednosti su obični stringovi: datum 'GGGG-MM-DD', vreme 'HH:MM'; onChange dobija vrednost, ne događaj.
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { motion } from 'framer-motion';
import { Search, X, CalendarDays, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cx } from './ui';
import { todayYmd } from '../lib/time';

const pad = (n) => String(n).padStart(2, '0');

// ---------------------------------------------------------------- polje
export function Field({ label, hint, error, htmlFor, children, className, wide, testId, aside }) {
  return (
    <div className={cx('sx-field', wide && 'is-wide', className)} data-testid={testId}>
      {(label || aside) && (
        <div className="sx-field__top">
          {label && (htmlFor ? <label className="sx-field__label" htmlFor={htmlFor}>{label}</label> : <span className="sx-field__label">{label}</span>)}
          {aside}
        </div>
      )}
      {children}
      {error ? <span className="sx-field__error" role="alert">{error}</span> : hint ? <span className="sx-field__hint">{hint}</span> : null}
    </div>
  );
}

export const Input = React.forwardRef(function Input({ className, invalid, mono, size, ...rest }, ref) {
  return <input ref={ref} className={cx('sx-input', mono && 'sx-input--mono', size === 'sm' && 'sx-input--sm', invalid && 'is-bad', className)} aria-invalid={invalid || undefined} {...rest} />;
});

export const Textarea = React.forwardRef(function Textarea({ className, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cx('sx-textarea', className)} {...rest} />;
});

// padajuća lista: sistemski <select>, ali spisak opcija crta aplikacija (appearance: base-select)
export function Select({ className, size, children, ...rest }) {
  return <select className={cx('sx-input sx-select', size === 'sm' && 'sx-input--sm', className)} {...rest}>{children}</select>;
}

// broj sa jedinicom ("15 min", "250 RSD/h"): kuca se, bez sistemskih strelica; strelice na tastaturi menjaju za 1
export function NumberField({ value, onChange, min, max, suffix, width = 76, disabled, testId, placeholder, id, className, 'aria-label': ariaLabel }) {
  const clamp = (n) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  return (
    <span className={cx('sx-numfield', disabled && 'is-disabled', className)}>
      <input
        id={id}
        className="sx-numfield__in"
        style={{ width }}
        inputMode="numeric"
        value={value === null || value === undefined ? '' : String(value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        data-testid={testId}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, '');
          onChange(raw === '' ? '' : Number(raw));
        }}
        onBlur={() => { if (value !== '' && value !== null && value !== undefined) { const c = clamp(Number(value)); if (c !== value) onChange(c); } }}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
          e.preventDefault();
          const cur = Number(value) || 0;
          onChange(clamp(cur + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1)));
        }}
      />
      {suffix && <span className="sx-numfield__suffix">{suffix}</span>}
    </span>
  );
}

// ---------------------------------------------------------------- prekidač i štikliranje
export function Switch({ checked, onChange, label, disabled, testId, children, className }) {
  const sw = (
    <button type="button" role="switch" aria-checked={!!checked} aria-label={children ? undefined : label} disabled={disabled}
      className={cx('sx-switch', checked && 'is-on')} onClick={() => onChange(!checked)} data-testid={testId}>
      <span className="sx-switch__thumb" />
    </button>
  );
  if (!children) return sw;
  return (
    <label className={cx('sx-switchrow', disabled && 'is-disabled', className)}>
      {sw}
      <span className="sx-switchrow__text">{children}</span>
    </label>
  );
}

export function Checkbox({ checked, onChange, children, disabled, testId, tone, className }) {
  return (
    <label className={cx('sx-check', checked && 'is-on', tone === 'danger' && 'is-danger', disabled && 'is-disabled', className)}>
      <button type="button" role="checkbox" aria-checked={!!checked} disabled={disabled} className="sx-check__box" onClick={() => onChange(!checked)} data-testid={testId}>
        <Check size={12} strokeWidth={3} aria-hidden="true" />
      </button>
      {children && <span className="sx-check__text">{children}</span>}
    </label>
  );
}

// ---------------------------------------------------------------- pilule izbora (jedna od više)
// tamna podloga klizi ispod izabrane; brojač uz naziv; na telefonu jedan red koji se pomera (scroll)
export function Choice({ value, onChange, options, label, layoutId, size, scroll, testId, className }) {
  const auto = useId();
  const lid = layoutId || `sx-choice-${auto}`;
  return (
    <div className={cx('sx-choice', size === 'sm' && 'sx-choice--sm', scroll && 'sx-choice--scroll', className)} role="radiogroup" aria-label={label} data-testid={testId}>
      {options.map((o) => {
        const on = o.value === value;
        const I = o.icon;
        return (
          <button key={String(o.value)} type="button" role="radio" aria-checked={on} disabled={o.disabled} className={cx('sx-choice__opt', on && 'is-on')}
            onClick={() => onChange(o.value)} data-testid={o.testId} title={o.title}>
            {on && <motion.span layoutId={lid} className="sx-choice__bg" transition={{ type: 'spring', stiffness: 380, damping: 34 }} />}
            {I && <I className="sx-choice__icon" size={15} strokeWidth={1.9} aria-hidden="true" />}
            <span className="sx-choice__label">{o.label}</span>
            {o.count !== undefined && o.count !== null && <span className={cx('sx-choice__count', o.tone && `is-${o.tone}`)}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- više izbora (objekti radnika)
// pilule koje se uključuju i isključuju (aria-pressed); uključena ima kvačicu i tamnu podlogu
export function ToggleChips({ options, value = [], onChange, disabled, testId, label, empty }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="sx-togglechips" role="group" aria-label={label}>
      {!options.length && empty && <span className="sx-field__hint">{empty}</span>}
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button key={o.value} type="button" aria-pressed={on} disabled={disabled} className={cx('sx-togglechip', on && 'is-on')} onClick={() => toggle(o.value)} data-testid={testId}>
            <span className="sx-togglechip__box" aria-hidden="true"><Check size={11} strokeWidth={3} /></span>{o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- pretraga
export const SearchField = React.forwardRef(function SearchField({ value, onChange, placeholder = 'Traži', testId, className, autoFocus, onKeyDown }, ref) {
  return (
    <div className={cx('sx-search', value && 'has-value', className)}>
      <Search size={16} strokeWidth={1.9} aria-hidden="true" className="sx-search__icon" />
      <input ref={ref} type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus}
        aria-label={placeholder} data-testid={testId} onKeyDown={(e) => { if (e.key === 'Escape' && value) { e.stopPropagation(); onChange(''); } if (onKeyDown) onKeyDown(e); }} />
      {value && <button type="button" className="sx-search__clear" onClick={() => onChange('')} aria-label="Obriši pretragu"><X size={14} strokeWidth={2} /></button>}
    </div>
  );
});

// ---------------------------------------------------------------- vreme (24 h)
// "930" -> 09:30, "2330" -> 23:30, "18" -> 18:00; strelice gore/dole = 15 min, Shift = 1 h
export function normTime(raw) {
  const d = String(raw || '').replace(/[^0-9]/g, '');
  if (!d) return '';
  let h, m;
  if (d.length <= 2) { h = +d; m = 0; } else if (d.length === 3) { h = +d.slice(0, 1); m = +d.slice(1); } else { h = +d.slice(0, 2); m = +d.slice(2, 4); }
  if (h > 23 || m > 59) return null;
  return `${pad(h)}:${pad(m)}`;
}
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Panel ide direktno u Portal (bez omotača): Radix meri animaciju izlaza baš na njemu,
// pa se kalendar zatvara sa izlazom, a Escape ne prolazi do dijaloga ispod. Tokeni: klasa sx-portal.
function PopShell({ children, className, align = 'start' }) {
  return (
    <Popover.Portal>
      <Popover.Content className={cx('sx-portal sx-popover', className)} align={align} sideOffset={6} collisionPadding={12}
        onOpenAutoFocus={(e) => e.preventDefault()}>
        {children}
      </Popover.Content>
    </Popover.Portal>
  );
}

export function TimeField({ value, onChange, invalid, disabled, testId, id, compact, step = 30, list = true, 'aria-label': ariaLabel, className }) {
  const [draft, setDraft] = useState(value || '');
  const [open, setOpen] = useState(false);
  const listRef = useRef(null);
  useEffect(() => { setDraft(value || ''); }, [value]);
  const commit = () => {
    const n = normTime(draft);
    if (n === null || n === '') { setDraft(value || ''); return; }
    setDraft(n);
    if (n !== value) onChange(n);
  };
  const stepBy = (delta) => {
    const cur = normTime(draft) || value || '00:00';
    const [h, m] = cur.split(':').map(Number);
    const t = (((h * 60 + m + delta) % 1440) + 1440) % 1440;
    const n = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
    setDraft(n); onChange(n);
  };
  const slots = useMemo(() => {
    const out = [];
    for (let t = 0; t < 1440; t += step) out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
    return out;
  }, [step]);
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => {
      const el = listRef.current && (listRef.current.querySelector('.is-selected') || listRef.current.querySelector('[data-near="true"]'));
      if (el) el.scrollIntoView({ block: 'center' });
    }, 0);
    return () => clearTimeout(t);
  }, [open]);
  const near = (() => { const n = normTime(draft) || value; if (!n) return null; const [h, m] = n.split(':').map(Number); const r = Math.round((h * 60 + m) / step) * step % 1440; return `${pad(Math.floor(r / 60))}:${pad(r % 60)}`; })();
  const bad = invalid || (draft && normTime(draft) === null);
  return (
    <Popover.Root open={open && !disabled} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <span className={cx('sx-dt sx-dt--time', compact && 'is-compact', bad && 'is-bad', disabled && 'is-disabled', className)}>
          <input
            id={id}
            className="sx-dt__in"
            value={draft}
            inputMode="numeric"
            autoComplete="off"
            placeholder="00:00"
            maxLength={5}
            disabled={disabled}
            aria-label={ariaLabel}
            aria-invalid={bad || undefined}
            data-testid={testId}
            onChange={(e) => {
              let v = e.target.value.replace(/[^0-9:]/g, '');
              if (/^\d{4}$/.test(v)) v = `${v.slice(0, 2)}:${v.slice(2)}`;
              setDraft(v);
              if (HM.test(v)) onChange(v);
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); stepBy(e.shiftKey ? 60 : 15); }
              if (e.key === 'ArrowDown' && !e.altKey) { e.preventDefault(); stepBy(e.shiftKey ? -60 : -15); }
              if (e.key === 'ArrowDown' && e.altKey && list) { e.preventDefault(); setOpen(true); }
              if (e.key === 'Enter') commit();
            }}
          />
          {list && (
            <Popover.Trigger asChild>
              <button type="button" className="sx-dt__btn" disabled={disabled} aria-label="Izaberi vreme" tabIndex={-1}><Clock size={15} strokeWidth={1.9} /></button>
            </Popover.Trigger>
          )}
        </span>
      </Popover.Anchor>
      {list && (
        <PopShell className="sx-popover--times">
          <div className="sx-times" ref={listRef} role="listbox" aria-label="Vreme">
            {slots.map((t) => (
              <button key={t} type="button" role="option" aria-selected={t === value} className={cx('sx-time', t === value && 'is-selected')} data-near={t === near}
                onClick={() => { setDraft(t); onChange(t); setOpen(false); }}>{t}</button>
            ))}
          </div>
        </PopShell>
      )}
    </Popover.Root>
  );
}

// ---------------------------------------------------------------- datum i kalendar
const ymdToDate = (ymd) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || '')); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3]); return d.getMonth() === +m[2] - 1 ? d : null; };
const dateToYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const ymdText = (ymd) => { const d = ymdToDate(ymd); return d ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}.` : ''; };
function parseDateText(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return ymdToDate(`${m[1]}-${pad(+m[2])}-${pad(+m[3])}`);
  m = /^(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4})\.?$/.exec(t);
  if (m) return ymdToDate(`${m[3]}-${pad(+m[2])}-${pad(+m[1])}`);
  return null;
}
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const WEEKDAYS = ['pon', 'uto', 'sre', 'čet', 'pet', 'sub', 'ned'];
const MONTHS_T = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];

// mesečni kalendar (ponedeljak prvi): strelice menjaju dan, PageUp/PageDown mesec, Enter bira; "danas" po Srbiji
export function MonthCalendar({ value, onPick, min, max, onClear, clearable }) {
  const today = ymdToDate(todayYmd());
  const sel = ymdToDate(value);
  const [view, setView] = useState(() => { const b = sel || today; return new Date(b.getFullYear(), b.getMonth(), 1); });
  const [focus, setFocus] = useState(() => sel || today);
  const [dir, setDir] = useState(0);
  const gridRef = useRef(null);
  const minD = ymdToDate(min);
  const maxD = ymdToDate(max);
  const disabled = (d) => (minD && d < minD) || (maxD && d > maxD);
  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - offset + i));
  }, [view]);
  const goMonth = (delta) => { setDir(delta); setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1)); };
  const moveFocus = (d) => {
    setFocus(d);
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) { setDir(d > view ? 1 : -1); setView(new Date(d.getFullYear(), d.getMonth(), 1)); }
  };
  useEffect(() => {
    const btn = gridRef.current && gridRef.current.querySelector('[data-focus="true"]');
    if (btn && gridRef.current.contains(document.activeElement)) btn.focus();
  }, [focus, view]);
  const onKeyDown = (e) => {
    const stepD = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (stepD) { e.preventDefault(); moveFocus(new Date(focus.getFullYear(), focus.getMonth(), focus.getDate() + stepD)); }
    else if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); moveFocus(new Date(focus.getFullYear(), focus.getMonth() + (e.key === 'PageUp' ? -1 : 1), focus.getDate())); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!disabled(focus)) onPick(dateToYmd(focus)); }
  };
  const title = `${MONTHS_T[view.getMonth()]} ${view.getFullYear()}.`;
  return (
    <div className="sx-cal">
      <div className="sx-cal__head">
        <button type="button" className="sx-cal__nav" onClick={() => goMonth(-1)} aria-label="Prethodni mesec"><ChevronLeft size={16} strokeWidth={1.9} /></button>
        <p className="sx-cal__title" aria-live="polite">{title}</p>
        <button type="button" className="sx-cal__nav" onClick={() => goMonth(1)} aria-label="Sledeći mesec"><ChevronRight size={16} strokeWidth={1.9} /></button>
      </div>
      <div className="sx-cal__grid sx-cal__dows" aria-hidden="true">{WEEKDAYS.map((w) => <span key={w}>{w}</span>)}</div>
      <div key={`${view.getFullYear()}-${view.getMonth()}`} ref={gridRef} className="sx-cal__grid sx-cal__days" style={{ '--dir': dir }} role="grid" aria-label={title} onKeyDown={onKeyDown}>
        {days.map((d) => {
          const outside = d.getMonth() !== view.getMonth();
          const isSel = sameDay(d, sel);
          const isFocus = sameDay(d, focus);
          return (
            <button key={d.toISOString()} type="button" role="gridcell" disabled={disabled(d)} aria-selected={isSel} tabIndex={isFocus ? 0 : -1} data-focus={isFocus}
              className={cx('sx-cal__day', outside && 'is-outside', sameDay(d, today) && 'is-today', isSel && 'is-selected', (d.getDay() === 0 || d.getDay() === 6) && 'is-weekend')}
              aria-label={`${d.getDate()}. ${MONTHS_T[d.getMonth()].toLowerCase()} ${d.getFullYear()}.`}
              onClick={() => onPick(dateToYmd(d))}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
      <div className="sx-cal__foot">
        <button type="button" className="sx-cal__link" disabled={disabled(today)} onClick={() => onPick(dateToYmd(today))}>Danas</button>
        {clearable && onClear && <button type="button" className="sx-cal__link is-muted" onClick={onClear}>Obriši</button>}
      </div>
    </div>
  );
}

export function DateField({ value, onChange, min, max, clearable, disabled, testId, placeholder = 'dd.mm.gggg.', id, compact, invalid, 'aria-label': ariaLabel, className }) {
  const [text, setText] = useState(ymdText(value));
  const [open, setOpen] = useState(false);
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setText(ymdText(value)); }, [value]);
  const inRange = (ymd) => !((min && ymd < min) || (max && ymd > max));
  const pick = (ymd) => { setText(ymdText(ymd)); onChange(ymd); setOpen(false); };
  return (
    <Popover.Root open={open && !disabled} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <span className={cx('sx-dt', compact && 'is-compact', invalid && 'is-bad', disabled && 'is-disabled', className)}>
          <input
            id={id}
            className="sx-dt__in"
            value={text}
            inputMode="numeric"
            autoComplete="off"
            placeholder={placeholder}
            disabled={disabled}
            aria-label={ariaLabel}
            data-testid={testId}
            onChange={(e) => {
              const raw = e.target.value;
              setText(raw);
              if (!raw.trim()) { if (clearable) onChange(''); return; }
              const d = parseDateText(raw);
              if (d && inRange(dateToYmd(d))) onChange(dateToYmd(d));
            }}
            onFocus={() => { focused.current = true; }}
            onBlur={() => { focused.current = false; setText(ymdText(value)); }}
            onKeyDown={(e) => { if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); setOpen(true); } }}
          />
          {clearable && value && !disabled && <button type="button" className="sx-dt__clear" onClick={() => { setText(''); onChange(''); }} aria-label="Obriši datum"><X size={13} strokeWidth={2} /></button>}
          <Popover.Trigger asChild>
            <button type="button" className="sx-dt__btn" disabled={disabled} aria-label="Izaberi datum iz kalendara"><CalendarDays size={15} strokeWidth={1.9} /></button>
          </Popover.Trigger>
        </span>
      </Popover.Anchor>
      <PopShell>
        <MonthCalendar value={value} onPick={pick} min={min} max={max} clearable={clearable} onClear={() => { setText(''); onChange(''); setOpen(false); }} />
      </PopShell>
    </Popover.Root>
  );
}

// ---------------------------------------------------------------- fajl
export function FileButton({ onFile, accept, multiple, children = 'Izaberi fajl', icon: Icon, disabled, testId, size = 'sm', capture }) {
  const ref = useRef(null);
  return (
    <>
      <input ref={ref} type="file" hidden accept={accept} multiple={multiple} capture={capture} data-testid={testId}
        onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) onFile(multiple ? files : files[0]); e.target.value = ''; }} />
      <button type="button" className={cx('sx-btn sx-fill', size && `sx-btn--${size}`)} disabled={disabled} onClick={() => ref.current && ref.current.click()}>
        {Icon && <Icon aria-hidden="true" strokeWidth={1.9} />}{children}
      </button>
    </>
  );
}
