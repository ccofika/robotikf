// Stek otvorenih slojeva (dijalog, potvrda, pretraga, meni na telefonu).
// Escape zatvara samo gornji sloj, a skrol stranice je zaključan dok postoji bar jedan sloj,
// bez obzira na redosled zatvaranja. Nikad ne zaključavati body ručno pre otvaranja sloja.
import { useEffect, useRef } from 'react';

const layers = [];
let savedOverflow = '';

function pushLayer(token) {
  if (!layers.length) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  layers.push(token);
}

function popLayer(token) {
  const i = layers.indexOf(token);
  if (i !== -1) layers.splice(i, 1);
  if (!layers.length) document.body.style.overflow = savedOverflow;
}

export const hasOpenLayer = () => layers.length > 0;

// Dok je otvoren kalendar, lista vremena ili spisak u padajućoj listi, Escape pripada njima
function popperOpen() {
  if (document.querySelector('[data-radix-popper-content-wrapper]')) return true;
  try { return !!document.querySelector('select:open'); } catch (e) { return false; }
}

// Povratne funkcije idu kroz ref: efekat zavisi samo od "open", inače bi se sloj skidao i vraćao pri svakom renderu
export function useLayer(open, onEscape, onKey) {
  const escRef = useRef(onEscape);
  const keyRef = useRef(onKey);
  useEffect(() => { escRef.current = onEscape; keyRef.current = onKey; });

  useEffect(() => {
    if (!open) return undefined;
    const token = {};
    pushLayer(token);
    const onKeyDown = (e) => {
      if (layers[layers.length - 1] !== token) return;
      // Radix (kalendar, meni) na Escape zatvara sebe i poziva preventDefault: tada dijalog ostaje
      if (e.key === 'Escape') { if (!e.defaultPrevented && !popperOpen() && escRef.current) escRef.current(e); return; }
      if (keyRef.current) keyRef.current(e);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      popLayer(token);
    };
  }, [open]);
}
