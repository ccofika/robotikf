// Dijalog: natpis + naslov + opis, X, telo koje se pomera, podnožje sa dugmadima.
// Panel se otkriva kao "vizir" (elipsa se širi odozgo, 420 ms), zatamnjenje menja samo boju pozadine
// (panel je neproziran od prvog kadra), na telefonu (<= 479 px) izlazi odozdo kao list.
// Escape i klik van zatvaraju samo gornji sloj (osim dok traje čuvanje: busy).
import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLayer } from './layer';

export default function Dialog({
  open = true, onClose, eyebrow, title, description, size = 'md', busy = false,
  footer, className = '', initialFocus = true, testId, children, role = 'dialog', backdropClassName = '', bodyClassName = ''
}) {
  const id = useId();
  const panelRef = useRef(null);
  useLayer(open, () => { if (!busy && onClose) onClose(); });

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => {
      if (!initialFocus || !panelRef.current || panelRef.current.contains(document.activeElement)) return;
      const first = panelRef.current.querySelector('textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled])');
      (first || panelRef.current).focus({ preventScroll: true });
    }, 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="sx-portal">
      <div className={`sx-dialog-backdrop ${backdropClassName}`} onMouseDown={(e) => { if (e.target === e.currentTarget && !busy && onClose) onClose(); }}>
        <div
          ref={panelRef}
          tabIndex={-1}
          className={`sx-dialog sx-dialog--${size} ${className}`}
          role={role}
          aria-modal="true"
          aria-labelledby={`${id}-t`}
          aria-describedby={description ? `${id}-d` : undefined}
          data-testid={testId}
        >
          <div className="sx-dialog__head">
            <div className="sx-dialog__titles">
              {eyebrow && <span className="sx-eyebrow sx-dialog__eyebrow">{eyebrow}</span>}
              <h3 id={`${id}-t`} className="sx-dialog__title">{title}</h3>
              {description && <p id={`${id}-d`} className="sx-dialog__desc">{description}</p>}
            </div>
            {onClose && (
              <button type="button" className="sx-dialog__close" onClick={onClose} disabled={busy} aria-label="Zatvori">
                <X size={18} strokeWidth={1.8} />
              </button>
            )}
          </div>
          {children !== undefined && children !== null && children !== false && <div className={`sx-dialog__body ${bodyClassName}`}>{children}</div>}
          {footer && <div className="sx-dialog__foot">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
}
