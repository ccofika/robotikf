import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Cable,
  HardHat,
  CheckCircle2,
  Clock,
  RefreshCw,
  Wallet,
  CalendarClock,
  History,
  Star,
  ChevronRight,
  Car,
  ClipboardPlus,
  PackagePlus,
  UserPlus,
  Upload
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import api, { reviewsAPI } from '../../services/api';
import GlobalSearch from '../../components/GlobalSearch';
import { Btn, Led, Skeleton } from '../../security/sx/ui';
import { PageHead, Panel, Note, Stat } from '../../security/sx/layout';
import { LinkBtn } from '../../montaza/ui';
import './Dashboard.mx.css';

const getIconForAction = (action) => {
  const iconMap = {
    'workorder_completed': CheckCircle2,
    'equipment_added': Package,
    'material_added': Cable,
    'technician_added': HardHat,
    'vehicle_added': Car,
    'default': History
  };
  return iconMap[action] || iconMap.default;
};

const Dashboard = () => {
  const navigate = useNavigate();
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
  const [failedTransactions, setFailedTransactions] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [reviewData, setReviewData] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

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
        api.get('/api/logs/technicians?limit=5').catch(() => ({ data: { results: [] } })),
        reviewsAPI.getDashboardSummary().catch(() => ({ data: null }))
      ];

      if (isSuperAdmin) {
        apiCalls.push(
          api.get('/api/finances/reports?statsOnly=true').catch(() => ({ data: null })),
          api.get('/api/finances/failed-transactions').catch(() => ({ data: [] }))
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
        reviewsRes,
        financialReportsRes,
        failedTransactionsRes
      ] = isSuperAdmin
        ? responses
        : [...responses, { data: null }, { data: [] }];

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
      setFailedTransactions(failedTransactionsRes?.data || []);
      setReviewData(reviewsRes?.data || null);

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

  const navigateToWorkOrders = (status) => {
    if (status === 'zavrsen') {
      navigate('/work-orders?tab=all&status=zavrsen');
    } else if (status === 'nezavrsen') {
      navigate('/work-orders?tab=all&status=nezavrsen');
    } else if (status === 'odlozen') {
      navigate('/work-orders?tab=all&status=odlozen');
    } else {
      navigate('/work-orders?tab=all');
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `pre ${diffMins} min`;
    if (diffHours < 24) return `pre ${diffHours}h`;
    return `pre ${Math.floor(diffMs / 86400000)} dana`;
  };

  const getTotalAlerts = () => {
    let count = 0;
    if (failedTransactions.length > 0) count++;
    if (vehicleStats?.expiringRegistrations > 0) count++;
    if (stats.workOrders.postponed > 0) count++;
    return count;
  };

  const renderStars = (rating, max = 5) => {
    const stars = [];
    const rounded = Math.round(rating);
    for (let i = 1; i <= max; i++) {
      stars.push(
        <Star key={i} size={12} strokeWidth={1.9} aria-hidden="true" className={i <= rounded ? 'mx-dashboard-star is-on' : 'mx-dashboard-star'} />
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="sx-page mx-dashboard" data-testid="page-dashboard" aria-busy="true">
        <span className="sx-sr" role="status">Učitavanje...</span>
        <Skeleton h={12} w={170} />
        <Skeleton h={44} w="min(300px, 70%)" style={{ marginTop: 16 }} />
        <Skeleton h={16} w="min(240px, 60%)" style={{ marginTop: 14 }} />
        <Skeleton h={112} r={18} style={{ marginTop: 28 }} />
        <div className="sx-cols sx-cols--main" style={{ marginTop: 20 }}>
          <Skeleton h={300} r={18} />
          <Skeleton h={300} r={18} />
        </div>
      </div>
    );
  }

  const completionRate = stats.workOrders.total > 0
    ? Math.round((stats.workOrders.completed / stats.workOrders.total) * 100)
    : 0;

  // Statusi naloga: zavrsen ok, nezavrsen warn, odlozen info (isti tonovi kao u listi naloga)
  const statusRows = [
    { label: 'Završeni', value: stats.workOrders.completed, tone: 'ok', status: 'zavrsen' },
    { label: 'U toku', value: stats.workOrders.pending, tone: 'warn', status: 'nezavrsen' },
    { label: 'Odloženi', value: stats.workOrders.postponed, tone: 'info', status: 'odlozen' }
  ];
  const maxVal = Math.max(stats.workOrders.completed, stats.workOrders.pending, stats.workOrders.postponed, 1);

  const mainStats = [
    { to: '/work-orders', corner: 'Ukupno', label: 'Radni nalozi', value: stats.workOrders.total, sub: <><span className="mx-dashboard-up">↑ {completionRate}%</span> završeno</> },
    { to: '/equipment', corner: 'Aktivna', label: 'Oprema', value: stats.equipment, sub: 'ukupno uređaja' },
    { to: '/technicians', corner: 'Tim', label: 'Tehničari', value: stats.technicians, sub: <>~{stats.technicians > 0 ? Math.round(stats.workOrders.total / stats.technicians) : 0} naloga/tehničar</> },
    { to: '/materials', corner: 'Stanje', label: 'Materijali', value: stats.materials, sub: 'na lageru' }
  ];

  const quickActions = [
    { to: '/work-orders/add', label: 'Novi nalog', icon: ClipboardPlus },
    { to: '/equipment/upload', label: 'Dodaj opremu', icon: Upload },
    { to: '/materials/add', label: 'Dodaj materijal', icon: PackagePlus },
    { to: '/technicians/add', label: 'Dodaj tehničara', icon: UserPlus },
    isSuperAdmin && { to: '/finances', label: 'Finansije', icon: Wallet },
    { to: '/vehicles', label: 'Vozni park', icon: Car }
  ].filter(Boolean);

  return (
    <div className="sx-page mx-dashboard" data-testid="page-dashboard">
      <PageHead
        className="mx-dashboard-head"
        eyebrow="Montaža · Dashboard"
        title="Dashboard"
        lead={`Dobrodošli, ${user?.name}`}
        actions={(
          <>
            <GlobalSearch onFocusChange={setSearchFocused} expanded={searchFocused} />
            <Btn icon={RefreshCw} onClick={fetchDashboardData} title="Osveži podatke" aria-label="Osveži podatke" />
          </>
        )}
      />

      {/* Upozorenja */}
      {getTotalAlerts() > 0 && (
        <Note
          tone="warn"
          testId="dashboard-alerts"
          actions={(
            <>
              {failedTransactions.length > 0 && (
                <Btn size="sm" icon={Wallet} onClick={() => navigate('/finances')}>
                  {failedTransactions.length} finansijskih
                </Btn>
              )}
              {vehicleStats?.expiringRegistrations > 0 && (
                <Btn size="sm" icon={CalendarClock} onClick={() => navigate('/vehicles')}>
                  {vehicleStats.expiringRegistrations} registracija
                </Btn>
              )}
              {stats.workOrders.postponed > 0 && (
                <Btn size="sm" icon={Clock} onClick={() => navigateToWorkOrders('odlozen')}>
                  {stats.workOrders.postponed} odloženih
                </Btn>
              )}
            </>
          )}
        >
          <b>Upozorenja ({getTotalAlerts()})</b>
        </Note>
      )}

      {/* Glavne brojke (linkovi na stranice) */}
      <div className="sx-stats">
        {mainStats.map((s) => (
          <Link key={s.to} to={s.to} className="sx-stat is-button mx-dashboard-stat">
            <span className="mx-dashboard-stat__top">
              <span className="mx-dashboard-stat__corner">{s.corner}</span>
              <span className="sx-label">{s.label}</span>
            </span>
            <span className="sx-stat__num sx-num">{s.value.toLocaleString()}</span>
            <span className="sx-stat__sub">{s.sub}</span>
          </Link>
        ))}
      </div>

      {/* Raspodela po statusu + završeni / u toku */}
      <div className="sx-cols sx-cols--main">
        <Panel
          title="Pregled radnih naloga"
          sub="Raspodela po statusu"
          actions={<LinkBtn to="/work-orders" size="sm" variant="ghost">Svi nalozi →</LinkBtn>}
        >
          <div className="mx-dashboard-bars">
            {statusRows.map((item) => {
              const heightPct = Math.max((item.value / maxVal) * 85, 5);
              return (
                <button key={item.status} type="button" className="mx-dashboard-bar" onClick={() => navigateToWorkOrders(item.status)}>
                  <span className="mx-dashboard-bar__val sx-num">{item.value}</span>
                  <span className="mx-dashboard-bar__track">
                    <span className="mx-dashboard-bar__fill" data-tone={item.tone} style={{ height: `${heightPct}%` }} />
                  </span>
                  <span className="mx-dashboard-bar__label">{item.label}</span>
                </button>
              );
            })}
          </div>
        </Panel>

        <div className="sx-stats mx-dashboard-side">
          <Stat
            label="Završeni"
            value={stats.workOrders.completed}
            onClick={() => navigateToWorkOrders('zavrsen')}
            sub={(
              <>
                <span className="mx-dashboard-kv"><span>Stopa uspešnosti</span><b>{completionRate}%</b></span>
                <span className="mx-dashboard-meter" data-tone="ok"><span style={{ width: `${completionRate}%` }} /></span>
              </>
            )}
          />
          <Stat
            label="U toku"
            value={stats.workOrders.pending}
            onClick={() => navigateToWorkOrders('nezavrsen')}
            sub={<span className="mx-dashboard-kv"><span>Prosečno vreme</span><b>{stats.workOrders.avgCompletionTime || 2.5}d</b></span>}
          />
        </div>
      </div>

      {/* Status naloga, nedavna aktivnost, ocene */}
      <div className="mx-dashboard-trio">
        <Panel title="Status radnih naloga" actions={<LinkBtn to="/work-orders" size="sm" variant="ghost">Svi →</LinkBtn>}>
          <div className="sx-list">
            {statusRows.map((item) => (
              <button key={item.status} type="button" className="sx-item is-click mx-dashboard-row" onClick={() => navigateToWorkOrders(item.status)}>
                <Led tone={item.tone} />
                <span className="sx-item__main"><b>{item.label}</b></span>
                <span className="sx-item__side">
                  <span className="mx-dashboard-row__pct">
                    {stats.workOrders.total > 0 ? Math.round((item.value / stats.workOrders.total) * 100) : 0}%
                  </span>
                  <b className="mx-dashboard-row__val">{item.value}</b>
                  <ChevronRight size={14} strokeWidth={1.9} aria-hidden="true" className="mx-dashboard-row__chev" />
                </span>
              </button>
            ))}
          </div>

          <div className="mx-dashboard-res">
            <span className="sx-label">Resursi</span>
            <div className="mx-dashboard-res__grid">
              <Link to="/equipment" className="mx-dashboard-res__item">
                <span>Oprema</span>
                <b className="sx-num">{stats.equipment}</b>
              </Link>
              <Link to="/materials" className="mx-dashboard-res__item">
                <span>Materijali</span>
                <b className="sx-num">{stats.materials}</b>
              </Link>
              <Link to="/technicians" className="mx-dashboard-res__item">
                <span>Tehničari</span>
                <b className="sx-num">{stats.technicians}</b>
              </Link>
            </div>
          </div>
        </Panel>

        <Panel title="Nedavna aktivnost" actions={<LinkBtn to="/logs" size="sm" variant="ghost">Svi logovi →</LinkBtn>}>
          {recentActivity.length > 0 ? (
            <div className="sx-list">
              {recentActivity.slice(0, 5).map((activity, index) => {
                const IconComponent = activity.icon;
                return (
                  <div key={index} className="sx-item mx-dashboard-act">
                    <span className="sx-item__icon"><IconComponent size={16} strokeWidth={1.8} aria-hidden="true" /></span>
                    <span className="sx-item__main">
                      <b>{activity.message}</b>
                      <span>
                        {formatTimeAgo(activity.timestamp)}
                        {activity.technicianName && <> · <span className="mx-dashboard-act__who">{activity.technicianName}</span></>}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="sx-empty"><b>Nema aktivnosti</b></div>
          )}
        </Panel>

        <Panel title="Ocene" className="mx-dashboard-revpanel" actions={<LinkBtn to="/technicians" size="sm" variant="ghost">Tehničari →</LinkBtn>}>
          {reviewData && reviewData.totalReviews > 0 ? (
            <div className="mx-dashboard-rev">
              <div className="mx-dashboard-rev__score">
                <span className="sx-num mx-dashboard-rev__num">{reviewData.overallRating}</span>
                <span className="mx-dashboard-stars">
                  {renderStars(reviewData.overallRating)}
                  <span className="mx-dashboard-rev__max">/ 5</span>
                </span>
              </div>

              <div className="mx-dashboard-rev__meters">
                <span className="mx-dashboard-kv"><span>Profesionalnost</span><b>{reviewData.avgProfessionalism}</b></span>
                <span className="mx-dashboard-meter"><span style={{ width: `${(reviewData.avgProfessionalism / 5) * 100}%` }} /></span>
                <span className="mx-dashboard-kv"><span>Kvalitet usluge</span><b>{reviewData.avgServiceQuality}</b></span>
                <span className="mx-dashboard-meter" data-tone="info"><span style={{ width: `${(reviewData.avgServiceQuality / 5) * 100}%` }} /></span>
              </div>

              <div className="mx-dashboard-kv mx-dashboard-rev__total"><span>Ukupno ocena</span><b>{reviewData.totalReviews}</b></div>

              {reviewData.recentReviews && reviewData.recentReviews.length > 0 && (
                <div className="mx-dashboard-rev__list">
                  {reviewData.recentReviews.map((review, i) => (
                    <div key={review._id || i} className="mx-dashboard-rev__item">
                      <span className="sx-avatar mx-dashboard-rev__ava" aria-hidden="true">{review.technicianName?.charAt(0) || '?'}</span>
                      <span className="mx-dashboard-rev__main">
                        <span className="mx-dashboard-rev__line">
                          <b>{review.technicianName}</b>
                          <span className="mx-dashboard-stars">{renderStars(Math.round((review.professionalism + review.serviceQuality) / 2))}</span>
                        </span>
                        {review.comment && <span className="mx-dashboard-rev__comment">{review.comment}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="sx-empty">
              <b>Nema ocena</b>
              <span>Ocene će se pojaviti nakon što korisnici ocene tehničare</span>
            </div>
          )}
        </Panel>
      </div>

      {/* Finansije - za superadmin i supervisor */}
      {isSuperAdmin && financialStats && (
        <section className="mx-dashboard-fin" data-testid="dashboard-finances">
          <div className="sx-stats">
            <Stat label="Mesečni prihod" value={`${((financialStats.totalRevenue || 0) / 1000).toFixed(1)}k`} sub="Ukupan prihod" />
            <Stat label="Troškovi" value={`${((financialStats.totalPayouts || 0) / 1000).toFixed(1)}k`} sub="Isplate tehničarima" />
            <Stat label="Neto profit" value={`${((financialStats.totalProfit || 0) / 1000).toFixed(1)}k`} sub="Ovaj mesec" />
            <div className="sx-stat mx-dashboard-fin__go">
              <LinkBtn to="/finances" variant="primary">Detalji →</LinkBtn>
            </div>
          </div>
          {failedTransactions.length > 0 && (
            <Note tone="bad" actions={<LinkBtn to="/finances" size="sm">Reši →</LinkBtn>}>
              {failedTransactions.length} neuspešnih transakcija
            </Note>
          )}
        </section>
      )}

      {/* Vozni park + brze akcije */}
      <div className="sx-cols sx-cols--2">
        {vehicleStats && (
          <Panel title="Vozni park" actions={<LinkBtn to="/vehicles" size="sm" variant="ghost">Detalji →</LinkBtn>}>
            <div className="sx-stats mx-dashboard-mini">
              <Stat label="Ukupno" value={vehicleStats.totalVehicles || 0} />
              <Stat label="Aktivna" value={vehicleStats.activeVehicles || 0} tone={vehicleStats.activeVehicles ? 'ok' : null} />
              <Stat label="Ističe reg." value={vehicleStats.expiringRegistrations || 0} tone={vehicleStats.expiringRegistrations ? 'warn' : null} />
              <Stat label="Troškovi serv." value={`${((vehicleStats.totalServiceCosts || 0) / 1000).toFixed(0)}k`} />
            </div>
          </Panel>
        )}

        <Panel title="Brze akcije">
          <div className="mx-dashboard-actions">
            {quickActions.map((a) => (
              <LinkBtn key={a.to} to={a.to} icon={a.icon}>{a.label}</LinkBtn>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default Dashboard;
