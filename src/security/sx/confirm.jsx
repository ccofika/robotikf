// Potvrda radnje (umesto window.confirm): confirm({ title, text, note, tone, confirmLabel, input, ... })
// vraća Promise: true/false, a sa poljem za razlog (input) tekst ili null. <ConfirmHost /> jednom u aplikaciji.
// Stoji iznad dijaloga i fioke (z-index 10070); Escape i Odustani vraćaju false/null; Ctrl+Enter potvrđuje.
import React, { useEffect, useState } from 'react';
import Dialog from './Dialog';
import { Btn, Led } from './ui';

let show = null;

export function confirm(opts = {}) {
  return new Promise((resolve) => {
    if (!show) { resolve(opts.input ? null : window.confirm(opts.title || 'Potvrdi')); return; }
    show({ ...opts, resolve });
  });
}

export function ConfirmHost() {
  const [s, setS] = useState(null);
  useEffect(() => { show = (o) => setS({ ...o, value: o.defaultValue || '' }); return () => { show = null; }; }, []);
  if (!s) return null;
  const min = s.required === false ? 0 : (s.minLength || 3);
  const valid = !s.input || (s.value || '').trim().length >= min;
  const close = (result) => { s.resolve(result); setS(null); };
  const ok = () => { if (valid) close(s.input ? (s.value || '').trim() : true); };
  return (
    <Dialog
      onClose={() => close(s.input ? null : false)}
      eyebrow={s.eyebrow}
      title={s.title}
      description={s.text}
      size="sm"
      role="alertdialog"
      backdropClassName="sx-dialog-backdrop--confirm"
      initialFocus={!!s.input}
      testId="confirm-dialog"
      footer={<>
        <Btn variant="ghost" onClick={() => close(s.input ? null : false)} data-testid="confirm-cancel">{s.cancelLabel || 'Odustani'}</Btn>
        <Btn variant={s.tone === 'danger' ? 'danger' : 'primary'} onClick={ok} disabled={!valid} autoFocus={!s.input} data-testid="confirm-ok">{s.confirmLabel || 'Potvrdi'}</Btn>
      </>}
    >
      {s.note && <div className="sx-note" data-tone={s.noteTone || 'warn'}><Led tone={s.noteTone || 'warn'} /><div>{s.note}</div></div>}
      {s.input && (
        <label className="sx-field" style={{ marginTop: s.note ? 14 : 4 }}>
          <span className="sx-field__label">{s.input}</span>
          <textarea className="sx-textarea" autoFocus value={s.value} placeholder={s.placeholder} data-testid="confirm-input" style={{ minHeight: 76 }}
            onChange={(e) => setS({ ...s, value: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ok(); }} />
        </label>
      )}
    </Dialog>
  );
}
