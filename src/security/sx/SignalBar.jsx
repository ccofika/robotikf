// Traka učitavanja u obliku obilaska: tačka putuje po liniji sa kontrolnim tačkama.
// Pojavljuje se tek kad zahtev traje duže od 200 ms (kratki ne trepere), nestaje 180 ms posle poslednjeg.
// Pozadinska osvežavanja (Uživo, alarmi, obaveštenja) je ne pokreću.
import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

const QUIET = [/\/api\/security\/live\b/, /\/api\/security\/alarms\b/, /\/api\/notifications\b/];
let pending = 0;
const emit = () => window.dispatchEvent(new CustomEvent('sx:network', { detail: { pending } }));
const isQuiet = (cfg) => (!cfg.method || cfg.method.toLowerCase() === 'get') && QUIET.some((r) => r.test(cfg.url || ''));

if (!api.__sxNetwork) {
  api.__sxNetwork = true;
  api.interceptors.request.use((cfg) => {
    if (!cfg._sxCounted && !isQuiet(cfg)) { cfg._sxCounted = true; pending += 1; emit(); }
    return cfg;
  });
  const done = (cfg) => { if (cfg && cfg._sxCounted && !cfg._sxDone) { cfg._sxDone = true; pending = Math.max(0, pending - 1); emit(); } };
  api.interceptors.response.use((res) => { done(res.config); return res; }, (err) => { done(err && err.config); return Promise.reject(err); });
}

export default function SignalBar() {
  const [visible, setVisible] = useState(false);
  const showT = useRef(null);
  const hideT = useRef(null);
  useEffect(() => {
    const on = (e) => {
      if ((e.detail && e.detail.pending) > 0) {
        clearTimeout(hideT.current);
        if (!showT.current) showT.current = setTimeout(() => { setVisible(true); showT.current = null; }, 200);
      } else {
        clearTimeout(showT.current); showT.current = null;
        hideT.current = setTimeout(() => setVisible(false), 180);
      }
    };
    window.addEventListener('sx:network', on);
    return () => { window.removeEventListener('sx:network', on); clearTimeout(showT.current); clearTimeout(hideT.current); };
  }, []);
  return (
    <div className="sx-signal" data-visible={visible ? 'true' : 'false'} role="progressbar" aria-label="Učitavanje" aria-hidden={!visible}>
      <span className="sx-signal__walker" />
    </div>
  );
}
