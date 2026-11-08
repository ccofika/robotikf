import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ClipboardList, Package, HardHat, Wallet, Cable, CheckCircle2, Box, Wrench, Users, Calendar, History, Search, Bell,
  Plus, Download, RefreshCw, Eye, Trash2, Check, CircleAlert, MapPin, User, Phone, MessageSquare, ImageIcon, Clock,
  UserX, Table, Upload, RotateCcw, Printer, X, UserCheck
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import api, { workOrdersAPI, techniciansAPI } from '../../services/api';
import { toast } from '../../utils/toast';
import { getTimRowStyle } from '../../utils/tim';
import AIVerificationModal from '../../components/AIVerificationModal';
import ReturnWorkOrderModal from '../../components/ReturnWorkOrderModal';
import FancyDataTable from '../../components/fancy-table/FancyDataTable';
import { localYmd } from '../../utils/localDate';
import { cx, Btn, Led, Sign, State } from '../../security/sx/ui';
import { PageHead, Toolbar, Panel, Note, Tabs, Stat } from '../../security/sx/layout';
import { Select, Choice, SearchField, DateField } from '../../security/sx/forms';
import Dialog from '../../security/sx/Dialog';
import { confirm } from '../../security/sx/confirm';
import { LinkBtn, Pager, Loading } from '../../montaza/ui';
import './NewDesign.mx.css';

// Ton stanja radnog naloga (znak + tekst, kao u ostatku Montaže)
const STATUS_TONE = { zavrsen: 'ok', nezavrsen: 'warn', odlozen: 'info', otkazan: 'bad' };

// Brojka koja vodi na stranicu: cela kartica je link, kao ranije
const LinkStat = ({ to, icon: Icon, tag, label, value, sub }) => (
  <Link to={to} className="sx-stat is-button mx-nd-lstat">
    <span className="mx-nd-lstat__top">
      <span className="mx-nd-lstat__label"><Icon size={15} strokeWidth={1.9} aria-hidden="true" /><span className="sx-label">{label}</span></span>
      <span className="sx-tag">{tag}</span>
    </span>
    <span className="sx-stat__num sx-num">{value}</span>
    <span className="sx-stat__sub">{sub}</span>
  </Link>
);

// Traka napretka: natpis, vrednost i popunjenost (širina kao ranije)
const Meter = ({ label, value, width, tone }) => (
  <span className="mx-nd-meter">
    <span className="mx-nd-meter__top"><span>{label}</span><b>{value}</b></span>
    <span className="mx-nd-meter__track"><span className={cx('mx-nd-meter__fill', tone && `is-${tone}`)} style={{ width }} /></span>
  </span>
);

const NewDesign = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'supervisor';

  const [stats, setStats] = useState({
    equipment: 0,
    materials: 0,
    technicians: 0,
    workOrders: {
      total: 0,
      completed: 0,
      pending: 0,
      postponed: 0,
      avgCompletionTime: 0
    }
  });

  const [vehicleStats, setVehicleStats] = useState(null);
  const [financialStats, setFinancialStats] = useState(null);
  const [activityStats, setActivityStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  const getIconForAction = (action) => {
    const iconMap = {
      'workorder_completed': CheckCircle2,
      'equipment_added': Box,
      'material_added': Wrench,
      'technician_added': Users,
      'vehicle_added': Calendar,
      'default': History
    };
    return iconMap[action] || iconMap.default;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const apiCalls = [
        api.get('/api/equipment?statsOnly=true'),
        api.get('/api/materials?statsOnly=true'),
        api.get('/api/technicians'),
        api.get('/api/workorders/statistics/summary'),
        api.get('/api/vehicles/stats/overview').catch(() => ({ data: null })),
        api.get('/api/logs/statistics').catch(() => ({ data: null })),
        api.get('/api/logs/technicians?limit=5').catch(() => ({ data: { results: [] } }))
      ];

      if (isSuperAdmin) {
        apiCalls.push(
          api.get('/api/finances/reports?statsOnly=true').catch(() => ({ data: null }))
        );
      }

      const responses = await Promise.all(apiCalls);

      const [
        equipment,
        materials,
        techniciansRes,
        workOrderStats,
        vehicleStatsRes,
        logsStatsRes,
        logsRes,
        financialReportsRes
      ] = isSuperAdmin ? responses : [...responses, { data: null }];

      setStats({
        equipment: equipment.data.total || equipment.data.length || 0,
        materials: materials.data.total || materials.data.length || 0,
        technicians: techniciansRes.data.total || techniciansRes.data.filter?.(t => !t.deletedAt).length || 0,
        workOrders: {
          total: workOrderStats.data.total || 0,
          completed: workOrderStats.data.completed || 0,
          pending: workOrderStats.data.pending || 0,
          postponed: workOrderStats.data.postponed || 0,
          avgCompletionTime: workOrderStats.data.avgCompletionTime || 0
        }
      });

      setVehicleStats(vehicleStatsRes.data);
      setFinancialStats(financialReportsRes?.data?.summary || null);
      setActivityStats(logsStatsRes.data);

      const logsData = logsRes.data?.results || logsRes.data?.data || [];
      const allLogs = [];
      if (Array.isArray(logsData)) {
        logsData.forEach(group => {
          if (group.logs && Array.isArray(group.logs)) {
            group.logs.forEach(log => {
              allLogs.push({
                ...log,
                technicianName: group.technicianName || group.userName || 'Nepoznat'
              });
            });
          }
        });
      }

      const recentLogs = allLogs
        .sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0))
        .slice(0, 5)
        .map(log => ({
          type: log.action || 'activity',
          message: log.description || log.action || 'Aktivnost',
          timestamp: log.timestamp || log.createdAt,
          icon: getIconForAction(log.action),
          technicianName: log.technicianName
        }));

      setRecentActivity(recentLogs);

    } catch (error) {
      console.error('Greška pri učitavanju dashboard podataka:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffMs / 86400000)} days ago`;
  };

  if (loading) {
    return (
      <div className="sx-page mx-nd" data-testid="page-new-design">
        <Loading rows={6} text="Loading..." />
      </div>
    );
  }

  const completionRate = stats.workOrders.total > 0
    ? Math.round((stats.workOrders.completed / stats.workOrders.total) * 100)
    : 0;

  return (
    <div className="sx-page mx-nd" data-testid="page-new-design">
      <PageHead
        eyebrow="Montaža · New Design"
        title="Dashboard"
        lead={<>Welcome back, {user?.name}</>}
        actions={(
          <>
            <div className="sx-search mx-nd-headsearch">
              <Search size={16} strokeWidth={1.9} aria-hidden="true" className="sx-search__icon" />
              <input type="text" placeholder="Search..." />
            </div>
            <Btn variant="ghost" icon={Bell} className="mx-nd-bell" />
            <span className="sx-avatar mx-nd-ink">{user?.name?.charAt(0) || 'U'}</span>
          </>
        )}
      />

      {/* Glavne brojke: svaka kartica vodi na svoju stranicu */}
      <div className="sx-stats">
        <LinkStat to="/work-orders" icon={ClipboardList} tag="Total" label="Radni nalozi" value={stats.workOrders.total.toLocaleString()}
          sub={<><span className="mx-nd-up is-ok">↑ {completionRate}%</span> completed</>} />
        <LinkStat to="/equipment" icon={Package} tag="Active" label="Oprema" value={stats.equipment.toLocaleString()}
          sub={<><span className="mx-nd-up">↑ +6.1%</span> vs last month</>} />
        <LinkStat to="/technicians" icon={HardHat} tag="Team" label="Tehničari" value={stats.technicians.toLocaleString()}
          sub={<><span className="mx-nd-up">↑ +2.8%</span> vs last month</>} />
        {isSuperAdmin && financialStats ? (
          <LinkStat to="/finances" icon={Wallet} tag="Month" label="Profit" value={`$${((financialStats.totalProfit || 0) / 1000).toFixed(1)}k`}
            sub={<><span className="mx-nd-up is-ok">↑ +12%</span> vs last month</>} />
        ) : (
          <LinkStat to="/materials" icon={Cable} tag="Stock" label="Materijali" value={stats.materials.toLocaleString()}
            sub={<><span className="mx-nd-up">↑ +9%</span> vs last month</>} />
        )}
      </div>

      {/* Nalozi po mesecima i brze brojke */}
      <div className="sx-cols sx-cols--main">
        <Panel
          className="mx-nd-wrap"
          title="Work Orders Overview"
          sub="Monthly completion tracking"
          actions={(
            <Choice size="sm" value="Month" onChange={() => {}} layoutId="mx-nd-period"
              options={['Day', 'Week', 'Month', 'Year'].map((p) => ({ value: p, label: p }))} />
          )}
        >
          <div className="mx-nd-bars">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map((month, i) => {
              const heights = [60, 75, 55, 80, 65, 90, 70, 85];
              const isHighlighted = i === 5;
              return (
                <div key={month} className={cx('mx-nd-bars__col', isHighlighted && 'is-on')}>
                  <div className="mx-nd-bars__track">
                    <div className="mx-nd-bars__bar" style={{height: `${heights[i]}%`}}></div>
                  </div>
                  <span className="mx-nd-bars__label">{month}</span>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="sx-stats mx-nd-quick">
          <Stat
            label="Završeni"
            value={stats.workOrders.completed}
            sub={<Meter label="Success rate" value={`${completionRate}%`} width={`${completionRate}%`} tone="accent" />}
          />
          <Stat
            label="U toku"
            value={stats.workOrders.pending}
            sub={<span className="mx-nd-meter__top"><span>Avg. time</span><b>{stats.workOrders.avgCompletionTime || 2.5}d</b></span>}
          />
        </div>
      </div>

      {/* Stanja naloga, poslednja aktivnost i učinak */}
      <div className="mx-nd-grid3">
        <Panel title="Status Breakdown" actions={<LinkBtn to="/work-orders" size="sm" variant="ghost">View all →</LinkBtn>}>
          <div className="mx-nd-brk">
            <div className="mx-nd-brk__row">
              <span className="mx-nd-brk__label"><Led tone="ok" />Završeni</span>
              <span className="mx-nd-brk__pct">
                {stats.workOrders.total > 0 ? Math.round((stats.workOrders.completed / stats.workOrders.total) * 100) : 0}%
              </span>
              <b className="mx-nd-brk__n">{stats.workOrders.completed}</b>
            </div>
            <div className="mx-nd-brk__row">
              <span className="mx-nd-brk__label"><Led tone="warn" />U toku</span>
              <span className="mx-nd-brk__pct">
                {stats.workOrders.total > 0 ? Math.round((stats.workOrders.pending / stats.workOrders.total) * 100) : 0}%
              </span>
              <b className="mx-nd-brk__n">{stats.workOrders.pending}</b>
            </div>
            <div className="mx-nd-brk__row">
              <span className="mx-nd-brk__label"><Led tone="info" />Odloženi</span>
              <span className="mx-nd-brk__pct">
                {stats.workOrders.total > 0 ? Math.round((stats.workOrders.postponed / stats.workOrders.total) * 100) : 0}%
              </span>
              <b className="mx-nd-brk__n">{stats.workOrders.postponed}</b>
            </div>
          </div>

          {/* Resursi */}
          <div className="mx-nd-res">
            <p className="sx-label">Resources</p>
            <div className="mx-nd-mini">
              <Stat label="Oprema" value={stats.equipment} />
              <Stat label="Materijali" value={stats.materials} />
              <Stat label="Tehničari" value={stats.technicians} />
            </div>
          </div>
        </Panel>

        <Panel title="Recent Activity" actions={<LinkBtn to="/logs" size="sm" variant="ghost">View all →</LinkBtn>}>
          {recentActivity.length > 0 ? (
            <div className="sx-list">
              {recentActivity.slice(0, 5).map((activity, index) => {
                const IconComponent = activity.icon;
                return (
                  <div key={index} className="sx-item">
                    <span className="sx-item__icon">
                      <IconComponent size={16} strokeWidth={1.8} />
                    </span>
                    <div className="sx-item__main">
                      <b className="mx-nd-clip">{activity.message}</b>
                      <span>{formatTimeAgo(activity.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mx-nd-none">Nema aktivnosti</p>
          )}
        </Panel>

        <Panel title="Performance">
          <div className="mx-nd-meters">
            <Meter label="Completion Rate" value={`${completionRate}%`} width={`${completionRate}%`} />
            <Meter
              label="Avg. per Technician"
              value={stats.technicians > 0 ? Math.round(stats.workOrders.total / stats.technicians) : 0}
              width="68%"
              tone="accent"
            />
            <Meter label="On-time Delivery" value="89%" width="89%" tone="ok" />
          </div>

          {activityStats && (
            <div className="mx-nd-today">
              <p className="sx-label">Today's Activity</p>
              <p className="sx-num mx-nd-today__n">{activityStats.todayLogs || 0}</p>
            </div>
          )}
        </Panel>
      </div>

      {/* Finansije - samo za superadmin */}
      {isSuperAdmin && financialStats && (
        <div className="sx-stats">
          <Stat
            label="Monthly Revenue"
            value={`$${((financialStats.totalRevenue || 0) / 1000).toFixed(1)}k`}
            sub="↑ +12% vs last month"
          />
          <Stat
            label="Expenses"
            value={`$${((financialStats.totalPayouts || 0) / 1000).toFixed(1)}k`}
            sub="↓ -5% vs last month"
          />
          <Stat
            label="Net Profit"
            value={`$${((financialStats.totalProfit || 0) / 1000).toFixed(1)}k`}
            sub="↑ +18% vs last month"
          />
          <div className="sx-stat mx-nd-fin__go">
            <LinkBtn to="/finances" variant="primary">View Details →</LinkBtn>
          </div>
        </div>
      )}

      {/* Pregled dizajna: radni nalozi po tehničarima */}
      <section className="mx-nd-sec">
        <div className="mx-nd-divider">
          <span className="sx-label">Pregled dizajna · Radni nalozi po tehničarima</span>
        </div>
        <TechnicianWorkOrdersPreview />
      </section>

      {/* Pregled dizajna: detalji radnog naloga */}
      <section className="mx-nd-sec">
        <div className="mx-nd-divider">
          <span className="sx-label">Pregled dizajna · Detalji radnog naloga</span>
        </div>
        <WorkOrderDetailPreview />
      </section>

      {/* Radni nalozi po tehničarima (pravi podaci) */}
      <WorkOrdersSection />
    </div>
  );
};

// Pregled dizajna: radni nalozi po tehničarima (statički podaci)
const TechnicianWorkOrdersPreview = () => {
  const [selectedTech, setSelectedTech] = React.useState('t1');
  const [activeFilter, setActiveFilter] = React.useState('');

  const techData = {
    t1: {
      name: 'Nikola Jovanović', phone: '+381 64 222 3344', initials: 'NJ',
      stats: { total: 47, completed: 38, pending: 6, postponed: 3 },
      orders: [
        { id: 'WO-8847', date: '15.02.2024', time: '09:30', municipality: 'Novi Beograd', address: 'Bul. M. Pupina 165a, st. 42', type: 'Instalacija GPON', status: 'zavrsen', verified: true, tisId: '104857', userName: 'Marko Petrović' },
        { id: 'WO-8851', date: '15.02.2024', time: '11:00', municipality: 'Zemun', address: 'Glavna 28, st. 7', type: 'Instalacija HFC', status: 'zavrsen', verified: false, tisId: '104862', userName: 'Ana Nikolić' },
        { id: 'WO-8855', date: '15.02.2024', time: '14:15', municipality: 'Novi Beograd', address: 'Jurija Gagarina 12', type: 'Servis', status: 'nezavrsen', verified: false, tisId: '104870', userName: 'Petar Marković' },
        { id: 'WO-8860', date: '16.02.2024', time: '08:00', municipality: 'Zemun', address: 'Pregrevica 118', type: 'Instalacija GPON', status: 'zavrsen', verified: true, tisId: '104878', userName: 'Jelena Đorđević' },
        { id: 'WO-8863', date: '16.02.2024', time: '10:30', municipality: 'Novi Beograd', address: 'Bul. Arsenija Čarnojevića 54', type: 'Demontaža', status: 'odlozen', verified: false, tisId: '104883', userName: 'Milan Stojanović' },
        { id: 'WO-8869', date: '16.02.2024', time: '13:00', municipality: 'Surčin', address: 'Vojvođanska 15', type: 'Instalacija WiFi', status: 'zavrsen', verified: true, tisId: '104890', userName: 'Dragana Ilić' },
        { id: 'WO-8874', date: '17.02.2024', time: '09:00', municipality: 'Zemun', address: 'Nikolaja Gogolja 43', type: 'Servis', status: 'nezavrsen', verified: false, tisId: '104895', userName: 'Nemanja Pavlović' },
        { id: 'WO-8879', date: '17.02.2024', time: '11:30', municipality: 'Novi Beograd', address: 'Omladinskih brigada 90', type: 'Instalacija GPON', status: 'zavrsen', verified: false, tisId: '104901', userName: 'Ivana Tomić' },
      ]
    },
    t2: {
      name: 'Stefan Milić', phone: '+381 65 111 5566', initials: 'SM',
      stats: { total: 35, completed: 28, pending: 5, postponed: 2 },
      orders: [
        { id: 'WO-8848', date: '15.02.2024', time: '08:30', municipality: 'Voždovac', address: 'Vojislava Ilića 112', type: 'Instalacija HFC', status: 'zavrsen', verified: true, tisId: '104858', userName: 'Miloš Ristić' },
        { id: 'WO-8852', date: '15.02.2024', time: '12:00', municipality: 'Zvezdara', address: 'Bul. kralja Aleksandra 300', type: 'Servis', status: 'nezavrsen', verified: false, tisId: '104863', userName: 'Tamara Kostić' },
        { id: 'WO-8858', date: '16.02.2024', time: '09:00', municipality: 'Voždovac', address: 'Ustanička 189', type: 'Instalacija GPON', status: 'zavrsen', verified: true, tisId: '104875', userName: 'Lazar Popović' },
        { id: 'WO-8865', date: '16.02.2024', time: '14:00', municipality: 'Zvezdara', address: 'Dalmatinska 22', type: 'Instalacija WiFi', status: 'odlozen', verified: false, tisId: '104885', userName: 'Sonja Petrović' },
      ]
    },
    t3: {
      name: 'Marko Radović', phone: '+381 63 777 8899', initials: 'MR',
      stats: { total: 29, completed: 22, pending: 4, postponed: 3 },
      orders: [
        { id: 'WO-8849', date: '15.02.2024', time: '09:00', municipality: 'Čukarica', address: 'Požeška 83', type: 'Instalacija GPON', status: 'zavrsen', verified: true, tisId: '104859', userName: 'Vesna Savić' },
        { id: 'WO-8856', date: '15.02.2024', time: '13:30', municipality: 'Rakovica', address: 'Patrijarha Joanikija 20', type: 'Servis', status: 'nezavrsen', verified: false, tisId: '104871', userName: 'Goran Milošević' },
        { id: 'WO-8862', date: '16.02.2024', time: '08:30', municipality: 'Čukarica', address: 'Kneza Višeslava 14', type: 'Demontaža', status: 'otkazan', verified: false, tisId: '104882', userName: 'Maja Stanković' },
      ]
    },
    t4: {
      name: 'Aleksandar Đokić', phone: '+381 66 333 4455', initials: 'AĐ',
      stats: { total: 41, completed: 33, pending: 5, postponed: 3 },
      orders: []
    },
    t5: {
      name: 'Dejan Vasić', phone: '+381 64 999 1122', initials: 'DV',
      stats: { total: 22, completed: 18, pending: 2, postponed: 2 },
      orders: []
    }
  };

  const tech = techData[selectedTech];
  const filteredOrders = activeFilter
    ? tech.orders.filter(o => o.status === activeFilter)
    : tech.orders;

  const statusCfg = {
    zavrsen: { label: 'Završen', tone: 'ok' },
    nezavrsen: { label: 'Nezavršen', tone: 'warn' },
    odlozen: { label: 'Odložen', tone: 'info' },
    otkazan: { label: 'Otkazan', tone: 'bad' }
  };

  return (
    <Panel
      pad={false}
      className="mx-nd-wrap"
      title="Radni nalozi po tehničarima"
      sub={<>{Object.keys(techData).length} tehničara · {Object.values(techData).reduce((s, t) => s + t.stats.total, 0)} naloga</>}
      actions={(
        <>
          <Btn size="sm" icon={Plus}>Novi nalog</Btn>
          <Btn size="sm" icon={Download}>Export</Btn>
          <Btn size="sm" icon={RefreshCw} />
        </>
      )}
    >
      {/* Pretraga i filteri (samo izgled, kao ranije) */}
      <div className="mx-nd-twp__bar">
        <div className="sx-search">
          <Search size={16} strokeWidth={1.9} aria-hidden="true" className="sx-search__icon" />
          <input type="text" placeholder="Pretraga po adresi, korisniku, serijskom broju..." />
        </div>
        <Select size="sm">
          <option>Svi statusi</option>
          <option>Završeni</option>
          <option>Nezavršeni</option>
          <option>Odloženi</option>
        </Select>
        <Select size="sm">
          <option>Svi datumi</option>
          <option>Danas</option>
          <option>Juče</option>
          <option>Ove nedelje</option>
        </Select>
      </div>

      <div className="mx-nd-split">
        <div className="mx-nd-split__in">
          {/* Spisak tehničara */}
          <div className="mx-nd-split__side">
            <div className="mx-nd-techlist">
              {Object.entries(techData).map(([id, t]) => {
                const isActive = selectedTech === id;
                const rate = t.stats.total > 0 ? Math.round((t.stats.completed / t.stats.total) * 100) : 0;
                return (
                  <div
                    key={id}
                    tabIndex={0}
                    onClick={() => { setSelectedTech(id); setActiveFilter(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setSelectedTech(id); setActiveFilter(''); } }}
                    className={cx('mx-nd-tech', isActive && 'is-on')}
                  >
                    <div className="mx-nd-who">
                      <span className={cx('sx-avatar', isActive && 'mx-nd-ink')}>{t.initials}</span>
                      <div className="mx-nd-who__text">
                        <b>{t.name}</b>
                        <span>{t.phone}</span>
                      </div>
                    </div>

                    <div className="mx-nd-tstats">
                      <span className="mx-nd-tstat" onClick={(e) => { e.stopPropagation(); setSelectedTech(id); setActiveFilter(''); }}>
                        <b>{t.stats.total}</b><small>Sve</small>
                      </span>
                      <span className="mx-nd-tstat is-ok" onClick={(e) => { e.stopPropagation(); setSelectedTech(id); setActiveFilter('zavrsen'); }}>
                        <b>{t.stats.completed}</b><small>OK</small>
                      </span>
                      <span className="mx-nd-tstat is-warn" onClick={(e) => { e.stopPropagation(); setSelectedTech(id); setActiveFilter('nezavrsen'); }}>
                        <b>{t.stats.pending}</b><small>Akt</small>
                      </span>
                      <span className="mx-nd-tstat is-info" onClick={(e) => { e.stopPropagation(); setSelectedTech(id); setActiveFilter('odlozen'); }}>
                        <b>{t.stats.postponed}</b><small>Odl</small>
                      </span>
                    </div>

                    <div className="mx-nd-rate">
                      <span className="mx-nd-meter__track">
                        <span className="mx-nd-meter__fill is-ok" style={{ width: `${rate}%` }} />
                      </span>
                      <span className="sx-mono">{rate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nalozi izabranog tehničara */}
          <div className="mx-nd-split__main">
            <div className="mx-nd-twp__head">
              <div className="mx-nd-who">
                <span className="sx-avatar mx-nd-ink">{tech.initials}</span>
                <div className="mx-nd-who__text">
                  <h3>{tech.name}</h3>
                  <span>{tech.phone}</span>
                </div>
              </div>
              <div className="mx-nd-twp__count">
                <span>{filteredOrders.length} od {tech.orders.length} naloga</span>
                <Btn size="sm" variant="ghost" icon={Download} />
              </div>
            </div>

            <div className="mx-nd-twp__chips">
              <Choice
                size="sm"
                value={activeFilter}
                onChange={setActiveFilter}
                layoutId="mx-nd-twp-filter"
                options={[
                  { value: '', label: 'Svi', count: tech.stats.total },
                  { value: 'zavrsen', label: 'Završeni', count: tech.stats.completed },
                  { value: 'nezavrsen', label: 'Nezavršeni', count: tech.stats.pending },
                  { value: 'odlozen', label: 'Odloženi', count: tech.stats.postponed }
                ]}
              />
            </div>

            {filteredOrders.length > 0 ? (
              <div className="sx-tablewrap">
                <table className="sx-table">
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Vreme</th>
                      <th>Opština</th>
                      <th>Adresa</th>
                      <th>Korisnik</th>
                      <th>Tip</th>
                      <th>Status</th>
                      <th className="is-end"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order, idx) => {
                      const st = statusCfg[order.status];
                      return (
                        <tr key={order.id} className="is-click" style={{ '--i': idx }}>
                          <td className="is-head"><b className="mx-strong">{order.date}</b></td>
                          <td data-label="Vreme"><span className="sx-mono">{order.time}</span></td>
                          <td data-label="Opština">{order.municipality}</td>
                          <td data-label="Adresa" className="is-wide">
                            <div className="sx-cell mx-nd-addr">
                              <b>{order.address}</b>
                              <span className="sx-mono">TIS {order.tisId}</span>
                            </div>
                          </td>
                          <td data-label="Korisnik">{order.userName}</td>
                          <td data-label="Tip">{order.type}</td>
                          <td data-label="Status">
                            <span className="mx-nd-st">
                              <Sign tone={st.tone}>{st.label}</Sign>
                              {order.verified && (
                                <CheckCircle2 size={14} strokeWidth={1.9} className="mx-nd-verified" aria-hidden="true" />
                              )}
                            </span>
                          </td>
                          <td className="is-actions is-end">
                            <div className="sx-rowacts">
                              <Btn size="sm" variant="ghost" icon={Eye} />
                              <Btn size="sm" variant="ghost" icon={Trash2} className="mx-danger" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="sx-empty-block">
                <b>Nema radnih naloga</b>
                <span>Izaberite drugog tehničara ili promenite filter</span>
              </div>
            )}

            {/* Podnožje: strane */}
            {filteredOrders.length > 0 && (
              <div className="mx-pager">
                <span className="mx-pager__text">
                  Stranica 1 od 1 · {filteredOrders.length} naloga
                </span>
                <span className="mx-pager__btns">
                  <Btn size="sm" variant="ghost">‹</Btn>
                  <Btn size="sm" variant="primary" className="mx-pager__num">1</Btn>
                  <Btn size="sm" variant="ghost">›</Btn>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
};

// Pregled dizajna: detalji radnog naloga (statički podaci)
const WorkOrderDetailPreview = () => {
  return (
    <Panel
      pad={false}
      className="mx-nd-wrap"
      title="WO-2024-08847"
      sub={(
        <span className="mx-inline">
          <State tone="ok">Završen</State>
          <span className="sx-mono">15.02.2024 · 09:30</span>
        </span>
      )}
      actions={(
        <>
          <Btn size="sm" icon={Download}>PDF</Btn>
          <Btn size="sm" icon={Check}>Verifikuj</Btn>
          <Btn size="sm" icon={CircleAlert}>Vrati</Btn>
        </>
      )}
    >
      <div className="mx-nd-wod__in">
        {/* Osnovni podaci */}
        <div className="mx-nd-facts">
          <div className="mx-nd-fact">
            <span className="mx-nd-fact__k"><Calendar size={13} strokeWidth={1.9} aria-hidden="true" /><span className="sx-label">Datum / Tip</span></span>
            <b>15. februar 2024</b>
            <span>Instalacija GPON · 09:30</span>
          </div>
          <div className="mx-nd-fact">
            <span className="mx-nd-fact__k"><MapPin size={13} strokeWidth={1.9} aria-hidden="true" /><span className="sx-label">Lokacija</span></span>
            <b>Novi Beograd</b>
            <span>Bul. Mihajla Pupina 165a, st. 42</span>
          </div>
          <div className="mx-nd-fact">
            <span className="mx-nd-fact__k"><User size={13} strokeWidth={1.9} aria-hidden="true" /><span className="sx-label">Tehničar</span></span>
            <b>Nikola Jovanović</b>
            <span>+ Stefan Milić <span className="sx-faint">(pomoćni)</span></span>
          </div>
          <div className="mx-nd-fact">
            <span className="mx-nd-fact__k"><Phone size={13} strokeWidth={1.9} aria-hidden="true" /><span className="sx-label">Korisnik</span></span>
            <b>Marko Petrović</b>
            <span>+381 64 123 4567</span>
          </div>
        </div>

        {/* Oznake */}
        <div className="mx-nd-ids">
          <span className="mx-nd-id"><span className="sx-label">TIS</span><span className="sx-tag sx-mono">104857</span></span>
          <span className="mx-nd-id"><span className="sx-label">Job</span><span className="sx-tag sx-mono">JOB-29481</span></span>
          <span className="mx-nd-id"><span className="sx-label">Tehnologija</span><span className="sx-mono">GPON</span></span>
          <span className="mx-nd-id"><span className="sx-label">Email</span><span>marko.petrovic@gmail.com</span></span>
        </div>

        <div className="mx-nd-wod__main">
          {/* Levo: posao, oprema, materijali, slike */}
          <div className="mx-nd-wod__left">
            <div className="mx-nd-wsec">
              <div className="mx-nd-two">
                <div className="mx-nd-blk">
                  <p className="sx-label mx-nd-sl"><MessageSquare size={13} strokeWidth={1.9} aria-hidden="true" />Detalji posla</p>
                  <p className="mx-nd-text">
                    Instalacija GPON opreme kod novog korisnika. Potrebno izvesti kabel od PM kutije na 3. spratu do stana 42 na 5. spratu. Korisnik obavestio da postoji kanal za kablove.
                  </p>
                </div>
                <div className="mx-nd-blk">
                  <p className="sx-label">Komentar tehničara</p>
                  <p className="mx-nd-quote">
                    Instalacija završena uspešno. Kabel provučen kroz postojeći kanal. Signal -18dBm, u granicama normale. Korisnik zadovoljan.
                  </p>
                </div>
              </div>
            </div>

            <div className="mx-nd-wsec is-flush">
              <div className="mx-nd-wsec__head">
                <p className="sx-label mx-nd-sl"><Box size={13} strokeWidth={1.9} aria-hidden="true" />Oprema korisnika</p>
                <span className="sx-tag is-ink">3</span>
              </div>
              <div className="sx-tablewrap">
                <table className="sx-table">
                  <thead>
                    <tr>
                      <th>Tip</th>
                      <th>Opis</th>
                      <th>Serijski br.</th>
                      <th className="is-num">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { type: 'ONT', desc: 'Huawei HG8245H5', serial: 'HWT-48573920145', date: '15.02.24' },
                      { type: 'STB', desc: 'Motorola VIP1003', serial: 'MOT-93847561022', date: '15.02.24' },
                      { type: 'RTR', desc: 'TP-Link Archer C6', serial: 'TPL-28374650198', date: '15.02.24' },
                    ].map((eq, i) => (
                      <tr key={i} style={{ '--i': i }}>
                        <td data-label="Tip"><span className="sx-tag is-ink">{eq.type}</span></td>
                        <td data-label="Opis"><b className="mx-strong">{eq.desc}</b></td>
                        <td data-label="Serijski br."><span className="sx-mono">{eq.serial}</span></td>
                        <td data-label="Datum" className="is-num"><span className="sx-faint">{eq.date}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mx-nd-two is-split">
              <div className="mx-nd-wsec">
                <p className="sx-label mx-nd-sl"><Wrench size={13} strokeWidth={1.9} aria-hidden="true" />Utrošeni materijali</p>
                <div className="mx-nd-mats">
                  {[
                    { name: 'Opt. patch cord SC/APC 3m', qty: '1' },
                    { name: 'UTP Cat6 kabl', qty: '15m' },
                    { name: 'RJ45 konektor', qty: '4' },
                    { name: 'Kanalica 40x25mm', qty: '3m' },
                    { name: 'Tiplovi i šrafovi', qty: '8' },
                  ].map((mat, i) => (
                    <div key={i} className="mx-nd-mat">
                      <span>{mat.name}</span>
                      <span className="sx-tag is-info sx-mono">×{mat.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mx-nd-wsec">
                <p className="sx-label mx-nd-sl">
                  <ImageIcon size={13} strokeWidth={1.9} aria-hidden="true" />
                  Slike
                  <span className="sx-tag">4</span>
                </p>
                <div className="mx-nd-pics">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="mx-nd-pic">
                      <ImageIcon size={16} strokeWidth={1.8} aria-hidden="true" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Desno: pregled, dodatni poslovi, istorija, status korisnika */}
          <div className="mx-nd-wod__right">
            <div className="mx-nd-wsec">
              <p className="sx-label">Pregled</p>
              <div className="mx-nd-mini is-4">
                {[
                  { label: 'Oprema', value: '3' },
                  { label: 'Materijali', value: '5' },
                  { label: 'Slike', value: '4' },
                  { label: 'Trajanje', value: '~2h' },
                ].map((s, i) => (
                  <Stat key={i} label={s.label} value={s.value} />
                ))}
              </div>
            </div>

            <div className="mx-nd-wsec">
              <p className="sx-label">Dodatni poslovi</p>
              <p className="mx-nd-text">Montaža nosača, testiranje signala</p>
            </div>

            <div className="mx-nd-wsec">
              <p className="sx-label mx-nd-sl"><Clock size={13} strokeWidth={1.9} aria-hidden="true" />Istorija odlaganja</p>
              <div className="sx-note" data-tone="warn">
                <Led tone="warn" />
                <div className="sx-note__body mx-nd-hist">
                  <div className="mx-nd-hist__top">
                    <span className="sx-mono">14.02.2024 · 08:15</span>
                    <span className="sx-tag is-warn">Odlaganje #1</span>
                  </div>
                  <p>Korisnik nije bio dostupan, zakazano za sutradan.</p>
                  <div className="mx-nd-hist__move sx-mono">
                    <span>14.02</span>
                    <span>→</span>
                    <span>15.02.2024</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-nd-wsec">
              <p className="sx-label mx-nd-sl"><CircleAlert size={13} strokeWidth={1.9} aria-hidden="true" />Istorija otkazivanja</p>
              <div className="sx-note" data-tone="bad">
                <Led tone="bad" />
                <div className="sx-note__body mx-nd-hist">
                  <div className="mx-nd-hist__top">
                    <span className="sx-mono">13.02.2024 · 14:20</span>
                    <span className="sx-tag is-bad">Otkazivanje #1</span>
                  </div>
                  <p>Korisnik otkazao prvi termin zbog putovanja.</p>
                </div>
              </div>
            </div>

            <div className="mx-nd-wsec">
              <p className="sx-label mx-nd-sl"><CheckCircle2 size={13} strokeWidth={1.9} aria-hidden="true" />Status korisnika</p>
              <div className="sx-note" data-tone="ok">
                <Led tone="ok" />
                <div className="sx-note__body">
                  <p>
                    Priključenje korisnika na GPON mrežu u zgradi (izrada kompletne instalacije od PM do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
};

// Work Orders Section Component - Complete Recreation of WorkOrdersByTechnician
const WorkOrdersSection = () => {
  const [searchParams] = useSearchParams();
  const [technicians, setTechnicians] = useState([]);

  // Optimized state management with priority-based loading
  const [recentWorkOrders, setRecentWorkOrders] = useState([]);
  const [olderWorkOrders, setOlderWorkOrders] = useState([]);
  const [recentUnassigned, setRecentUnassigned] = useState([]);
  const [olderUnassigned, setOlderUnassigned] = useState([]);
  const [verificationOrders, setVerificationOrders] = useState([]);

  // Loading states
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [olderLoading, setOlderLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationDataLoaded, setVerificationDataLoaded] = useState(false);

  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [technicianFilter, setTechnicianFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [timeSortOrder, setTimeSortOrder] = useState('asc');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'technicians');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [customerStatusModal, setCustomerStatusModal] = useState({ isOpen: false, orderId: null });
  const [orderStatuses, setOrderStatuses] = useState({});
  const [tableSortConfig, setTableSortConfig] = useState({ key: 'date', direction: 'desc' });

  // AI Verification states
  const [loadingAIVerification, setLoadingAIVerification] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiVerificationResult, setAIVerificationResult] = useState(null);
  // Vraćanje posle AI preporuke ide kroz istu potvrdu sa umanjenjem zarade kao ručno vraćanje
  const [aiReturnModal, setAiReturnModal] = useState({ isOpen: false, orderId: null, comment: '' });

  // Fancy table states
  const [fancyTableData, setFancyTableData] = useState([]);
  const [fancyTablePagination, setFancyTablePagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [fancyTableLoading, setFancyTableLoading] = useState(false);
  const [fancyTableFilters, setFancyTableFilters] = useState({
    status: '',
    technician: '',
    municipality: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    verified: ''
  });
  const [fancyTableSearch, setFancyTableSearch] = useState('');
  const [fancyTableRefreshing, setFancyTableRefreshing] = useState(false);

  // Pagination
  const [currentPageUnassigned, setCurrentPageUnassigned] = useState(1);
  const [currentPageVerification, setCurrentPageVerification] = useState(1);
  const [currentPageAllOrders, setCurrentPageAllOrders] = useState(1);
  const [technicianCurrentPages, setTechnicianCurrentPages] = useState({});
  const itemsPerPage = 20;

  useEffect(() => {
    fetchDashboardAndTechnicians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    const search = searchParams.get('search');

    if (tab) {
      setActiveTab(tab);
      if (tab === 'verification' && !verificationDataLoaded) {
        fetchVerificationOrders();
      }
    }

    if (search) {
      setSearchTerm(search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, verificationDataLoaded]);

  // Handle tab changes
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);

    if (tabName === 'verification' && !verificationDataLoaded) {
      fetchVerificationOrders();
    }

    if (tabName === 'pregled') {
      fetchFancyTableData();
    }
  };

  // Fetch fancy table data
  const fetchFancyTableData = async (page) => {
    setFancyTableLoading(true);
    try {
      const currentPage = page || fancyTablePagination?.currentPage || 1;
      const currentLimit = fancyTablePagination?.limit || 20;

      const params = {
        page: currentPage.toString(),
        limit: currentLimit.toString(),
        search: fancyTableSearch,
        status: fancyTableFilters.status,
        municipality: fancyTableFilters.municipality,
        technician: fancyTableFilters.technician
      };

      const response = await workOrdersAPI.getAll(params);
      const workOrders = response.data.workOrders || response.data || [];
      const pagination = response.data.pagination;

      setFancyTableData(Array.isArray(workOrders) ? workOrders : []);

      if (pagination) {
        setFancyTablePagination(pagination);
      } else {
        setFancyTablePagination({
          currentPage: currentPage,
          totalPages: 1,
          totalCount: Array.isArray(workOrders) ? workOrders.length : 0,
          limit: currentLimit,
          hasNextPage: false,
          hasPreviousPage: false
        });
      }
    } catch (error) {
      console.error('Greška pri učitavanju radnih naloga:', error);
      toast.error('Greška pri učitavanju podataka!');
    } finally {
      setFancyTableLoading(false);
    }
  };

  const handleFancyTablePageChange = (newPage) => {
    setFancyTablePagination(prev => ({ ...prev, currentPage: newPage }));
  };

  const handleFancyTableFilterChange = (newFilters) => {
    setFancyTableFilters(newFilters);
    setFancyTablePagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleFancyTableSearchChange = (value) => {
    setFancyTableSearch(value);
    setFancyTablePagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleFancyTableRefresh = async () => {
    setFancyTableRefreshing(true);
    await fetchFancyTableData(fancyTablePagination?.currentPage || 1);
    setFancyTableRefreshing(false);
    toast.success('Podaci su osveženi!');
  };

  useEffect(() => {
    if (activeTab === 'pregled') {
      fetchFancyTableData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fancyTablePagination?.currentPage, fancyTableSearch, fancyTableFilters]);

  // Priority 1: Load dashboard and technicians
  const fetchDashboardAndTechnicians = async () => {
    setDashboardLoading(true);
    setError('');

    try {
      const techniciansResponse = await techniciansAPI.getAll();
      const techniciansData = techniciansResponse.data;

      setTechnicians(techniciansData);

    } catch (error) {
      console.error('Greška pri učitavanju dashboard podataka:', error);
      setError('Greška pri učitavanju osnovnih podataka. Pokušajte ponovo.');
      toast.error('Neuspešno učitavanje osnovnih podataka!');
    } finally {
      setDashboardLoading(false);
    }
  };

  // Priority 2: Load recent work orders (last 3 days)
  const fetchRecentWorkOrders = async () => {
    setRecentLoading(true);

    try {
      const [workOrdersResponse, unassignedResponse] = await Promise.all([
        workOrdersAPI.getAll({ recent: 3 }),
        workOrdersAPI.getUnassigned()
      ]);

      const workOrdersData = Array.isArray(workOrdersResponse.data) ? workOrdersResponse.data : (workOrdersResponse.data.workOrders || []);
      const unassignedData = unassignedResponse.data;

      // Filter unassigned by recent (server already filtered work orders)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const recentUnassignedData = unassignedData.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate >= threeDaysAgo;
      });

      setRecentWorkOrders(workOrdersData);
      setRecentUnassigned(recentUnassignedData);

      setTimeout(() => {
        fetchOlderWorkOrders();
      }, 500);

    } catch (error) {
      console.error('Greška pri učitavanju najnovijih radnih naloga:', error);
    } finally {
      setRecentLoading(false);
    }
  };

  // Priority 3: Load older work orders (older than 3 days)
  const fetchOlderWorkOrders = async () => {
    setOlderLoading(true);

    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const [workOrdersResponse, unassignedResponse] = await Promise.all([
        workOrdersAPI.getAll({ olderThan: 3 }),
        workOrdersAPI.getUnassigned()
      ]);

      const workOrdersData = Array.isArray(workOrdersResponse.data) ? workOrdersResponse.data : (workOrdersResponse.data.workOrders || []);
      const unassignedData = unassignedResponse.data;

      const olderUnassignedData = unassignedData.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate < threeDaysAgo;
      });

      setOlderWorkOrders(workOrdersData);
      setOlderUnassigned(olderUnassignedData);

    } catch (error) {
      console.error('Greška pri učitavanju starijih radnih naloga:', error);
    } finally {
      setOlderLoading(false);
    }
  };

  // Lazy loading for verification tab
  const fetchVerificationOrders = async () => {
    if (verificationDataLoaded) return;

    setVerificationLoading(true);

    try {
      const verificationResponse = await workOrdersAPI.getVerification();
      const verificationData = verificationResponse.data;

      setVerificationOrders(verificationData);
      setVerificationDataLoaded(true);

    } catch (error) {
      console.error('Greška pri učitavanju naloga za verifikaciju:', error);
      toast.error('Neuspešno učitavanje naloga za verifikaciju!');
    } finally {
      setVerificationLoading(false);
    }
  };

  // Refresh all data
  const fetchData = async () => {
    await fetchDashboardAndTechnicians();

    if (activeTab === 'verification') {
      setVerificationDataLoaded(false);
      await fetchVerificationOrders();
    }

    if (activeTab === 'pregled') {
      await fetchFancyTableData();
    }
  };

  const loadCustomerStatus = async (orderId) => {
    try {
      const response = await workOrdersAPI.getEvidence(orderId);
      const status = response.data.customerStatus || 'Priključenje korisnika na HFC KDS mreža u zgradi sa instalacijom CPE opreme (izrada kompletne instalacije od RO do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala';
      setOrderStatuses(prev => ({
        ...prev,
        [orderId]: status
      }));
      return status;
    } catch (error) {
      console.error(`Failed to load status for order ${orderId}:`, error);
      const status = 'Priključenje korisnika na HFC KDS mreža u zgradi sa instalacijom CPE opreme (izrada kompletne instalacije od RO do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala';
      setOrderStatuses(prev => ({
        ...prev,
        [orderId]: status
      }));
      return status;
    }
  };

  const handleVerifyOrder = async (orderId) => {
    try {
      let currentStatus = orderStatuses[orderId];
      if (!currentStatus) {
        currentStatus = await loadCustomerStatus(orderId);
      }

      if (!currentStatus || currentStatus === 'Nov korisnik') {
        toast.error('Potrebno je prvo postaviti status korisnika pre verifikacije!');
        return;
      }

      await workOrdersAPI.verify(orderId, {});
      toast.success('Radni nalog je uspešno verifikovan!');

      setVerificationOrders(prev => prev.filter(order => order._id !== orderId));

      const updateOrderInArray = (ordersArray, setOrdersFunc) => {
        const updatedOrders = [...ordersArray];
        const updatedIndex = updatedOrders.findIndex(order => order._id === orderId);

        if (updatedIndex !== -1) {
          updatedOrders[updatedIndex] = {
            ...updatedOrders[updatedIndex],
            verified: true,
            verifiedAt: new Date().toISOString()
          };
          setOrdersFunc(updatedOrders);
          return true;
        }
        return false;
      };

      if (!updateOrderInArray(recentWorkOrders, setRecentWorkOrders)) {
        updateOrderInArray(olderWorkOrders, setOlderWorkOrders);
      }

    } catch (error) {
      console.error('Greška pri verifikaciji:', error);
      toast.error('Neuspešna verifikacija radnog naloga!');
    }
  };

  const handleDelete = async (id) => {
    if (await confirm({ title: 'Da li ste sigurni da želite da obrišete ovaj radni nalog?', tone: 'danger', confirmLabel: 'Obriši' })) {
      try {
        await workOrdersAPI.delete(id);
        toast.success('Radni nalog je uspešno obrisan!');

        setRecentWorkOrders(prev => prev.filter(order => order._id !== id));
        setOlderWorkOrders(prev => prev.filter(order => order._id !== id));
        setRecentUnassigned(prev => prev.filter(order => order._id !== id));
        setOlderUnassigned(prev => prev.filter(order => order._id !== id));
        setVerificationOrders(prev => prev.filter(order => order._id !== id));

      } catch (error) {
        console.error('Greška pri brisanju:', error);
        toast.error('Neuspešno brisanje radnog naloga!');
      }
    }
  };

  const getAllWorkOrders = () => {
    return [...recentWorkOrders, ...olderWorkOrders];
  };

  const getAllUnassignedOrders = () => {
    return [...recentUnassigned, ...olderUnassigned];
  };

  const groupWorkOrdersByTechnician = () => {
    const techWorkOrders = {};

    technicians.filter(tech => !tech.deletedAt).forEach(tech => {
      techWorkOrders[tech._id] = {
        technicianInfo: tech,
        workOrders: []
      };
    });

    const allWorkOrders = getAllWorkOrders();

    allWorkOrders.forEach(order => {
      const techId = order.technicianId?._id || order.technicianId;
      const tech2Id = order.technician2Id?._id || order.technician2Id;
      if (techId && techWorkOrders[techId]) {
        techWorkOrders[techId].workOrders.push(order);
      }
      if (tech2Id && techWorkOrders[tech2Id]) {
        techWorkOrders[tech2Id].workOrders.push(order);
      }
    });

    return techWorkOrders;
  };

  const technicianWorkOrders = groupWorkOrdersByTechnician();

  // Enhanced filtering function
  const filterOrders = (orders) => {
    return orders.filter(order => {
      const matchesStatus = !statusFilter || order.status === statusFilter;
      const matchesTechnician = !technicianFilter ||
        order.technicianId?._id === technicianFilter ||
        order.technicianId === technicianFilter ||
        order.technician2Id?._id === technicianFilter ||
        order.technician2Id === technicianFilter;

      let matchesDate = true;
      if (dateFilter) {
        const orderDate = new Date(order.date);
        const filterDate = new Date(dateFilter);
        matchesDate = orderDate.toDateString() === filterDate.toDateString();
      }

      let matchesSearch = true;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        matchesSearch =
          order.municipality?.toLowerCase().includes(searchLower) ||
          order.address?.toLowerCase().includes(searchLower) ||
          order.tisId?.toString().includes(searchTerm) ||
          order.tisJobId?.toString().includes(searchTerm) ||
          order.type?.toLowerCase().includes(searchLower) ||
          order.userName?.toLowerCase().includes(searchLower) ||
          order.description?.toLowerCase().includes(searchLower) ||
          order.notes?.toLowerCase().includes(searchLower) ||
          order.technicianId?.name?.toLowerCase().includes(searchLower) ||
          order.technician2Id?.name?.toLowerCase().includes(searchLower) ||
          order.equipment?.some(eq =>
            eq.serialNumber?.toLowerCase().includes(searchLower) ||
            eq.serialNumber?.slice(-4).includes(searchTerm)
          ) ||
          order.materials?.some(mat =>
            mat.name?.toLowerCase().includes(searchLower)
          );
      }

      return matchesStatus && matchesTechnician && matchesDate && matchesSearch;
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredUnassigned = useMemo(() => filterOrders(getAllUnassignedOrders()), [recentUnassigned, olderUnassigned, statusFilter, technicianFilter, dateFilter, searchTerm]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredVerification = useMemo(() => filterOrders(verificationOrders), [verificationOrders, statusFilter, technicianFilter, dateFilter, searchTerm]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredAllOrders = useMemo(() => {
    const filtered = filterOrders(getAllWorkOrders());
    if (dateFilter) {
      return [...filtered].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);

        const [hoursA, minutesA] = (a.time || '00:00').split(':').map(Number);
        const [hoursB, minutesB] = (b.time || '00:00').split(':').map(Number);

        dateA.setHours(hoursA, minutesA, 0, 0);
        dateB.setHours(hoursB, minutesB, 0, 0);

        const timeA = dateA.getTime();
        const timeB = dateB.getTime();

        return timeSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      });
    }
    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentWorkOrders, olderWorkOrders, statusFilter, technicianFilter, dateFilter, timeSortOrder, searchTerm]);

  // Pagination for unassigned
  const indexOfLastUnassigned = currentPageUnassigned * itemsPerPage;
  const indexOfFirstUnassigned = indexOfLastUnassigned - itemsPerPage;
  const currentUnassignedItems = filteredUnassigned.slice(indexOfFirstUnassigned, indexOfLastUnassigned);
  const totalPagesUnassigned = Math.ceil(filteredUnassigned.length / itemsPerPage);

  // Pagination for verification
  const indexOfLastVerification = currentPageVerification * itemsPerPage;
  const indexOfFirstVerification = indexOfLastVerification - itemsPerPage;
  const currentVerificationItems = filteredVerification.slice(indexOfFirstVerification, indexOfLastVerification);
  const totalPagesVerification = Math.ceil(filteredVerification.length / itemsPerPage);

  // Pagination for all orders
  const indexOfLastAllOrders = currentPageAllOrders * itemsPerPage;
  const indexOfFirstAllOrders = indexOfLastAllOrders - itemsPerPage;
  const currentAllOrdersItems = filteredAllOrders.slice(indexOfFirstAllOrders, indexOfLastAllOrders);
  const totalPagesAllOrders = Math.ceil(filteredAllOrders.length / itemsPerPage);

  // Pagination functions
  const paginateUnassigned = (pageNumber) => setCurrentPageUnassigned(pageNumber);
  const paginateVerification = (pageNumber) => setCurrentPageVerification(pageNumber);
  const paginateAllOrders = (pageNumber) => setCurrentPageAllOrders(pageNumber);
  const paginateTechnician = (techId, pageNumber, event) => {
    if (event) {
      event.stopPropagation();
    }
    setTechnicianCurrentPages(prev => ({
      ...prev,
      [techId]: pageNumber
    }));
  };

  const sortByDate = (orders) => {
    return [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const sortTableData = (orders, sortConfig) => {
    if (!sortConfig.key) return orders;

    return [...orders].sort((a, b) => {
      let aVal, bVal;

      switch(sortConfig.key) {
        case 'date':
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
          break;
        case 'municipality':
          aVal = (a.municipality || '').toLowerCase();
          bVal = (b.municipality || '').toLowerCase();
          break;
        case 'address':
          aVal = (a.address || '').toLowerCase();
          bVal = (b.address || '').toLowerCase();
          break;
        case 'type':
          aVal = (a.type || '').toLowerCase();
          bVal = (b.type || '').toLowerCase();
          break;
        case 'status':
          aVal = (a.status || '').toLowerCase();
          bVal = (b.status || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key) => {
    setTableSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS');
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'zavrsen': return 'Završen';
      case 'nezavrsen': return 'Nezavršen';
      case 'odlozen': return 'Odložen';
      case 'otkazan': return 'Otkazan';
      default: return status;
    }
  };

  const getTechnicianName = (order) => {
    if (order.technicianId?.name) return order.technicianId.name;
    if (order.technicianId) {
      const tech = technicians.find(t => t._id === order.technicianId);
      return tech?.name || 'Nepoznat';
    }
    return 'Nedodeljen';
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTechnicianFilter('');
    setDateFilter('');
    setTimeSortOrder('asc');
    setCurrentPageUnassigned(1);
    setCurrentPageVerification(1);
    setCurrentPageAllOrders(1);
    setTechnicianCurrentPages({});
  };

  const openCustomerStatusModal = async (orderId) => {
    if (!orderStatuses[orderId]) {
      await loadCustomerStatus(orderId);
    }
    document.body.style.overflow = 'hidden';
    setCustomerStatusModal({ isOpen: true, orderId });
  };

  const closeCustomerStatusModal = () => {
    document.body.style.overflow = '';
    setCustomerStatusModal({ isOpen: false, orderId: null });
  };

  const handleCustomerStatusChange = async (orderId, newStatus) => {
    try {
      await workOrdersAPI.updateCustomerStatus(orderId, {
        customerStatus: newStatus
      });

      setOrderStatuses(prev => ({
        ...prev,
        [orderId]: newStatus
      }));

      toast.success('Status korisnika je uspešno ažuriran!');
      closeCustomerStatusModal();
    } catch (error) {
      console.error('Error updating customer status:', error);
      toast.error('Greška pri ažuriranju statusa korisnika!');
    }
  };

  const getCustomerStatusColor = (status) => {
    if (status?.includes('HFC KDS')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (status?.includes('GPON tehnologijom')) return 'bg-teal-50 text-teal-700 border-teal-200';
    if (status?.includes('GPON')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status?.includes('montažnim radovima')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (status?.includes('bez montažnih radova')) return 'bg-violet-50 text-violet-700 border-violet-200';
    if (status?.includes('WiFi')) return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    if (status?.includes('Dodavanje')) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (status?.includes('Demontaža')) return 'bg-red-50 text-red-700 border-red-200';
    if (status?.includes('Intervencija')) return 'bg-pink-50 text-pink-700 border-pink-200';
    if (status?.includes('ASTRA')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  // AI Verification handler
  const handleAIVerify = async (orderId) => {
    setLoadingAIVerification(orderId);
    setAIVerificationResult(null);
    setShowAIModal(true);

    try {
      const result = await workOrdersAPI.aiVerify(orderId);

      setAIVerificationResult({
        orderId,
        verified: result.data.verified,
        customerStatus: result.data.customerStatus,
        reason: result.data.reason,
        checkedItems: result.data.checkedItems,
        confidence: result.data.confidence
      });

    } catch (error) {
      console.error('Error during AI analysis:', error);
      setShowAIModal(false);
      toast.error(error.response?.data?.error || 'Greška pri AI analizi');
    } finally {
      setLoadingAIVerification(null);
    }
  };

  // Accept AI recommendation
  const handleAcceptAI = async () => {
    if (!aiVerificationResult) return;

    try {
      const orderId = aiVerificationResult.orderId;

      await workOrdersAPI.updateCustomerStatus(orderId, {
        customerStatus: aiVerificationResult.customerStatus
      });

      await workOrdersAPI.verify(orderId, {});

      toast.success('Radni nalog je uspešno verifikovan!');

      setVerificationOrders(prev => prev.filter(order => order._id !== orderId));

      const updateOrderInArray = (ordersArray, setOrdersFunc) => {
        const updatedOrders = [...ordersArray];
        const updatedIndex = updatedOrders.findIndex(order => order._id === orderId);

        if (updatedIndex !== -1) {
          updatedOrders[updatedIndex] = {
            ...updatedOrders[updatedIndex],
            verified: true,
            verifiedAt: new Date().toISOString()
          };
          setOrdersFunc(updatedOrders);
          return true;
        }
        return false;
      };

      if (!updateOrderInArray(recentWorkOrders, setRecentWorkOrders)) {
        updateOrderInArray(olderWorkOrders, setOlderWorkOrders);
      }

      setShowAIModal(false);
      setAIVerificationResult(null);

    } catch (error) {
      console.error('Error accepting AI recommendation:', error);
      toast.error('Greška pri verifikaciji radnog naloga');
    }
  };

  // Reject AI recommendation
  const handleRejectAI = () => {
    if (!aiVerificationResult) return;

    setAiReturnModal({
      isOpen: true,
      orderId: aiVerificationResult.orderId,
      comment: `AI VERIFIKACIJA:\n\n${aiVerificationResult.reason}`
    });
    setShowAIModal(false);
    setAIVerificationResult(null);
  };

  // Posle potvrde vraćanja: skloni nalog iz liste za verifikaciju i ažuriraj status u listama
  const handleAIReturned = () => {
    const orderId = aiReturnModal.orderId;
    setAiReturnModal({ isOpen: false, orderId: null, comment: '' });

    setVerificationOrders(prev => prev.filter(order => order._id !== orderId));

    const updateOrderInArray = (ordersArray, setOrdersFunc) => {
      const updatedOrders = [...ordersArray];
      const updatedIndex = updatedOrders.findIndex(order => order._id === orderId);

      if (updatedIndex !== -1) {
        updatedOrders[updatedIndex] = {
          ...updatedOrders[updatedIndex],
          status: 'nezavrsen',
          verified: false
        };
        setOrdersFunc(updatedOrders);
        return true;
      }
      return false;
    };

    if (!updateOrderInArray(recentWorkOrders, setRecentWorkOrders)) {
      updateOrderInArray(olderWorkOrders, setOlderWorkOrders);
    }
  };

  const navigateToOrderDetails = (orderId, event) => {
    if (event.target.closest('.delete-btn') || event.target.closest('.verify-btn')) {
      return;
    }
    window.open(`/work-orders/${orderId}`, '_blank');
  };

  const handleStatClick = (techId, status, event) => {
    event.stopPropagation();
    setStatusFilter(status);
    if (selectedTechnicianId !== techId) {
      setSelectedTechnicianId(techId);
    }
    setTechnicianCurrentPages(prev => ({
      ...prev,
      [techId]: 1
    }));
  };

  return (
    <section className="mx-nd-sec mx-nd-wos">
      {/* Zaglavlje odeljka */}
      <header className="sx-head">
        <div className="sx-head__text">
          <h2 className="sx-title mx-nd-wos__title">Work Orders by Technician</h2>
          <div className="sx-head__lead"><p>Manage and track all work orders by technicians</p></div>
        </div>
        <div className="sx-head__actions">
          <LinkBtn to="/work-orders/add" variant="primary" icon={Plus}>Novi nalog</LinkBtn>
          <LinkBtn to="/work-orders/upload" icon={Upload}>Import</LinkBtn>
        </div>
      </header>

      {error && <Note tone="bad">{error}</Note>}

      {/* Tabovi */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        layoutId="mx-nd-wos-tabs"
        items={[
          { key: 'technicians', label: 'Tehničari', icon: User, count: Object.keys(technicianWorkOrders).length },
          { key: 'unassigned', label: 'Nedodeljeni', icon: UserX, count: getAllUnassignedOrders().length },
          { key: 'verification', label: 'Za verifikaciju', icon: CheckCircle2, count: verificationOrders.length },
          { key: 'all', label: 'Svi radni nalozi', icon: ClipboardList, count: getAllWorkOrders().length },
          { key: 'pregled', label: 'Pregled', icon: Table, count: fancyTablePagination?.totalCount || 0 }
        ]}
      />

      {/* Pretraga i filteri */}
      {activeTab !== 'pregled' && (
        <Toolbar sticky={false}>
          <SearchField
            value={searchTerm}
            placeholder="Pretraga po adresi, korisniku, serijskom broju..."
            onChange={(value) => {
              setSearchTerm(value);
              setCurrentPageUnassigned(1);
              setCurrentPageVerification(1);
              setCurrentPageAllOrders(1);
              setTechnicianCurrentPages({});
            }}
          />

          <Select
            size="sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPageUnassigned(1);
              setCurrentPageVerification(1);
              setCurrentPageAllOrders(1);
              setTechnicianCurrentPages({});
            }}
          >
            <option value="">Svi statusi</option>
            <option value="zavrsen">Završeni</option>
            <option value="nezavrsen">Nezavršeni</option>
            <option value="odlozen">Odloženi</option>
            <option value="otkazan">Otkazani</option>
          </Select>

          {(activeTab === 'all' || activeTab === 'verification') && (
            <Select
              size="sm"
              value={technicianFilter}
              onChange={(e) => {
                setTechnicianFilter(e.target.value);
                setCurrentPageUnassigned(1);
                setCurrentPageVerification(1);
                setCurrentPageAllOrders(1);
                setTechnicianCurrentPages({});
              }}
            >
              <option value="">Svi tehničari</option>
              {technicians.filter(tech => !tech.deletedAt).map(tech => (
                <option key={tech._id} value={tech._id}>
                  {tech.name}
                </option>
              ))}
            </Select>
          )}

          {activeTab === 'all' && (
            <>
              <DateField
                value={dateFilter}
                clearable
                compact
                onChange={(value) => {
                  setDateFilter(value);
                  setCurrentPageAllOrders(1);
                }}
              />

              {dateFilter && (
                <Select
                  size="sm"
                  value={timeSortOrder}
                  onChange={(e) => {
                    setTimeSortOrder(e.target.value);
                    setCurrentPageAllOrders(1);
                  }}
                >
                  <option value="asc">Najstarije → Najnovije</option>
                  <option value="desc">Najnovije → Najstarije</option>
                </Select>
              )}
            </>
          )}

          <div className="sx-toolbar__end">
            <Btn size="sm" icon={RotateCcw} onClick={resetFilters}>Resetuj</Btn>
            <Btn
              size="sm"
              icon={RefreshCw}
              onClick={fetchData}
              disabled={dashboardLoading || recentLoading}
              className={(dashboardLoading || recentLoading || olderLoading) ? 'mx-nd-spin' : undefined}
            >
              Osveži
            </Btn>
          </div>
        </Toolbar>
      )}

      {/* Učitavanje */}
      {(dashboardLoading && recentLoading) ? (
        <Panel pad={false}>
          <Loading text="Učitavanje osnovnih podataka..." />
        </Panel>
      ) : (
        <>
          {/* Tehničari: spisak levo, nalozi izabranog tehničara desno */}
          {activeTab === 'technicians' && (
            <div className="mx-nd-techs">
              <section className="sx-card mx-nd-techs__side">
                <div className="mx-nd-techs__sidehead">
                  <h3 className="mx-nd-h3">Tehničari</h3>
                  <p className="mx-nd-muted">{Object.keys(technicianWorkOrders).length} ukupno</p>
                  <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pretraga tehničara..." />
                </div>
                <div className="mx-nd-techlist mx-nd-techs__list">
                  {Object.entries(technicianWorkOrders)
                    .filter(([techId, techData]) => {
                      if (!searchTerm) return true;
                      const searchLower = searchTerm.toLowerCase();
                      return techData.technicianInfo.name.toLowerCase().includes(searchLower) ||
                             techData.technicianInfo.phone.toLowerCase().includes(searchLower);
                    })
                    .map(([techId, techData]) => {
                    const isSelected = selectedTechnicianId === techId;
                    const totalOrders = techData.workOrders.length;
                    const completedOrders = techData.workOrders.filter(o => o.status === 'zavrsen').length;
                    const pendingOrders = techData.workOrders.filter(o => o.status === 'nezavrsen').length;
                    const postponedOrders = techData.workOrders.filter(o => o.status === 'odlozen').length;
                    const selectTechnician = () => {
                      setSelectedTechnicianId(techId);
                      setStatusFilter('');
                      setTechnicianCurrentPages(prev => ({ ...prev, [techId]: 1 }));
                    };

                    return (
                      <div
                        key={techId}
                        tabIndex={0}
                        onClick={selectTechnician}
                        onKeyDown={(e) => { if (e.key === 'Enter') selectTechnician(); }}
                        className={cx('mx-nd-tech', isSelected && 'is-on')}
                      >
                        <div className="mx-nd-who">
                          <span className={cx('sx-item__icon', isSelected && 'is-ink')}>
                            <User size={16} strokeWidth={1.9} />
                          </span>
                          <div className="mx-nd-who__text">
                            <h4>{techData.technicianInfo.name}</h4>
                            <p>{techData.technicianInfo.phone}</p>
                          </div>
                        </div>

                        <div className="mx-nd-tstats">
                          <span className="mx-nd-tstat" onClick={(e) => { e.stopPropagation(); handleStatClick(techId, '', e); }}>
                            <b>{totalOrders}</b><small>Sve</small>
                          </span>
                          <span className="mx-nd-tstat is-ok" onClick={(e) => { e.stopPropagation(); handleStatClick(techId, 'zavrsen', e); }}>
                            <b>{completedOrders}</b><small>OK</small>
                          </span>
                          <span className="mx-nd-tstat is-warn" onClick={(e) => { e.stopPropagation(); handleStatClick(techId, 'nezavrsen', e); }}>
                            <b>{pendingOrders}</b><small>Akt</small>
                          </span>
                          <span className="mx-nd-tstat is-info" onClick={(e) => { e.stopPropagation(); handleStatClick(techId, 'odlozen', e); }}>
                            <b>{postponedOrders}</b><small>Odl</small>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="sx-card mx-nd-techs__main">
                {selectedTechnicianId ? (
                  <>
                    <div className="mx-nd-techs__head">
                      <div className="mx-nd-techs__title">
                        <div>
                          <h3 className="mx-nd-h3">
                            {technicianWorkOrders[selectedTechnicianId]?.technicianInfo.name}
                          </h3>
                          <p className="mx-nd-muted">
                            {filterOrders(technicianWorkOrders[selectedTechnicianId]?.workOrders || []).length} radnih naloga
                            {statusFilter && ` (${getStatusLabel(statusFilter)})`}
                          </p>
                        </div>
                        <div className="mx-inline">
                          <Select
                            size="sm"
                            value={dateFilter ? 'custom' : ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const today = new Date();
                              let newDate = '';

                              switch(value) {
                                case 'today':
                                  newDate = localYmd(today);
                                  break;
                                case 'yesterday':
                                  const yesterday = new Date(today);
                                  yesterday.setDate(yesterday.getDate() - 1);
                                  newDate = localYmd(yesterday);
                                  break;
                                case 'thisWeek':
                                  const weekStart = new Date(today);
                                  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                                  newDate = localYmd(weekStart);
                                  break;
                                case 'thisMonth':
                                  newDate = localYmd(new Date(today.getFullYear(), today.getMonth(), 1));
                                  break;
                                default:
                                  newDate = '';
                              }
                              setDateFilter(newDate);
                            }}
                          >
                            <option value="">Svi datumi</option>
                            <option value="today">Danas</option>
                            <option value="yesterday">Juče</option>
                            <option value="thisWeek">Ove nedelje</option>
                            <option value="thisMonth">Ovog meseca</option>
                            <option value="custom">Prilagođeno</option>
                          </Select>

                          {dateFilter && (
                            <Select
                              size="sm"
                              value={timeSortOrder}
                              onChange={(e) => setTimeSortOrder(e.target.value)}
                            >
                              <option value="asc">Najstarije → Najnovije</option>
                              <option value="desc">Najnovije → Najstarije</option>
                            </Select>
                          )}
                        </div>
                      </div>

                      {/* Aktivni filteri */}
                      {(statusFilter || dateFilter) && (
                        <div className="sx-chips mx-nd-active">
                          <span className="mx-nd-muted">Aktivni filteri:</span>
                          {statusFilter && (
                            <button type="button" className="sx-chip" onClick={() => setStatusFilter('')}>
                              {getStatusLabel(statusFilter)}
                              <span className="sx-chip__x"><X size={12} strokeWidth={2} /></span>
                            </button>
                          )}
                          {dateFilter && (
                            <button type="button" className="sx-chip" onClick={() => setDateFilter('')}>
                              {formatDate(dateFilter)}
                              <span className="sx-chip__x"><X size={12} strokeWidth={2} /></span>
                            </button>
                          )}
                          <Btn
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setStatusFilter('');
                              setDateFilter('');
                            }}
                          >
                            Obriši sve
                          </Btn>
                        </div>
                      )}

                      {/* Brzi filteri po statusu */}
                      <Choice
                        size="sm"
                        value={statusFilter}
                        onChange={setStatusFilter}
                        layoutId="mx-nd-wos-status"
                        options={[
                          { value: '', label: 'Svi', count: technicianWorkOrders[selectedTechnicianId]?.workOrders.length || 0 },
                          { value: 'zavrsen', label: 'Završeni', count: technicianWorkOrders[selectedTechnicianId]?.workOrders.filter(o => o.status === 'zavrsen').length || 0 },
                          { value: 'nezavrsen', label: 'Nezavršeni', count: technicianWorkOrders[selectedTechnicianId]?.workOrders.filter(o => o.status === 'nezavrsen').length || 0 },
                          { value: 'odlozen', label: 'Odloženi', count: technicianWorkOrders[selectedTechnicianId]?.workOrders.filter(o => o.status === 'odlozen').length || 0 }
                        ]}
                      />
                    </div>

                    {/* Tabela naloga */}
                    <div className="mx-nd-techs__body">
                      {(() => {
                        const filteredTechOrders = filterOrders(technicianWorkOrders[selectedTechnicianId]?.workOrders || []);
                        const currentPageTech = technicianCurrentPages[selectedTechnicianId] || 1;
                        const indexOfLastTech = currentPageTech * itemsPerPage;
                        const indexOfFirstTech = indexOfLastTech - itemsPerPage;
                        const currentTechItems = filteredTechOrders.slice(indexOfFirstTech, indexOfLastTech);

                        if (filteredTechOrders.length === 0) {
                          return (
                            <div className="sx-empty-block">
                              <b>Nema radnih naloga</b>
                              <span>
                                {statusFilter ? 'Pokušajte sa drugim filterom' : 'Ovaj tehničar trenutno nema dodeljenih naloga'}
                              </span>
                            </div>
                          );
                        }

                        // Zaglavlje kolone koje sortira (klik ili Enter), strelica pokazuje smer
                        const sortTh = (key, label) => (
                          <th
                            className="mx-nd-sortth"
                            tabIndex={0}
                            aria-sort={tableSortConfig.key === key ? (tableSortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                            onClick={() => handleSort(key)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSort(key); }}
                          >
                            {label}
                            {tableSortConfig.key === key && (
                              <span className="mx-nd-sortdir">
                                {tableSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </th>
                        );

                        return (
                          <>
                            <div className="mx-nd-tablebar">
                              <span className="mx-nd-muted">
                                {currentTechItems.length} od {filteredTechOrders.length} naloga
                              </span>
                              <div className="mx-inline">
                                <Btn
                                  size="sm"
                                  icon={Download}
                                  onClick={() => {
                                    const data = sortByDate(currentTechItems).map(order => ({
                                      Datum: formatDate(order.date),
                                      Opština: order.municipality,
                                      Adresa: order.address,
                                      Tip: order.type,
                                      Status: getStatusLabel(order.status)
                                    }));

                                    const csv = [
                                      Object.keys(data[0]).join(','),
                                      ...data.map(row => Object.values(row).join(','))
                                    ].join('\n');

                                    const blob = new Blob([csv], { type: 'text/csv' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `radni-nalozi-${technicianWorkOrders[selectedTechnicianId]?.technicianInfo.name}-${localYmd()}.csv`;
                                    a.click();
                                  }}
                                >
                                  Export CSV
                                </Btn>
                                <Btn size="sm" icon={Printer} onClick={() => window.print()}>
                                  Print
                                </Btn>
                                <Btn
                                  size="sm"
                                  icon={RotateCcw}
                                  onClick={() => {
                                    setStatusFilter('');
                                    setDateFilter('');
                                    setTechnicianCurrentPages(prev => ({ ...prev, [selectedTechnicianId]: 1 }));
                                  }}
                                >
                                  Reset
                                </Btn>
                              </div>
                            </div>

                            <div className="sx-tablewrap">
                              <table className="sx-table mx-nd-sorttable">
                                <thead>
                                  <tr>
                                    {sortTh('date', 'Datum')}
                                    {sortTh('municipality', 'Opština')}
                                    {sortTh('address', 'Adresa')}
                                    {sortTh('type', 'Tip')}
                                    {sortTh('status', 'Status')}
                                    <th className="is-end">Akcije</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sortTableData(currentTechItems, tableSortConfig).map((order, i) => (
                                    <tr
                                      key={order._id}
                                      tabIndex={0}
                                      onClick={(e) => navigateToOrderDetails(order._id, e)}
                                      onKeyDown={(e) => { if (e.key === 'Enter') navigateToOrderDetails(order._id, e); }}
                                      className="is-click"
                                      style={{ '--i': i, ...getTimRowStyle(order.tim) }}
                                    >
                                      <td className="is-head"><b className="mx-strong">{formatDate(order.date)}</b></td>
                                      <td data-label="Opština">{order.municipality}</td>
                                      <td data-label="Adresa" className="is-wide">{order.address}</td>
                                      <td data-label="Tip">{order.type}</td>
                                      <td data-label="Status">
                                        <Sign tone={STATUS_TONE[order.status] || 'idle'}>{getStatusLabel(order.status)}</Sign>
                                      </td>
                                      <td className="is-actions is-end">
                                        <div className="sx-rowacts">
                                          <LinkBtn to={`/work-orders/${order._id}`} target="_blank" size="sm" variant="ghost" icon={Eye} />
                                          <Btn
                                            size="sm"
                                            variant="ghost"
                                            icon={Trash2}
                                            className="delete-btn mx-danger"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(order._id);
                                            }}
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <Pager
                              page={currentPageTech}
                              total={filteredTechOrders.length}
                              perPage={itemsPerPage}
                              onPage={(page) => paginateTechnician(selectedTechnicianId, page)}
                            />
                          </>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="sx-empty-block mx-nd-pick">
                    <span className="sx-item__icon"><UserCheck size={18} strokeWidth={1.8} /></span>
                    <b>Izaberite tehničara</b>
                    <span>Kliknite na karticu tehničara sa leve strane</span>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Ostali tabovi: samo broj naloga, kao ranije */}
          {activeTab !== 'technicians' && (
            <Panel pad={false}>
              <div className="sx-empty-block">
                <b>
                  {activeTab === 'unassigned' && `${filteredUnassigned.length} nedodelјenih naloga`}
                  {activeTab === 'verification' && `${filteredVerification.length} naloga za verifikaciju`}
                  {activeTab === 'all' && `${filteredAllOrders.length} naloga ukupno`}
                  {activeTab === 'pregled' && 'Fancy table pregled'}
                </b>
                <span>Full implementation available - displaying placeholder</span>
              </div>
            </Panel>
          )}
        </>
      )}

      {/* Status korisnika */}
      <Dialog
        open={customerStatusModal.isOpen}
        onClose={closeCustomerStatusModal}
        title="Status korisnika"
        description="Izaberite status korisnika za ovaj radni nalog"
        size="lg"
      >
        <div className="mx-nd-statuses">
          {[
            'Priključenje korisnika na HFC KDS mreža u zgradi sa instalacijom CPE opreme (izrada kompletne instalacije od RO do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala',
            'Priključenje korisnika na HFC KDS mreža u privatnim kućama sa instalacijom CPE opreme (izrada instalacije od PM-a do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala',
            'Priključenje korisnika na GPON mrežu u privatnim kućama (izrada kompletne instalacije od PM do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala',
            'Priključenje korisnika na GPON mrežu u zgradi (izrada kompletne instalacije od PM do korisnika sa instalacijom kompletne CPE opreme) sa isporukom materijala',
            'Radovi kod postojećeg korisnika na unutrašnjoj instalaciji sa montažnim radovima sa isporukom materijala',
            'Radovi kod postojećeg korisnika na unutrašnjoj instalaciji bez montažnih radova sa isporukom materijala',
            'Priključenje novog korisnika WiFi tehnologijom (postavljanje nosača antene, postavljanje i usmeravanje antene ka baznoj stanici sa postavljanjem napajanja za antenu, postavljanje rutera i jednog uređaja za televiziju) - ASTRA TELEKOM',
            'Dodavanje drugog uređaja ili dorada - ASTRA TELEKOM',
            'Demontaža postojeće opreme kod korisnika (po korisniku) - ASTRA TELEKOM',
            'Intervencija kod korisnika - ASTRA TELEKOM',
            'Priključenje korisnika GPON tehnologijom (povezivanje svih uređaja u okviru paketa) - ASTRA TELEKOM'
          ].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => handleCustomerStatusChange(customerStatusModal.orderId, status)}
              className={cx('mx-nd-status', orderStatuses[customerStatusModal.orderId] === status && 'is-on')}
            >
              <span>{status}</span>
              {orderStatuses[customerStatusModal.orderId] === status && (
                <CheckCircle2 size={18} strokeWidth={1.9} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </Dialog>

      {/* AI Verification Modal */}
      <AIVerificationModal
        isOpen={showAIModal}
        onClose={() => {
          setShowAIModal(false);
          setAIVerificationResult(null);
        }}
        result={aiVerificationResult}
        loading={loadingAIVerification !== null}
        onAccept={handleAcceptAI}
        onReject={handleRejectAI}
      />

      <ReturnWorkOrderModal
        isOpen={aiReturnModal.isOpen}
        workOrderId={aiReturnModal.orderId}
        initialComment={aiReturnModal.comment}
        source="ai"
        onClose={() => setAiReturnModal({ isOpen: false, orderId: null, comment: '' })}
        onReturned={handleAIReturned}
      />
    </section>
  );
};

export default NewDesign;
