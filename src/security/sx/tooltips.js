// Oblačići u stilu Security dela umesto sistemskih (samo za elemente unutar .sx i .sx-portal).
// Dok je kursor na elementu, title se čuva u data-sx-title (sistemski oblačić se ne pojavljuje).
// Samo miš i tastatura; na dodir nema oblačića. Kašnjenje 450 ms (tastatura 150 ms).
const HOVER_DELAY = 450;
const FOCUS_DELAY = 150;
const GAP = 8;
const EDGE = 8;

let tip = null;
let current = null;
let timer = null;

const inScope = (el) => !!(el && el.closest && el.closest('.sx, .sx-portal'));

function ensureTip() {
  if (tip && tip.isConnected) return tip;
  tip = document.createElement('div');
  tip.className = 'sx-tip';
  tip.id = 'sx-tip';
  tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  return tip;
}

function release(el) {
  const saved = el.getAttribute('data-sx-title');
  if (saved !== null) {
    if (!el.hasAttribute('title')) el.setAttribute('title', saved);
    el.removeAttribute('data-sx-title');
  }
  if (el.getAttribute('aria-describedby') === 'sx-tip') el.removeAttribute('aria-describedby');
  if (el.hasAttribute('data-sx-label')) {
    el.removeAttribute('aria-label');
    el.removeAttribute('data-sx-label');
  }
}

function hide() {
  clearTimeout(timer);
  timer = null;
  if (tip) tip.classList.remove('is-on');
  if (current) release(current);
  current = null;
}

function show(el, text) {
  const t = ensureTip();
  t.textContent = text;
  t.classList.remove('is-on', 'is-below', 'is-right');
  t.style.left = '0px';
  t.style.top = '0px';
  const r = el.getBoundingClientRect();
  const w = t.offsetWidth;
  const h = t.offsetHeight;
  let x;
  let y;
  if (el.getAttribute('data-tip-side') === 'right') {
    x = r.right + GAP;
    y = Math.max(EDGE, Math.min(r.top + r.height / 2 - h / 2, window.innerHeight - h - EDGE));
    t.classList.add('is-right');
  } else {
    x = Math.max(EDGE, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - EDGE));
    y = r.top - h - GAP;
    if (y < EDGE) { y = r.bottom + GAP; t.classList.add('is-below'); }
  }
  t.style.left = `${Math.round(x)}px`;
  t.style.top = `${Math.round(y)}px`;
  if (!el.hasAttribute('data-sx-label')) el.setAttribute('aria-describedby', 'sx-tip');
  requestAnimationFrame(() => { if (current === el) t.classList.add('is-on'); });
}

function arm(el, delay) {
  const text = (el.getAttribute('title') || '').trim();
  if (!text) return;
  hide();
  current = el;
  el.setAttribute('data-sx-title', text);
  el.removeAttribute('title');
  const named = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') || (el.textContent || '').trim();
  if (!named) {
    el.setAttribute('aria-label', text);
    el.setAttribute('data-sx-label', '');
  }
  timer = setTimeout(() => { if (current === el && el.isConnected) show(el, text); }, delay);
}

export function installTooltips() {
  if (typeof window === 'undefined' || !window.matchMedia || document.__sxTips) return;
  document.__sxTips = true;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  document.addEventListener('pointerover', (e) => {
    if (!fine.matches || e.pointerType === 'touch') return;
    const el = e.target instanceof Element ? e.target.closest('[title]') : null;
    if (!el || el === current || !inScope(el)) return;
    arm(el, HOVER_DELAY);
  });
  document.addEventListener('pointerout', (e) => {
    if (!current) return;
    if (e.relatedTarget instanceof Node && current.contains(e.relatedTarget)) return;
    if (e.target instanceof Node && current.contains(e.target)) hide();
  });
  document.addEventListener('focusin', (e) => {
    const el = e.target instanceof Element ? e.target.closest('[title]') : null;
    if (!el || el === current || !inScope(el) || !el.matches(':focus-visible')) return;
    arm(el, FOCUS_DELAY);
  });
  document.addEventListener('focusout', (e) => { if (current && e.target === current) hide(); });
  document.addEventListener('pointerdown', hide, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  window.addEventListener('scroll', hide, true);
  window.addEventListener('blur', hide);
}

// Izlaz "kupole" kroz vrh: kad kursor napusti dugme sa klasom sx-fill, doda se is-leaving
// (animacija nastavlja ispunu nagore), pa se ukloni. Ulaz radi čist CSS (:hover).
export function installDomeHover() {
  if (typeof document === 'undefined' || document.__sxDome) return;
  document.__sxDome = true;
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const el = e.target && e.target.closest ? e.target.closest('.sx-fill') : null;
    if (!el || el.disabled) return;
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;
    el.classList.remove('is-leaving');
    void el.offsetWidth;
    el.classList.add('is-leaving');
    clearTimeout(el.__sxDomeTimer);
    el.__sxDomeTimer = setTimeout(() => el.classList.remove('is-leaving'), 360);
  }, true);
  document.addEventListener('pointerover', (e) => {
    const el = e.target && e.target.closest ? e.target.closest('.sx-fill') : null;
    if (!el || !el.classList.contains('is-leaving')) return;
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;
    clearTimeout(el.__sxDomeTimer);
    el.classList.remove('is-leaving');
  }, true);
}
