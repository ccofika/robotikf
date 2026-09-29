// Obaveštenja (toast): jedno na ekranu, ostala čekaju u redu. Ista poruka ne pravi novo obaveštenje
// nego brojač (x2, x3). Greška ima prednost: ide prva, a trenutno obaveštenje odmah odlazi.
// Ulaz 600 ms sa blagim prebačajem, izlaz 450 ms sa kratkim "nadimanjem"; traka odbrojava i staje na hover.
// API je isti kao stari u components/ui.jsx: useToast() -> { ok, bad, warn, info, push(tone, title, text) }.
import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { createPortal } from 'react-dom';

const DURATION = { ok: 4000, info: 4000, warn: 5000, bad: 6500 };
const LABEL = { ok: 'Uspešno', info: 'Informacija', warn: 'Upozorenje', bad: 'Greška' };
const EXIT_MS = 450;
const SHORT_MS = 1200;

let nextId = 1;
let current = null;
let queue = [];
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
let timer = null;
let startedAt = 0;
let remaining = 0;

const clearTimer = () => { if (timer) clearTimeout(timer); timer = null; };
function startTimer(ms) { clearTimer(); startedAt = Date.now(); remaining = ms; timer = setTimeout(dismiss, ms); }
function remainingNow() { return timer ? Math.max(0, remaining - (Date.now() - startedAt)) : remaining; }

function showNext() {
  const next = queue.shift();
  if (!next) { current = null; emit(); return; }
  current = { ...next, phase: 'enter' };
  startTimer(next.duration);
  emit();
}

function dismiss() {
  if (!current || current.phase === 'exit') return;
  clearTimer();
  current = { ...current, phase: 'exit' };
  emit();
  setTimeout(() => { current = null; emit(); setTimeout(showNext, 60); }, EXIT_MS);
}

function push(tone, title, text) {
  const t = DURATION[tone] ? tone : 'info';
  const key = `${t}|${title || ''}|${text || ''}`;
  if (current && current.phase !== 'exit' && current.key === key) {
    current = { ...current, count: current.count + 1, version: current.version + 1 };
    startTimer(current.duration);
    emit();
    return;
  }
  const waiting = queue.find((q) => q.key === key);
  if (waiting) { waiting.count += 1; return; }
  const item = { id: nextId++, key, tone: t, title: title || '', text: text || '', count: 1, duration: DURATION[t], version: 0 };
  if (!current) { queue.push(item); showNext(); return; }
  if (t === 'bad' && current.tone !== 'bad') { queue.unshift(item); dismiss(); return; }
  queue.push(item);
  if (current.phase !== 'exit' && remainingNow() > SHORT_MS) {
    current = { ...current, duration: SHORT_MS, version: current.version + 1 };
    startTimer(SHORT_MS);
    emit();
  }
}

function pause() { if (!timer || !current) return; clearTimer(); remaining = Math.max(0, remaining - (Date.now() - startedAt)); }
function resume() { if (timer || !current || current.phase === 'exit') return; startTimer(remaining || 1); }

export const toast = {
  push,
  ok: (title, text) => push('ok', title, text),
  bad: (title, text) => push('bad', title, text),
  warn: (title, text) => push('warn', title, text),
  info: (title, text) => push('info', title, text),
  dismiss
};

const Ctx = createContext(toast);
export const useToast = () => useContext(Ctx);

function Viewport() {
  const [, force] = useReducer((x) => x + 1, 0);
  const [paused, setPaused] = useState(false);
  useEffect(() => { listeners.add(force); return () => { listeners.delete(force); }; }, []);
  const item = current;
  const itemId = item ? item.id : null;
  useEffect(() => { setPaused(false); }, [itemId]);
  if (!item) return null;
  const hold = () => { setPaused(true); pause(); };
  const release = () => { setPaused(false); resume(); };
  return createPortal(
    <div className="sx-portal">
      <div className="sx-toasts">
        <div
          key={item.id}
          className={`sx-toast is-${item.phase}${paused ? ' is-paused' : ''}`}
          data-tone={item.tone}
          role={item.tone === 'bad' ? 'alert' : 'status'}
          aria-live={item.tone === 'bad' ? 'assertive' : 'polite'}
          data-testid="toast"
          onMouseEnter={hold}
          onMouseLeave={release}
          onFocus={hold}
          onBlur={release}
        >
          <span key={item.version} className="sx-toast__timer" style={{ animationDuration: `${item.duration}ms` }} aria-hidden="true" />
          <span className="sx-led sx-toast__mark" data-tone={item.tone} aria-hidden="true" />
          <span className="sx-toast__body">
            <span className="sx-toast__type">{LABEL[item.tone]}</span>
            <span className="sx-toast__title">{item.title}</span>
            {item.text && <span className="sx-toast__text">{item.text}</span>}
          </span>
          {item.count > 1 && <span className="sx-toast__count">×{item.count}</span>}
          <button type="button" className="sx-toast__close" onClick={dismiss} aria-label="Zatvori obaveštenje">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ToastProvider({ children }) {
  return (
    <Ctx.Provider value={toast}>
      {children}
      <Viewport />
    </Ctx.Provider>
  );
}
