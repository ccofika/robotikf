// Ulaz u Robotik Security deo aplikacije (/security/*): sopstveni izgled, rute i paneli.
// Izgled (sx-) je po veštini awwwards-research-robotik-design-skill, paleta "Papir i tuš" (sx/tokens.css).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import '@fontsource-variable/inter/opsz.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource-variable/roboto-flex/wdth.css';
import '@fontsource-variable/golos-text/index.css';
import '@fontsource-variable/geist-mono/index.css';
import './sx/tokens.css';
import './sx/sx.css';
import './sx/overlays.css';
import './sx/forms.css';
import './sx/page.css';
import './sx/shell.css';
import { sec } from './api';
import { ToastProvider } from './sx/toast';
import { ConfirmHost } from './sx/confirm';
import { installTooltips, installDomeHover } from './sx/tooltips';
import { PageEnter } from './sx/motion';
import Shell from './sx/Shell';
import Live from './pages/Live';
import Schedule from './pages/Schedule';
import Facilities from './pages/Facilities';
import FacilityDetail from './pages/FacilityDetail';
import Workers from './pages/Workers';
import Alarms from './pages/Alarms';
import Reports from './pages/Reports';
import Pay from './pages/Pay';
import GuardWeb from './pages/GuardWeb';
import WorkerDrawer from './pages/WorkerDrawer';
import ShiftDrawer from './pages/ShiftDrawer';
import QuickTaskModal from './pages/QuickTaskModal';

const ADMIN = ['admin', 'superadmin', 'supervisor'];
const Ctx = createContext(null);
export const useSec = () => useContext(Ctx);

installTooltips();
installDomeHover();

function Provider({ user, logout, children }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [facilities, setFacilities] = useState([]);
  const [quickTask, setQuickTask] = useState(null);
  const isAdmin = ADMIN.includes(user.role);

  const refreshFacilities = useCallback(() => sec.facilities().then(setFacilities).catch(() => {}), []);
  useEffect(() => { refreshFacilities(); }, [refreshFacilities]);

  const setParam = useCallback((key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: false });
  }, [params, setParams]);

  const value = useMemo(() => ({
    user, logout, isAdmin, facilities, refreshFacilities, navigate,
    openWorker: (id) => setParam('radnik', id),
    openShift: (id) => setParam('smena', id),
    openQuickTask: (prefill) => setQuickTask(prefill || {}),
    bump: 0
  }), [user, logout, isAdmin, facilities, refreshFacilities, navigate, setParam]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <WorkerDrawer id={params.get('radnik')} onClose={() => setParam('radnik', null)} />
      <ShiftDrawer id={params.get('smena')} onClose={() => setParam('smena', null)} />
      {quickTask && <QuickTaskModal prefill={quickTask} onClose={() => setQuickTask(null)} />}
    </Ctx.Provider>
  );
}

function Page({ children }) {
  const loc = useLocation();
  return <PageEnter routeKey={loc.pathname}>{children}</PageEnter>;
}

export default function SecurityApp({ user, logout }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'guard') {
    return (
      <ToastProvider>
        <GuardWeb user={user} logout={logout} />
        <ConfirmHost />
      </ToastProvider>
    );
  }
  if (!ADMIN.includes(user.role) && user.role !== 'coordinator') return <Navigate to="/access-denied" replace />;
  return (
    <ToastProvider>
      <Provider user={user} logout={logout}>
        <Shell>
          <Page>
            <Routes>
              <Route index element={<Live />} />
              <Route path="raspored" element={<Schedule />} />
              <Route path="objekti" element={<Facilities />} />
              <Route path="objekti/:id" element={<FacilityDetail />} />
              <Route path="radnici" element={<Workers />} />
              <Route path="alarmi" element={<Alarms />} />
              <Route path="izvestaji" element={<Reports />} />
              <Route path="satnica" element={ADMIN.includes(user.role) ? <Pay /> : <Navigate to="/security" replace />} />
              <Route path="*" element={<Navigate to="/security" replace />} />
            </Routes>
          </Page>
        </Shell>
      </Provider>
      <ConfirmHost />
    </ToastProvider>
  );
}
