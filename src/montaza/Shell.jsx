// Ljuska Montaže u izgledu Security dela: šina (desktop, 248 <-> 76 px), gornja traka i meni preko ekrana
// (telefon), pretraga i brze radnje (Ctrl+K), obaveštenja, nalog i traka učitavanja.
// Stavke menija i pristup po ulozi su isti kao u starom bočnom meniju (ShadcnSidebar).
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  LayoutDashboard, Package, Cable, Wrench, HardHat, ClipboardList, PencilLine, Users, FileSpreadsheet, History, Car,
  TriangleAlert, Wallet, ServerCog, Sparkles, Shield, Bell, Search, LogOut, ChevronsLeft, UserRound, X, CornerDownLeft,
  ClipboardPlus, Upload, UserPlus, PackagePlus, MapPin
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api, { techniciansAPI } from '../services/api';
import { cx, Btn, Kbd, Avatar } from '../security/sx/ui';
import { RollText, EASE_MOVE, EASE_OUT } from '../security/sx/motion';
import { useLayer } from '../security/sx/layer';
import BrandMark from '../security/sx/BrandMark';
import SignalBar from '../security/sx/SignalBar';
import NotificationWindow from '../components/NotificationWindow';
import AccountModal from '../components/AccountModal';
import TechnicianAccountModal from '../components/TechnicianAccountModal';

const ADMIN_ROLES = ['admin', 'superadmin', 'supervisor'];
const ROLE = { superadmin: 'Super Administrator', supervisor: 'Supervisor', admin: 'Administrator', technician: 'Tehničar' };

const ADMIN_NAV = [
  { to: '/', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/equipment', label: 'Oprema', icon: Package },
  { to: '/materials', label: 'Materijali', icon: Cable },
  { to: '/basic-equipment', label: 'Osnovna oprema', icon: Wrench },
  { to: '/technicians', label: 'Tehničari', icon: HardHat },
  { to: '/work-orders', label: 'Radni nalozi', icon: ClipboardList },
  { to: '/edit-work-orders', label: 'Edit', icon: PencilLine },
  { to: '/users', label: 'Korisnici', icon: Users },
  { to: '/export', label: 'Export', icon: FileSpreadsheet },
  { to: '/logs', label: 'Logovi', icon: History },
  { to: '/vehicles', label: 'Vozni park', icon: Car },
  { to: '/defective-equipment', label: 'Neispravna oprema', icon: TriangleAlert }
];
const SUPERADMIN_NAV = [...ADMIN_NAV, { to: '/finances', label: 'Finansije', icon: Wallet }, { to: '/backend-logs', label: 'Backend Logs', icon: ServerCog }];
const SUPERVISOR_NAV = [...SUPERADMIN_NAV, { to: '/new-design', label: 'New Design', icon: Sparkles }];
const TECH_NAV = [
  { to: '/my-work-orders', label: 'Moji radni nalozi', icon: ClipboardList },
  { to: '/my-equipment', label: 'Moja oprema', icon: Package },
  { to: '/my-materials', label: 'Moji materijali', icon: Cable },
  { to: '/my-basic-equipment', label: 'Moja osnovna oprema', icon: Wrench }
];
const navFor = (role) => (role === 'supervisor' ? SUPERVISOR_NAV : role === 'superadmin' ? SUPERADMIN_NAV : role === 'admin' ? ADMIN_NAV : TECH_NAV);

// Naslov za gornju traku i karticu pregledača (najduži prefiks putanje)
const TITLES = [
  ['/my-work-orders', 'Moji radni nalozi'], ['/my-equipment', 'Moja oprema'], ['/my-materials', 'Moji materijali'], ['/my-basic-equipment', 'Moja osnovna oprema'],
  ['/equipment/upload', 'Upload opreme'], ['/equipment/edit', 'Izmena opreme'], ['/equipment', 'Oprema'], ['/virtual-warehouse', 'Virtuelni magacin'],
  ['/materials/add', 'Novi materijal'], ['/materials/edit', 'Izmena materijala'], ['/materials', 'Materijali'], ['/basic-equipment', 'Osnovna oprema'],
  ['/technicians/add', 'Novi tehničar'], ['/technicians/gps', 'Lokacije tehničara'], ['/technicians', 'Tehničari'],
  ['/work-orders/upload', 'Upload naloga'], ['/work-orders/add', 'Novi radni nalog'], ['/work-orders/list', 'Radni nalozi'], ['/work-orders', 'Radni nalozi'],
  ['/edit-work-orders', 'Edit'], ['/users', 'Korisnici'], ['/export', 'Export'], ['/logs', 'Logovi'], ['/backend-logs', 'Backend Logs'],
  ['/vehicles', 'Vozni park'], ['/defective-equipment', 'Neispravna oprema'], ['/finances', 'Finansije'], ['/reports/user-equipment', 'Oprema korisnika'],
  ['/new-design', 'New Design'], ['/access-denied', 'Pristup odbijen']
];
const titleOf = (path) => (path === '/' ? 'Dashboard' : (TITLES.find(([p]) => path === p || path.startsWith(`${p}/`)) || [null, 'Robotik'])[1]);

const RAIL_KEY = 'mx.rail';
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

export default function Shell({ children }) {
  const { user, logout } = useContext(AuthContext);
  const loc = useLocation();
  const mobile = useMobile();
  const [collapsed, setCollapsed] = useState(readRail);
  const [panel, setPanel] = useState(null); // 'bell' | 'user' | 'menu'
  const [palette, setPalette] = useState(false);
  const [account, setAccount] = useState(false);
  const [unread, setUnread] = useState(0);
  const isAdmin = ADMIN_ROLES.includes(user.role);
  const items = navFor(user.role);
  const title = titleOf(loc.pathname);

  // Broj nepročitanih: pri učitavanju i kad se otvori zvonce (bez automatskog osvežavanja, kao ranije)
  const fetchUnread = async () => {
    try {
      const r = await api.get('/api/notifications/unread', { timeout: 10000 });
      setUnread(r.data.unreadCount || 0);
    } catch (e) { setUnread(0); }
  };
  useEffect(() => { fetchUnread(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const on = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); } };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);
  useEffect(() => { setPanel(null); }, [loc.pathname]);
  useEffect(() => { document.title = `${title} · Robotik`; }, [title]);
  useEffect(() => { try { localStorage.setItem(RAIL_KEY, collapsed ? 'collapsed' : 'open'); } catch (e) { /* bez pamćenja */ } }, [collapsed]);

  const toggleBell = () => { if (panel !== 'bell') fetchUnread(); setPanel(panel === 'bell' ? null : 'bell'); };
  const openAccount = () => { setPanel(null); setAccount(true); };

  return (
    <div className={cx('sx sx-app mx-app', collapsed && !mobile && 'is-collapsed')} data-testid="montaza-root">
      <SignalBar />
      {!mobile && (
        <Rail items={items} collapsed={collapsed} setCollapsed={setCollapsed} user={user} isAdmin={isAdmin} unread={unread}
          onSearch={() => setPalette(true)} onBell={toggleBell} onUser={() => setPanel(panel === 'user' ? null : 'user')} panel={panel} />
      )}
      {mobile && (
        <header className="sx-topbar" data-testid="topbar">
          <BrandMark />
          <span className="sx-topbar__title" data-testid="page-title">{title}</span>
          <button type="button" className="sx-topbar__btn" onClick={toggleBell} aria-label={`Obaveštenja, nepročitanih ${unread}`} data-testid="bell">
            <Bell size={20} strokeWidth={1.8} />{unread > 0 && <span className="sx-badge" data-tone="bad">{unread > 99 ? '99+' : unread}</span>}
          </button>
          <button type="button" className="sx-topbar__btn sx-burger" onClick={() => setPanel(panel === 'menu' ? null : 'menu')} aria-label="Otvori meni" aria-expanded={panel === 'menu'} data-testid="menu-button">
            <span /><span />
          </button>
        </header>
      )}
      {mobile && (
        <MobileMenu open={panel === 'menu'} onClose={() => setPanel(null)} items={items} user={user} isAdmin={isAdmin} logout={logout}
          onAccount={openAccount} onSearch={() => { setPanel(null); setPalette(true); }} />
      )}

      <main className="sx-main mx-main" id="sx-main">{children}</main>

      <NotificationWindow isOpen={panel === 'bell'} onClose={() => setPanel(null)} mobile={mobile} left={collapsed ? 88 : 260}
        onNotificationUpdate={() => setUnread((n) => Math.max(0, n - 1))} />
      <AnimatePresence>
        {panel === 'user' && !mobile && <UserMenu key="user" user={user} logout={logout} onAccount={openAccount} close={() => setPanel(null)} />}
      </AnimatePresence>
      {palette && <CommandPalette items={items} isAdmin={isAdmin} onClose={() => setPalette(false)} />}
      {account && ADMIN_ROLES.includes(user.role) && <AccountModal onClose={() => setAccount(false)} />}
      {account && user.role === 'technician' && <TechnicianAccountModal onClose={() => setAccount(false)} />}
    </div>
  );
}

function Rail({ items, collapsed, setCollapsed, user, isAdmin, unread, onSearch, onBell, onUser, panel }) {
  const tipSide = collapsed ? 'right' : undefined;
  const tip = (t) => (collapsed ? t : undefined);
  return (
    <aside className={cx('sx-rail', collapsed && 'is-collapsed')} aria-label="Meni">
      <div className="sx-rail__brand">
        <button type="button" className="sx-rail__markbtn" onClick={() => collapsed && setCollapsed(false)} aria-label={collapsed ? 'Raširi meni' : 'Robotik'} title={tip('Raširi meni')} data-tip-side="right" tabIndex={collapsed ? 0 : -1}>
          <BrandMark />
        </button>
        <span className="sx-rail__brandtext"><b>Robotik</b><span>{isAdmin ? 'Montaža' : 'Tehničar'}</span></span>
        <button type="button" className="sx-rail__collapse" onClick={() => setCollapsed(true)} aria-label="Skupi meni" title="Skupi meni" tabIndex={collapsed ? -1 : 0}>
          <ChevronsLeft size={16} strokeWidth={1.8} />
        </button>
      </div>

      <nav className="sx-rail__nav">
        <ul>
          {items.map((n) => {
            const Icon = n.icon;
            return (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end} className={({ isActive }) => cx('sx-rail__link sx-roll-host', isActive && 'is-active')} title={tip(n.label)} data-tip-side={tipSide}>
                  {({ isActive }) => (
                    <>
                      <span className="sx-rail__node" aria-hidden="true" />
                      {isActive && <motion.span layoutId="mx-rail-stamp" className="sx-rail__stamp" transition={{ type: 'spring', stiffness: 380, damping: 34 }} aria-hidden="true" />}
                      <span className="sx-rail__icon"><Icon size={18} strokeWidth={1.8} /></span>
                      <span className="sx-rail__label"><RollText text={n.label} /></span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sx-rail__footer">
        <button type="button" className="sx-rail__link sx-roll-host" onClick={onSearch} data-testid="open-palette" title={tip('Pretraga (Ctrl K)')} data-tip-side={tipSide}>
          <span className="sx-rail__icon"><Search size={18} strokeWidth={1.8} /></span>
          <span className="sx-rail__label"><RollText text="Pretraga" /></span>
          {!collapsed && <span className="sx-rail__kbd">Ctrl K</span>}
        </button>
        <button type="button" className={cx('sx-rail__link sx-roll-host', panel === 'bell' && 'is-open')} onClick={onBell} data-testid="bell" aria-label={`Notifikacije, nepročitanih ${unread}`} title={tip('Notifikacije')} data-tip-side={tipSide}>
          <span className="sx-rail__icon"><Bell size={18} strokeWidth={1.8} />{unread > 0 && collapsed && <span className="sx-rail__pip" data-tone="bad" />}</span>
          <span className="sx-rail__label"><RollText text="Notifikacije" /></span>
          {unread > 0 && !collapsed && <span className="sx-badge" data-tone="bad">{unread > 99 ? '99+' : unread}</span>}
        </button>
        {isAdmin && (
          <NavLink to="/security" className="sx-rail__link sx-roll-host" data-testid="nav-security" title={tip('Prebaci na Security')} data-tip-side={tipSide}>
            <span className="sx-rail__icon"><Shield size={18} strokeWidth={1.8} /></span>
            <span className="sx-rail__label"><RollText text="Security" /></span>
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

function UserMenu({ user, logout, onAccount, close }) {
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
        <button type="button" className="sx-menu-item" role="menuitem" onClick={onAccount} data-testid="account"><UserRound size={16} strokeWidth={1.8} />Moj nalog</button>
        <button type="button" className="sx-menu-item is-danger" role="menuitem" onClick={logout} data-testid="logout"><LogOut size={16} strokeWidth={1.8} />Odjavite se</button>
      </motion.div>
    </div>,
    document.body
  );
}

function MobileMenu({ open, onClose, items, user, isAdmin, logout, onAccount, onSearch }) {
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
              <span className="sx-mmenu__brand">Robotik</span>
              <button type="button" className="sx-mmenu__close" onClick={onClose} aria-label="Zatvori meni" data-testid="menu-close"><X size={22} strokeWidth={1.8} /></button>
            </div>
            <nav className="sx-mmenu__nav">
              <span className="sx-eyebrow">{isAdmin ? 'Montaža · meni' : 'Tehničar · meni'}</span>
              <ul>
                {items.map((n, i) => (
                  <motion.li key={n.to} initial={reduce ? false : { opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ opacity: { duration: 0.2, delay: 0.12 + i * 0.03, ease: 'linear' }, x: { duration: 0.5, delay: 0.12 + i * 0.03, ease: EASE_OUT } }}>
                    <NavLink to={n.to} end={n.end} className={({ isActive }) => cx('sx-mmenu__link mx-mmenu__link', isActive && 'is-active')} onClick={onClose}>
                      <span className="sx-mmenu__dot" aria-hidden="true" />{n.label}
                    </NavLink>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <div className="sx-mmenu__foot">
              <button type="button" className="sx-mmenu__small" onClick={onSearch}><Search size={18} strokeWidth={1.8} />Pretraga i brze radnje</button>
              {isAdmin && <NavLink to="/security" className="sx-mmenu__small" onClick={onClose}><Shield size={18} strokeWidth={1.8} />Prebaci na Security</NavLink>}
              <button type="button" className="sx-mmenu__small" onClick={() => { onClose(); onAccount(); }}><UserRound size={18} strokeWidth={1.8} />Moj nalog</button>
              <div className="sx-mmenu__user"><Avatar name={user.name} /><span><b>{user.name}</b><span>{ROLE[user.role] || 'Korisnik'}</span></span></div>
              <Btn variant="dark" icon={LogOut} onClick={logout} data-testid="logout">Odjavite se</Btn>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// Pretraga i brze radnje (Ctrl+K): stranice, prečice za nove unose, tehničari; strelice biraju, Enter otvara
function CommandPalette({ items, isAdmin, onClose }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [techs, setTechs] = useState([]);
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const go = (to) => { onClose(); navigate(to); };
  const list = useMemo(() => {
    const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
    const t = fold(q.trim());
    const match = (s) => !t || fold(s).includes(t);
    const actions = isAdmin ? [
      { g: 'Brze radnje', label: 'Novi radni nalog', icon: ClipboardPlus, to: '/work-orders/add' },
      { g: 'Brze radnje', label: 'Upload radnih naloga', icon: Upload, to: '/work-orders/upload' },
      { g: 'Brze radnje', label: 'Novi tehničar', icon: UserPlus, to: '/technicians/add' },
      { g: 'Brze radnje', label: 'Upload opreme', icon: Upload, to: '/equipment/upload' },
      { g: 'Brze radnje', label: 'Novi materijal', icon: PackagePlus, to: '/materials/add' },
      { g: 'Brze radnje', label: 'Lokacije tehničara', icon: MapPin, to: '/technicians/gps' }
    ] : [];
    const pages = items.map((n) => ({ g: 'Stranice', label: n.label, icon: n.icon, to: n.to }));
    const people = techs.map((x) => ({ g: 'Tehničari', label: x.name, sub: x.phoneNumber || '', icon: HardHat, to: `/technicians/${x._id}` }));
    return [...actions, ...pages, ...people].filter((i) => match(`${i.label} ${i.sub || ''}`)).slice(0, 40);
  }, [q, techs, items, isAdmin]);
  useLayer(true, onClose, (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(list.length - 1, i + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    if (e.key === 'Enter' && list[idx]) { e.preventDefault(); go(list[idx].to); }
  });
  useEffect(() => {
    setTimeout(() => inputRef.current && inputRef.current.focus(), 20);
    if (isAdmin) techniciansAPI.getAll().then((r) => setTechs((Array.isArray(r.data) ? r.data : []).filter((x) => !x.deletedAt && (!x.role || x.role === 'technician')))).catch(() => {});
  }, [isAdmin]);
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
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={isAdmin ? 'Traži stranicu, tehničara ili radnju' : 'Traži stranicu'} role="combobox" aria-expanded="true" aria-controls="mx-cmd-list" aria-activedescendant={list[idx] ? `mx-cmd-${idx}` : undefined} data-testid="palette-input" />
            <Kbd>Esc</Kbd>
          </div>
          <div className="sx-cmd__list" id="mx-cmd-list" role="listbox" ref={listRef}>
            {!list.length && <div className="sx-empty" style={{ padding: 16 }}><b>Nema rezultata</b><span>Probaj deo naziva stranice ili ime tehničara.</span></div>}
            {list.map((it, i) => {
              const head = it.g !== lastG ? <div className="sx-cmd__group" key={`g-${it.g}`}>{it.g}</div> : null;
              lastG = it.g;
              const I = it.icon;
              return (
                <React.Fragment key={`${it.g}-${it.to}-${i}`}>
                  {head}
                  <button type="button" id={`mx-cmd-${i}`} role="option" aria-selected={i === idx} className={cx('sx-cmd__item', i === idx && 'is-on')} onMouseMove={() => setIdx(i)} onClick={() => go(it.to)}>
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
