// Fioka (detalj radnika, smene, taga): izlazi sa desne strane preko liste, lista ostaje ispod.
// Kretanje: ulaz 450 ms --ease-move (površina se pomera), izlaz 300 ms ease-in; zatamnjenje menja
// samo boju pozadine. Na telefonu (<= 639 px) izlazi odozdo kao list. Escape i klik van zatvaraju
// samo gornji sloj (dijalog otvoren iz fioke se zatvara prvi), osim dok traje čuvanje (busy).
import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useLayer } from './layer';
import { EASE_MOVE, EASE_EXIT } from './motion';
import { cx } from './ui';

function usePhone() {
  const q = '(max-width: 639px)';
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

function Panel({ onClose, busy, eyebrow, title, meta, actions, tabs, footer, size, testId, children, phone }) {
  const id = useId();
  const ref = useRef(null);
  const reduce = useReducedMotion();
  useLayer(true, () => { if (!busy && onClose) onClose(); });
  useEffect(() => { const t = setTimeout(() => ref.current && !ref.current.contains(document.activeElement) && ref.current.focus({ preventScroll: true }), 40); return () => clearTimeout(t); }, []);
  const from = reduce ? { opacity: 0 } : phone ? { y: '100%' } : { x: '100%' };
  const to = reduce ? { opacity: 1 } : phone ? { y: 0 } : { x: 0 };
  const exit = reduce ? { opacity: 0, transition: { duration: 0.12 } } : { ...(phone ? { y: '100%' } : { x: '100%' }), transition: { duration: 0.3, ease: EASE_EXIT } };
  return (
    <motion.div className="sx-sheet-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy && onClose) onClose(); }}
      initial={{ backgroundColor: 'rgba(0,0,0,0)' }} animate={{ backgroundColor: 'var(--sx-scrim)' }} exit={{ backgroundColor: 'rgba(0,0,0,0)', transition: { duration: 0.2, ease: 'linear' } }}
      transition={{ duration: 0.2, ease: 'linear' }}>
      <motion.aside
        ref={ref}
        tabIndex={-1}
        className={cx('sx-sheet', `sx-sheet--${size}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        data-testid={testId}
        initial={from}
        animate={to}
        exit={exit}
        transition={reduce ? { duration: 0.15 } : { duration: phone ? 0.35 : 0.45, ease: EASE_MOVE }}
      >
        <header className="sx-sheet__head">
          <div className="sx-sheet__titles">
            {eyebrow && <span className="sx-eyebrow sx-sheet__eyebrow">{eyebrow}</span>}
            <h2 id={`${id}-t`} className="sx-sheet__title">{title}</h2>
            {meta && <div className="sx-sheet__meta">{meta}</div>}
          </div>
          <button type="button" className="sx-dialog__close sx-sheet__close" onClick={onClose} disabled={busy} aria-label="Zatvori" data-testid="sheet-close"><X size={18} strokeWidth={1.8} /></button>
          {actions && <div className="sx-sheet__actions">{actions}</div>}
          {tabs && <div className="sx-sheet__tabs">{tabs}</div>}
        </header>
        <div className="sx-sheet__body">{children}</div>
        {footer && <footer className="sx-sheet__foot">{footer}</footer>}
      </motion.aside>
    </motion.div>
  );
}

export default function Sheet({ open, size = 'md', ...rest }) {
  const phone = usePhone();
  return createPortal(
    <div className="sx-portal">
      <AnimatePresence>{open && <Panel key="sheet" size={size} phone={phone} {...rest} />}</AnimatePresence>
    </div>,
    document.body
  );
}

// Odeljak u fioci: natpis (verzal) + opcione akcije desno + sadržaj
export function SheetSection({ title, aside, children, className, testId }) {
  return (
    <section className={cx('sx-ssec', className)} data-testid={testId}>
      {(title || aside) && <div className="sx-ssec__head">{title && <h3 className="sx-label">{title}</h3>}{aside}</div>}
      {children}
    </section>
  );
}
