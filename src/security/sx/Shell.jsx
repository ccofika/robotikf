// Ljuska Security dela: šina (desktop, 248 <-> 76 px), gornja traka i meni preko ekrana (telefon),
// pretraga i brze radnje (Ctrl+K), obaveštenja, traka učitavanja i baner za kritičan alarm.
// Motiv: stavke menija su kontrolne tačke na liniji, aktivna je "očitana" (tačka klizi do nove stavke).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Activity, CalendarDays, Building2, Users, Siren, FileText, Wallet, Wrench, Bell, Search, LogOut,
  ChevronsLeft, ClipboardList, Plus, Nfc, SlidersHorizontal, CornerDownLeft, ArrowRight, X
} from 'lucide-react';
import { sec, errText } from '../api';
import { useSec } from '../SecurityApp';
import { usePoll, useHotkey } from '../hooks';
import { cx, Btn, Led, Kbd, Avatar, useTick, agoText } from './ui';
import { RollText, EASE_MOVE, EASE_OUT } from './motion';
import { useLayer } from './layer';
import { useToast } from './toast';
import SignalBar from './SignalBar';
import { parts, addDays, localToInstant } from '../lib/time';
import { groupAlarms } from '../pages/live/model';
import BrandMark from './BrandMark';

export { BrandMark };

export const NAV = [
  { to: '/security', end: true, label: 'Uživo', icon: Activity, key: 'live' },
  { to: '/security/raspored', label: 'Raspored', icon: CalendarDays, key: 'raspored' },
  { to: '/security/objekti', label: 'Objekti', icon: Building2, key: 'objekti' },
  { to: '/security/radnici', label: 'Radnici', icon: Users, key: 'radnici' },
  { to: '/security/alarmi', label: 'Alarmi', icon: Siren, key: 'alarmi' },
  { to: '/security/izvestaji', label: 'Izveštaji', icon: FileText, key: 'izvestaji' },
  { to: '/security/satnica', label: 'Satnica', icon: Wallet, key: 'satnica', admin: true }
];
const TITLES = { '': 'Uživo', raspored: 'Raspored', objekti: 'Objekti', radnici: 'Radnici', alarmi: 'Alarmi', izvestaji: 'Izveštaji', satnica: 'Satnica' };
const ROLE = { coordinator: 'Koordinator objekta', superadmin: 'Superadmin', supervisor: 'Supervizor', admin: 'Administrator' };
const RAIL_KEY = 'sx.rail';
const readRail = () => { try { return localStorage.getItem(RAIL_KEY) === 'collapsed'; } catch (e) { return false; } };

function useMobile() {
  const q = '(max-width: 767px)';
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-sx-shell', m ? 'mobile' : 'desktop');
    return () => document.documentElement.removeAttribute('data-sx-shell');
  }, [m]);
  return m;
}


// Smena koja je u toku: dnevna 07-19 ili noćna 19-07, koliko je prošlo. Računa se po stvarnim trenucima početka
// i kraja: noć promene sata traje 13 h (oktobar) ili 11 h (mart), pa fiksnih 720 minuta greši za sat.
function shiftNow(now) {
  const p = parts(now);
  const min = Number(p.hh) * 60 + Number(p.mm);
  const day = min >= 7 * 60 && min < 19 * 60;
  const startYmd = day || min >= 19 * 60 ? p.ymd : addDays(p.ymd, -1);
  const start = localToInstant(startYmd, day ? '07:00' : '19:00').getTime();
  const end = localToInstant(day ? startYmd : addDays(startYmd, 1), day ? '19:00' : '07:00').getTime();
  const t = new Date(now).getTime();
  const total = (end - start) / 60000;
  const elapsed = (t - start) / 60000;
  return { day, pct: Math.min(100, Math.max(0, (elapsed / total) * 100)), left: Math.max(0, Math.round(total - elapsed)), p };
}
const leftText = (m) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h${r ? ` ${r} min` : ''}` : `${r} min`; };

export default function Shell({ children }) {
  const { user, logout, isAdmin } = useSec();
  const loc = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const mobile = useMobile();
  const [collapsed, setCollapsed] = useState(readRail);
  const [palette, setPalette] = useState(false);
  const [panel, setPanel] = useState(null); // 'bell' | 'user' | 'menu'
  const section = loc.pathname.replace(/^\/security\/?/, '').split('/')[0];
  const title = TITLES[section] || 'Security';

  const alarms = usePoll(() => sec.alarms({ state: 'open', limit: 50 }), 15000, []);
  const openList = (alarms.data || []).filter((a) => a.kind !== 'contract' && a.kind !== 'license');
  const critical = openList.filter((a) => a.level === 'critical' && a.state !== 'ack');
  const events = groupAlarms(openList);
  const openEvents = events.filter((g) => !g.acked).length;
  const notifs = usePoll(() => sec.notifications().then((r) => (r.notifications || r.data || r || [])).catch(() => []), 30000, []);
  const notifList = (Array.isArray(notifs.data) ? notifs.data : []).filter((n) => String(n.type || '').startsWith('security_') || String(n.targetPage || '').startsWith('/security'));
  const unread = notifList.filter((n) => !n.isRead).length;

  useHotkey((e) => (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k', () => setPalette(true));
  useEffect(() => { setPanel(null); }, [loc.pathname]);
  useEffect(() => { document.title = `${title} · Robotik Security`; }, [title]);
  useEffect(() => { try { localStorage.setItem(RAIL_KEY, collapsed ? 'collapsed' : 'open'); } catch (e) { /* bez pamćenja */ } }, [collapsed]);
  useEffect(() => {
    const on = () => { alarms.reload(); };
    window.addEventListener('sec:changed', on);
    return () => window.removeEventListener('sec:changed', on);
  }, [alarms]);

  const ack = async (a) => {
    try { await sec.ackAlarm(a._id); toast.ok('Alarm preuzet', `${a.facilityName}: svi vide da neko reaguje.`); alarms.reload(); window.dispatchEvent(new Event('sec:changed')); }
    // poruka servera (npr. "Alarm je već rešen: Očitano 12:03"), ne tehnički "status code 409"
    catch (e) { toast.bad('Alarm nije preuzet', errText(e)); alarms.reload(); }
  };

  const items = NAV.filter((n) => !n.admin || isAdmin);
  const badges = { alarmi: openEvents ? { n: openEvents, tone: critical.length ? 'bad' : 'warn' } : null };
  const onLive = section === '';

  return (
    <div className={cx('sx sx-app', collapsed && !mobile && 'is-collapsed')} data-testid="security-root">
      <SignalBar />
      {!mobile && (
        <Rail
          items={items} badges={badges} collapsed={collapsed} setCollapsed={setCollapsed} user={user} isAdmin={isAdmin}
          unread={unread} onSearch={() => setPalette(true)} onBell={() => setPanel(panel === 'bell' ? null : 'bell')}
          onUser={() => setPanel(panel === 'user' ? null : 'user')} panel={panel}
        />
      )}
      {mobile && (
        <header className="sx-topbar" data-testid="topbar">
          <BrandMark />
          <span className="sx-topbar__title" data-testid="page-title">{title}</span>
          <button type="button" className="sx-topbar__btn" onClick={() => setPanel(panel === 'bell' ? null : 'bell')} aria-label={`Obaveštenja, nepročitanih ${unread}`} data-testid="bell">
            <Bell size={20} strokeWidth={1.8} />{unread > 0 && <span className="sx-badge" data-tone="bad">{unread > 99 ? '99+' : unread}</span>}
          </button>
          <button type="button" className="sx-topbar__btn sx-burger" onClick={() => setPanel(panel === 'menu' ? null : 'menu')} aria-label="Otvori meni" aria-expanded={panel === 'menu'} data-testid="menu-button">
            <span /><span />
          </button>
        </header>
      )}
      {mobile && <MobileMenu open={panel === 'menu'} onClose={() => setPanel(null)} items={items} badges={badges} user={user} isAdmin={isAdmin} logout={logout} onSearch={() => { setPanel(null); setPalette(true); }} />}

      <main className="sx-main" id="sx-main">
        {!onLive && critical.length > 0 && (
          <div className="sx-banner" role="alert" data-testid="alarm-banner">
            <Led tone="bad" live lg />
            <div className="sx-banner__text">
              <b>{critical[0].kind === 'master' ? 'MASTER ALARM' : 'Kritičan alarm'} · {critical[0].facilityName}</b>
              <span>{critical[0].title}. {critical[0].message}{critical.length > 1 ? ` I još ${critical.length - 1}.` : ''}</span>
            </div>
            <div className="sx-banner__actions">
              <Btn size="sm" variant="danger" onClick={() => ack(critical[0])} data-testid="banner-ack">Preuzmi alarm</Btn>
              <Btn size="sm" variant="ghost" iconRight={ArrowRight} onClick={() => navigate('/security')}>Uživo</Btn>
            </div>
          </div>
        )}
        {children}
      </main>

      <AnimatePresence>
        {panel === 'bell' && <NotificationsPanel key="bell" items={notifList} reload={notifs.reload} close={() => setPanel(null)} mobile={mobile} left={collapsed ? 88 : 260} />}
        {panel === 'user' && !mobile && <UserMenu key="user" user={user} logout={logout} close={() => setPanel(null)} />}
      </AnimatePresence>
      {palette && <CommandPalette onClose={() => setPalette(false)} />}
    </div>
  );
}

function Rail({ items, badges, collapsed, setCollapsed, user, isAdmin, unread, onSearch, onBell, onUser, panel }) {
  const now = useTick(30000);
  const s = shiftNow(now);
  const tipSide = collapsed ? 'right' : undefined;
  const tip = (t) => (collapsed ? t : undefined);
  return (
    <aside className={cx('sx-rail', collapsed && 'is-collapsed')} aria-label="Security meni">
      <div className="sx-rail__brand">
        <button type="button" className="sx-rail__markbtn" onClick={() => collapsed && setCollapsed(false)} aria-label={collapsed ? 'Raširi meni' : 'Robotik Security'} title={tip('Raširi meni')} data-tip-side="right" tabIndex={collapsed ? 0 : -1}>
          <BrandMark />
        </button>
        <span className="sx-rail__brandtext"><b>Robotik</b><span>Security</span></span>
        <button type="button" className="sx-rail__collapse" onClick={() => setCollapsed(true)} aria-label="Skupi meni" title="Skupi meni" tabIndex={collapsed ? -1 : 0}>
          <ChevronsLeft size={16} strokeWidth={1.8} />
        </button>
      </div>

      <nav className="sx-rail__nav">
        <ul>
          {items.map((n) => {
            const Icon = n.icon;
            const b = badges[n.key];
            return (
              <li key={n.key}>
                <NavLink to={n.to} end={n.end} className={({ isActive }) => cx('sx-rail__link sx-roll-host', isActive && 'is-active')} data-testid={`nav-${n.key}`} title={tip(n.label)} data-tip-side={tipSide}>
                  {({ isActive }) => (
                    <>
                      <span className="sx-rail__node" aria-hidden="true" />
                      {isActive && <motion.span layoutId="sx-rail-stamp" className="sx-rail__stamp" transition={{ type: 'spring', stiffness: 380, damping: 34 }} aria-hidden="true" />}
                      <span className="sx-rail__icon"><Icon size={18} strokeWidth={1.8} />{b && collapsed && <span className="sx-rail__pip" data-tone={b.tone} />}</span>
                      <span className="sx-rail__label"><RollText text={n.label} /></span>
                      {b && !collapsed && <span className="sx-badge" data-tone={b.tone}>{b.n}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sx-rail__shift" title={tip(`${s.day ? 'Dnevna' : 'Noćna'} smena, još ${leftText(s.left)}`)} data-tip-side={tipSide}>
        <div className="sx-rail__shift-row">
          <span className="sx-rail__shift-name">{s.day ? 'Dnevna smena' : 'Noćna smena'}</span>
          <span className="sx-rail__shift-time">{s.day ? '07-19' : '19-07'}</span>
        </div>
        <div className="sx-rail__shift-bar"><span style={{ transform: `scaleX(${s.pct / 100})` }} /></div>
        <span className="sx-rail__shift-left">još {leftText(s.left)}</span>
      </div>

      <div className="sx-rail__footer">
        <button type="button" className="sx-rail__link sx-roll-host" onClick={onSearch} data-testid="open-palette" title={tip('Pretraga (Ctrl K)')} data-tip-side={tipSide}>
          <span className="sx-rail__icon"><Search size={18} strokeWidth={1.8} /></span>
          <span className="sx-rail__label"><RollText text="Pretraga" /></span>
          {!collapsed && <span className="sx-rail__kbd">Ctrl K</span>}
        </button>
        <button type="button" className={cx('sx-rail__link sx-roll-host', panel === 'bell' && 'is-open')} onClick={onBell} data-testid="bell" aria-label={`Obaveštenja, nepročitanih ${unread}`} title={tip('Obaveštenja')} data-tip-side={tipSide}>
          <span className="sx-rail__icon"><Bell size={18} strokeWidth={1.8} />{unread > 0 && collapsed && <span className="sx-rail__pip" data-tone="bad" />}</span>
          <span className="sx-rail__label"><RollText text="Obaveštenja" /></span>
          {unread > 0 && !collapsed && <span className="sx-badge" data-tone="bad">{unread > 99 ? '99+' : unread}</span>}
        </button>
        {isAdmin && (
          <NavLink to="/" className="sx-rail__link sx-roll-host" data-testid="nav-montaza" title={tip('Prebaci na Montažu')} data-tip-side={tipSide}>
            <span className="sx-rail__icon"><Wrench size={18} strokeWidth={1.8} /></span>
            <span className="sx-rail__label"><RollText text="Montaža" /></span>
          </NavLink>
        )}
        <button type="button" className={cx('sx-rail__user', panel === 'user' && 'is-open')} onClick={onUser} data-testid="user-menu" title={tip(user.name)} data-tip-side={tipSide} aria-haspopup="menu">
          <Avatar name={user.name} className="sx-rail__avatar" />
          <span className="sx-rail__user-text"><b>{user.name}</b><span>{ROLE[user.role] || 'Korisnik'}</span></span>
        </button>
      </div>
    </aside>
  );
}

function UserMenu({ user, logout, close }) {
  const ref = useRef(null);
  useLayer(true, close);
  useEffect(() => {
    const on = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[data-testid="user-menu"]')) close(); };
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, [close]);
  return createPortal(
    <div className="sx-portal">
      <motion.div ref={ref} className="sx-pop sx-usermenu" role="menu" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4, transition: { duration: 0.12, ease: 'linear' } }} transition={{ opacity: { duration: 0.15, ease: 'linear' }, y: { duration: 0.24, ease: EASE_OUT } }}>
        <div className="sx-usermenu__head"><b>{user.name}</b><span>{ROLE[user.role] || 'Korisnik'}</span></div>
        <button type="button" className="sx-menu-item is-danger" role="menuitem" onClick={logout} data-testid="logout"><LogOut size={16} strokeWidth={1.8} />Odjavi se</button>
      </motion.div>
    </div>,
    document.body
  );
}

function MobileMenu({ open, onClose, items, badges, user, isAdmin, logout, onSearch }) {
  const reduce = useReducedMotion();
  useLayer(open, onClose);
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="sx-portal">
          <motion.div
            className="sx-mmenu"
            initial={reduce ? { opacity: 0 } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%', transition: { duration: 0.3, ease: [0.36, 0, 0.66, 0] } }}
            transition={{ duration: 0.45, ease: EASE_MOVE }}
            data-testid="mobile-menu"
          >
            <svg className="sx-mmenu__edge" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><motion.path initial={{ d: 'M100 0 Q0 50 100 100 Z' }} animate={{ d: 'M100 0 Q100 50 100 100 Z' }} transition={{ duration: 0.6, ease: EASE_MOVE, delay: 0.05 }} /></svg>
            <div className="sx-mmenu__bar">
              <BrandMark />
              <span className="sx-mmenu__brand">Robotik Security</span>
              <button type="button" className="sx-mmenu__close" onClick={onClose} aria-label="Zatvori meni" data-testid="menu-close"><X size={22} strokeWidth={1.8} /></button>
            </div>
            <nav className="sx-mmenu__nav">
              <span className="sx-eyebrow">Security · meni</span>
              <ul>
                {items.map((n, i) => {
                  const b = badges[n.key];
                  return (
                    <motion.li key={n.key} initial={reduce ? false : { opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ opacity: { duration: 0.2, delay: 0.12 + i * 0.03, ease: 'linear' }, x: { duration: 0.5, delay: 0.12 + i * 0.03, ease: EASE_OUT } }}>
                      <NavLink to={n.to} end={n.end} className={({ isActive }) => cx('sx-mmenu__link', isActive && 'is-active')} onClick={onClose}>
                        <span className="sx-mmenu__dot" aria-hidden="true" />{n.label}{b && <span className="sx-badge" data-tone={b.tone}>{b.n}</span>}
                      </NavLink>
                    </motion.li>
                  );
                })}
              </ul>
            </nav>
            <div className="sx-mmenu__foot">
              <button type="button" className="sx-mmenu__small" onClick={onSearch}><Search size={18} strokeWidth={1.8} />Pretraga i brze radnje</button>
              {isAdmin && <NavLink to="/" className="sx-mmenu__small" onClick={onClose}><Wrench size={18} strokeWidth={1.8} />Prebaci na Montažu</NavLink>}
              <div className="sx-mmenu__user"><Avatar name={user.name} /><span><b>{user.name}</b><span>{ROLE[user.role] || 'Korisnik'}</span></span></div>
              <Btn variant="dark" icon={LogOut} onClick={logout} data-testid="logout">Odjavi se</Btn>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

const NOTIF_TONE = { security_alarm: 'bad', security_unknown_tag: 'warn', security_contract_expiry: 'warn', security_license_expiry: 'warn', security_report: 'info' };

function NotificationsPanel({ items, reload, close, mobile, left }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const now = useTick(30000);
  useLayer(true, close);
  useEffect(() => {
    const on = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[data-testid="bell"]')) close(); };
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, [close]);
  const idOf = (n) => n.id || n._id;
  const open = async (n) => {
    try { if (!n.isRead) await sec.markRead(idOf(n)); } catch (e) { /* nije kritično */ }
    close(); reload();
    if (n.targetPage) navigate(n.targetPage);
  };
  const list = items.slice(0, 40);
  return createPortal(
    <div className="sx-portal">
      <motion.div ref={ref} className={cx('sx-pop sx-notifs', mobile && 'is-mobile')} style={mobile ? undefined : { left }} role="dialog" aria-label="Obaveštenja" data-testid="notifications"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6, transition: { duration: 0.12, ease: 'linear' } }}
        transition={{ opacity: { duration: 0.15, ease: 'linear' }, y: { duration: 0.28, ease: EASE_OUT } }}>
        <div className="sx-notifs__head">
          <span className="sx-eyebrow">Obaveštenja</span>
          {list.some((n) => !n.isRead) && <button type="button" className="sx-link" onClick={async () => { await sec.markAllRead().catch(() => {}); reload(); }}>Označi sve kao pročitano</button>}
        </div>
        <div className="sx-notifs__list">
          {!list.length && <div className="sx-empty"><b>Nema obaveštenja</b><span>Ovde stižu alarmi, nepoznati tagovi i istek ugovora.</span></div>}
          {list.map((n) => (
            <button type="button" key={idOf(n)} className={cx('sx-notif', !n.isRead && 'is-new')} onClick={() => open(n)}>
              <Led tone={NOTIF_TONE[n.type] || 'info'} />
              <span className="sx-notif__body"><b>{n.title}</b><span>{n.message}</span></span>
              <time className="sx-notif__time">{agoText(n.createdAt, now)}</time>
            </button>
          ))}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// Pretraga i brze radnje (Ctrl+K): stranice, objekti, radnici, akcije; strelice biraju, Enter otvara
function CommandPalette({ onClose }) {
  const { facilities, openWorker, openQuickTask, navigate, isAdmin } = useSec();
  const [q, setQ] = useState('');
  const [workers, setWorkers] = useState([]);
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  useLayer(true, onClose, (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    if (e.key === 'Enter' && items[idx]) { e.preventDefault(); go(items[idx].run); }
  });
  useEffect(() => { setTimeout(() => inputRef.current && inputRef.current.focus(), 20); sec.workers({ active: 'all' }).then(setWorkers).catch(() => {}); }, []);
  const go = (fn) => { onClose(); fn(); };
  const items = useMemo(() => {
    const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
    const t = fold(q.trim());
    const match = (s) => !t || fold(s).includes(t);
    const actions = [
      { g: 'Brze radnje', label: 'Novi povremeni zadatak', icon: ClipboardList, run: () => openQuickTask({}) },
      { g: 'Brze radnje', label: 'Nova smena u rasporedu', icon: Plus, run: () => navigate('/security/raspored') },
      isAdmin && { g: 'Brze radnje', label: 'Novi radnik', icon: Users, run: () => navigate('/security/radnici?novi=1') },
      isAdmin && { g: 'Brze radnje', label: 'Novi objekat', icon: Building2, run: () => navigate('/security/objekti?novi=1') },
      isAdmin && { g: 'Brze radnje', label: 'Dodaj NFC tag', icon: Nfc, run: () => navigate('/security/objekti?tag=1') },
      { g: 'Brze radnje', label: 'Pravila alarma', icon: SlidersHorizontal, run: () => navigate('/security/alarmi') }
    ].filter(Boolean);
    const pages = NAV.filter((n) => !n.admin || isAdmin).map((n) => ({ g: 'Stranice', label: n.label, icon: n.icon, run: () => navigate(n.to) }));
    const facs = facilities.map((f) => ({ g: 'Objekti', label: f.name, sub: f.city, icon: Building2, run: () => navigate(`/security/objekti/${f._id}`) }));
    const ws = workers.map((w) => ({ g: 'Radnici', label: w.name, sub: w.role === 'coordinator' ? 'koordinator' : (w.facilityIds || []).map((f) => f.name).join(', '), icon: Users, run: () => openWorker(w._id) }));
    return [...actions, ...pages, ...facs, ...ws].filter((i) => match(`${i.label} ${i.sub || ''}`)).slice(0, 40);
  }, [q, facilities, workers, isAdmin, navigate, openQuickTask, openWorker]);
  useEffect(() => { setIdx(0); }, [q]);
  useEffect(() => {
    const el = listRef.current && listRef.current.querySelector('[aria-selected="true"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [idx]);
  let lastG = null;
  return createPortal(
    <div className="sx-portal">
      <div className="sx-dialog-backdrop sx-cmd-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="sx-cmd" role="dialog" aria-modal="true" aria-label="Pretraga i brze radnje" data-testid="palette">
          <div className="sx-cmd__in">
            <Search size={18} strokeWidth={1.8} />
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Traži objekat, radnika ili radnju" role="combobox" aria-expanded="true" aria-controls="sx-cmd-list" aria-activedescendant={items[idx] ? `sx-cmd-${idx}` : undefined} data-testid="palette-input" />
            <Kbd>Esc</Kbd>
          </div>
          <div className="sx-cmd__list" id="sx-cmd-list" role="listbox" ref={listRef}>
            {!items.length && <div className="sx-empty" style={{ padding: 16 }}><b>Nema rezultata</b><span>Probaj deo naziva objekta ili ime radnika.</span></div>}
            {items.map((it, i) => {
              const head = it.g !== lastG ? <div className="sx-cmd__group" key={`g-${it.g}`}>{it.g}</div> : null;
              lastG = it.g;
              const I = it.icon;
              return (
                <React.Fragment key={`${it.g}-${it.label}-${i}`}>
                  {head}
                  <button type="button" id={`sx-cmd-${i}`} role="option" aria-selected={i === idx} className={cx('sx-cmd__item', i === idx && 'is-on')} onMouseMove={() => setIdx(i)} onClick={() => go(it.run)}>
                    <I size={16} strokeWidth={1.8} /><span className="sx-cmd__label">{it.label}</span>{it.sub && <span className="sx-cmd__sub">{it.sub}</span>}
                    {i === idx && <CornerDownLeft size={14} strokeWidth={1.8} className="sx-cmd__enter" />}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

