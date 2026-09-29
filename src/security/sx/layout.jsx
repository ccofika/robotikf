// Okvir svake Security stranice, uvek istim redom (korisnik zna gde šta traži):
//   1) PageHead: gde sam (natpis), šta je strana (naslov), čemu služi (jedna rečenica), glavne radnje desno
//   2) Toolbar: pretraga levo, filteri (pilule sa brojem), prikaz i period desno; lepi se uz vrh pri skrolu
//   3) sadržaj preko cele širine: Panel (kartica sa naslovom), tabela, tabla...
// Tabs su navigacija između delova iste stvari (podvučeni), a pilule (Choice) filtriraju listu.
import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { cx, Led, Btn } from './ui';
import { SplitReveal, Reveal } from './motion';

export function PageHead({ eyebrow, title, lead, actions, back, children, testId, className }) {
  return (
    <header className={cx('sx-head', className)} data-testid={testId}>
      <div className="sx-head__text">
        {back && <Btn size="sm" variant="ghost" icon={ChevronLeft} onClick={back.onClick} className="sx-head__back" data-testid="head-back">{back.label}</Btn>}
        {eyebrow && <Reveal y={6} className="sx-eyebrow">{eyebrow}</Reveal>}
        <SplitReveal key={title} as="h1" className="sx-title sx-head__title" text={title} data-testid="page-heading" />
        {lead && <Reveal y={8} delay={0.1} className="sx-head__lead"><p>{lead}</p></Reveal>}
        {children}
      </div>
      {actions && <Reveal y={8} delay={0.14} className="sx-head__actions">{actions}</Reveal>}
    </header>
  );
}

export function Toolbar({ children, className, sticky = true, testId }) {
  return <div className={cx('sx-toolbar', sticky && 'is-sticky', className)} data-testid={testId}>{children}</div>;
}

export function Panel({ title, sub, actions, children, footer, className, pad = true, testId, id, tone, as: As = 'section' }) {
  return (
    <As className={cx('sx-card sx-panel', tone && `is-${tone}`, className)} data-testid={testId} id={id}>
      {(title || actions) && (
        <header className="sx-card__head sx-panel__head">
          <div className="sx-panel__titles">
            {title && <h2 className="sx-card__title">{title}</h2>}
            {sub && <p className="sx-card__sub">{sub}</p>}
          </div>
          {actions && <div className="sx-panel__actions">{actions}</div>}
        </header>
      )}
      {children !== undefined && children !== null && children !== false && <div className={cx(pad && 'sx-panel__body')}>{children}</div>}
      {footer && <footer className="sx-panel__foot">{footer}</footer>}
    </As>
  );
}

// Napomena u tekstu: znak stanja + rečenica (+ radnje); nikad sama boja bez znaka
export function Note({ tone = 'info', children, actions, testId, className, icon: Icon }) {
  return (
    <div className={cx('sx-note', className)} data-tone={tone} data-testid={testId} role={tone === 'bad' ? 'alert' : undefined}>
      {Icon ? <Icon size={16} strokeWidth={1.9} className="sx-note__icon" aria-hidden="true" /> : <Led tone={tone === 'info' ? 'info' : tone} />}
      <div className="sx-note__body">{children}{actions && <div className="sx-note__actions">{actions}</div>}</div>
    </div>
  );
}

// Parovi naziv / vrednost (umesto "Naziv: vrednost" redova)
export function KV({ items, className, cols }) {
  return (
    <dl className={cx('sx-kv', cols && `sx-kv--${cols}`, className)}>
      {items.filter(Boolean).map((it) => (
        <div key={it.k} className="sx-kv__row" data-testid={it.testId}>
          <dt>{it.k}</dt>
          <dd className={cx(it.mono && 'sx-mono', it.tone && `is-${it.tone}`)}>{it.v === undefined || it.v === null || it.v === '' ? <span className="sx-faint">-</span> : it.v}</dd>
        </div>
      ))}
    </dl>
  );
}

// Tabovi: podvučeni, crta klizi do izabranog; strelice levo/desno menjaju tab
export function Tabs({ items, value, onChange, ariaLabel, layoutId = 'sx-tabs', className, testId }) {
  const ref = useRef(null);
  const onKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const list = items.filter((t) => !t.disabled);
    const i = list.findIndex((t) => t.key === value);
    const next = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
    if (next) { onChange(next.key); const el = ref.current && ref.current.querySelector(`[data-key="${next.key}"]`); if (el) el.focus(); }
  };
  return (
    <div ref={ref} className={cx('sx-tabs', className)} role="tablist" aria-label={ariaLabel} onKeyDown={onKey} data-testid={testId}>
      {items.map((t) => {
        const on = t.key === value;
        const I = t.icon;
        return (
          <button key={t.key} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} data-key={t.key} disabled={t.disabled}
            className={cx('sx-tabs__tab', on && 'is-on')} onClick={() => onChange(t.key)} data-testid={t.testId}>
            {I && <I size={15} strokeWidth={1.9} aria-hidden="true" />}
            <span>{t.label}</span>
            {t.count !== undefined && t.count !== null && t.count !== 0 && <span className={cx('sx-tabs__count', t.tone && `is-${t.tone}`)}>{t.count}</span>}
            {on && <motion.span layoutId={layoutId} className="sx-tabs__bar" transition={{ type: 'spring', stiffness: 420, damping: 38 }} />}
          </button>
        );
      })}
    </div>
  );
}

// Brojka sa natpisom (sažetak iznad liste); klik filtrira kad ima onClick
export function Stat({ label, value, sub, tone, onClick, selected, testId, small }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={cx('sx-stat', tone && `is-${tone}`, selected && 'is-selected', onClick && 'is-button')} onClick={onClick} aria-pressed={onClick ? !!selected : undefined} data-testid={testId}>
      <span className="sx-label">{label}</span>
      <span className="sx-stat__num sx-num">{value}{small && <small>{small}</small>}</span>
      {sub && <span className="sx-stat__sub">{sub}</span>}
    </Tag>
  );
}

// Traka nesačuvanih izmena: pojavi se odozdo kad forma ima izmene, dugmad Poništi / Sačuvaj
export function SaveBar({ show, text = 'Imaš nesačuvane izmene.', onReset, onSave, busy, saveLabel = 'Sačuvaj', disabled, testId }) {
  if (!show) return null;
  return (
    <div className="sx-savebar" role="region" aria-label="Nesačuvane izmene" data-testid={testId}>
      <Led tone="warn" />
      <span className="sx-savebar__text">{text}</span>
      <div className="sx-savebar__actions">
        <Btn variant="ghost" size="sm" onClick={onReset} disabled={busy}>Poništi</Btn>
        <Btn variant="primary" size="sm" onClick={onSave} busy={busy} disabled={disabled} data-testid={testId ? `${testId}-save` : undefined}>{saveLabel}</Btn>
      </div>
    </div>
  );
}
