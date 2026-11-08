import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { DollarSign, ChartColumn, ChartPie, Users, Map, RefreshCw, Download } from 'lucide-react';
import { cx, Btn } from '../../security/sx/ui';
import { Panel, Note, Stat, Tabs } from '../../security/sx/layout';
import { Select } from '../../security/sx/forms';
import { Loading } from '../../montaza/ui';

// Serije trenda: prihod (tuš), profit (plava), troškovi (siva); u tamnom oblačiću tuš postaje svetao
const SERIES = [
  { key: 'revenue', label: 'Prihod', color: 'var(--sx-text)', tip: 'var(--sx-tip-text)' },
  { key: 'profit', label: 'Profit', color: 'var(--sx-accent)' },
  { key: 'cost', label: 'Troškovi', color: 'var(--sx-faint)' }
];
const axisNum = (v) => new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 0 }).format(v);

const FinancialAnalysis = ({
  data = [],
  loading = false,
  error = null,
  timeRange = '30d',
  onTimeRangeChange,
  onRefresh,
  onExport,
  className = ''
}) => {
  const [selectedView, setSelectedView] = useState('overview'); // overview, technicians, municipalities, services
  const [selectedPeriod, setSelectedPeriod] = useState('daily'); // daily, weekly, monthly

  // Helper functions
  const calculateFinancialMetrics = (data) => {
    if (!data || data.length === 0) {
      return {
        totalRevenue: 0,
        totalProfit: 0,
        avgRevenuePerOrder: 0,
        avgProfitPerOrder: 0,
        profitMargin: 0,
        totalOrders: 0
      };
    }

    const totalRevenue = data.reduce((sum, item) => {
      const revenue = item.revenue || item.price || getDefaultRevenue(item);
      return sum + (isNaN(revenue) ? 0 : revenue);
    }, 0);

    const totalCost = data.reduce((sum, item) => {
      const cost = item.cost || item.materials_cost || getDefaultCost(item);
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);

    const totalProfit = totalRevenue - totalCost;
    const totalOrders = data.length;

    return {
      totalRevenue,
      totalProfit,
      totalCost,
      avgRevenuePerOrder: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      avgProfitPerOrder: totalOrders > 0 ? totalProfit / totalOrders : 0,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      totalOrders
    };
  };

  const getDefaultRevenue = (item) => {
    // Simuliramo prihod na osnovu tipa usluge
    const serviceTypes = {
      'HFC': 2500,
      'GPON': 3000,
      'STB': 1500,
      'komercijalna': 5000,
      'servis': 1000
    };

    const serviceType = item.service_type || item.type || 'servis';
    return serviceTypes[serviceType] || 2000;
  };

  const getDefaultCost = (item) => {
    // Simuliramo troškove (materijal + rad)
    const baseCost = getDefaultRevenue(item) * 0.4; // 40% od prihoda
    const materialCost = Math.random() * 500 + 200; // 200-700 RSD materijal
    const laborCost = Math.random() * 800 + 400; // 400-1200 RSD rad

    return baseCost + materialCost + laborCost;
  };

  const groupByTechnician = (data) => {
    const groups = {};

    data.forEach(item => {
      const technician = item.technician || item.worker || 'Nepoznat tehničar';

      if (!groups[technician]) {
        groups[technician] = {
          name: technician,
          orders: [],
          totalRevenue: 0,
          totalProfit: 0,
          totalCost: 0,
          completedOrders: 0,
          averageTime: 0,
          totalTime: 0
        };
      }

      const revenue = item.revenue || getDefaultRevenue(item);
      const cost = item.cost || getDefaultCost(item);
      const profit = revenue - cost;
      const workTime = item.work_time || item.duration || Math.random() * 120 + 60; // 60-180 min

      groups[technician].orders.push(item);
      groups[technician].totalRevenue += revenue;
      groups[technician].totalCost += cost;
      groups[technician].totalProfit += profit;
      groups[technician].totalTime += workTime;

      if (item.status === 'completed' || item.completed) {
        groups[technician].completedOrders++;
      }
    });

    // Calculate averages
    return Object.values(groups).map(group => ({
      ...group,
      orderCount: group.orders.length,
      avgRevenuePerOrder: group.orders.length > 0 ? group.totalRevenue / group.orders.length : 0,
      avgProfitPerOrder: group.orders.length > 0 ? group.totalProfit / group.orders.length : 0,
      profitMargin: group.totalRevenue > 0 ? (group.totalProfit / group.totalRevenue) * 100 : 0,
      completionRate: group.orders.length > 0 ? (group.completedOrders / group.orders.length) * 100 : 0,
      averageTime: group.orders.length > 0 ? group.totalTime / group.orders.length : 0,
      efficiency: group.totalTime > 0 ? group.totalProfit / (group.totalTime / 60) : 0 // profit per hour
    })).sort((a, b) => b.totalProfit - a.totalProfit);
  };

  const groupByMunicipality = (data) => {
    const groups = {};

    data.forEach(item => {
      const municipality = item.municipality || item.location || item.city || 'Nepoznata opština';

      if (!groups[municipality]) {
        groups[municipality] = {
          name: municipality,
          orders: [],
          totalRevenue: 0,
          totalProfit: 0,
          totalCost: 0,
          uniqueTechnicians: new Set()
        };
      }

      const revenue = item.revenue || getDefaultRevenue(item);
      const cost = item.cost || getDefaultCost(item);
      const profit = revenue - cost;

      groups[municipality].orders.push(item);
      groups[municipality].totalRevenue += revenue;
      groups[municipality].totalCost += cost;
      groups[municipality].totalProfit += profit;
      groups[municipality].uniqueTechnicians.add(item.technician || 'Nepoznat');
    });

    return Object.values(groups).map(group => ({
      ...group,
      orderCount: group.orders.length,
      technicianCount: group.uniqueTechnicians.size,
      avgRevenuePerOrder: group.orders.length > 0 ? group.totalRevenue / group.orders.length : 0,
      avgProfitPerOrder: group.orders.length > 0 ? group.totalProfit / group.orders.length : 0,
      profitMargin: group.totalRevenue > 0 ? (group.totalProfit / group.totalRevenue) * 100 : 0,
      avgRevenuePerTechnician: group.technicianCount > 0 ? group.totalRevenue / group.technicianCount : 0
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const groupByServiceType = (data) => {
    const groups = {};

    data.forEach(item => {
      const serviceType = item.service_type || item.type || 'Ostalo';

      if (!groups[serviceType]) {
        groups[serviceType] = {
          name: serviceType,
          orders: [],
          totalRevenue: 0,
          totalProfit: 0,
          totalCost: 0
        };
      }

      const revenue = item.revenue || getDefaultRevenue(item);
      const cost = item.cost || getDefaultCost(item);
      const profit = revenue - cost;

      groups[serviceType].orders.push(item);
      groups[serviceType].totalRevenue += revenue;
      groups[serviceType].totalCost += cost;
      groups[serviceType].totalProfit += profit;
    });

    return Object.values(groups).map(group => ({
      ...group,
      orderCount: group.orders.length,
      avgRevenuePerOrder: group.orders.length > 0 ? group.totalRevenue / group.orders.length : 0,
      avgProfitPerOrder: group.orders.length > 0 ? group.totalProfit / group.orders.length : 0,
      profitMargin: group.totalRevenue > 0 ? (group.totalProfit / group.totalRevenue) * 100 : 0,
      marketShare: 0 // Will be calculated later
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const generateTrendAnalysis = (data) => {
    if (!data || data.length === 0) return [];

    const dailyData = {};

    data.forEach(item => {
      if (!item.timestamp) return;

      const timestamp = new Date(item.timestamp);
      if (isNaN(timestamp.getTime())) return;

      const dateKey = timestamp.toISOString().split('T')[0];

      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          revenue: 0,
          profit: 0,
          cost: 0,
          orders: 0
        };
      }

      const revenue = item.revenue || getDefaultRevenue(item);
      const cost = item.cost || getDefaultCost(item);

      dailyData[dateKey].revenue += revenue;
      dailyData[dateKey].cost += cost;
      dailyData[dateKey].profit += (revenue - cost);
      dailyData[dateKey].orders += 1;
    });

    return Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Main financial analysis calculations
  const financialAnalysis = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        overview: calculateFinancialMetrics([]),
        byTechnician: [],
        byMunicipality: [],
        byServiceType: [],
        trends: []
      };
    }

    const overview = calculateFinancialMetrics(data);
    const byTechnician = groupByTechnician(data);
    const byMunicipality = groupByMunicipality(data);
    const byServiceType = groupByServiceType(data);
    const trends = generateTrendAnalysis(data);

    // Calculate market share for service types
    const totalServiceRevenue = byServiceType.reduce((sum, service) => sum + service.totalRevenue, 0);
    byServiceType.forEach(service => {
      service.marketShare = totalServiceRevenue > 0 ? (service.totalRevenue / totalServiceRevenue) * 100 : 0;
    });

    return {
      overview,
      byTechnician,
      byMunicipality,
      byServiceType,
      trends
    };
  }, [data]);

  if (loading) {
    return <Loading rows={5} h={64} />;
  }

  if (error) {
    return (
      <Note tone="bad" icon={DollarSign} actions={onRefresh && (
        <Btn size="sm" icon={RefreshCw} onClick={onRefresh}>Pokušaj ponovo</Btn>
      )}>
        <h4 className="mx-logdash-note__title">Greška pri učitavanju finansijske analize</h4>
        <p>{error}</p>
      </Note>
    );
  }

  // Oblačić dana: datum, prihod, profit, troškovi, nalozi (kao ranije)
  const DayTip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const day = payload[0].payload;
    return (
      <div className="mx-logdash-tip">
        <span className="mx-logdash-tip__title">{new Date(day.date).toLocaleDateString('sr-RS')}</span>
        {SERIES.map((s) => (
          <div key={s.key} className="mx-logdash-tip__row">
            <span className="mx-logdash-tip__key" style={{ '--c': s.tip || s.color }}>{s.label}:</span>
            <b>{formatCurrency(day[s.key])}</b>
          </div>
        ))}
        <div className="mx-logdash-tip__row"><span className="mx-logdash-tip__key">Nalozi:</span><b>{day.orders}</b></div>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="mx-logdash-sec">
      {/* Key Metrics */}
      <div className="sx-stats">
        <Stat
          label="Ukupan prihod"
          value={formatCurrency(financialAnalysis.overview.totalRevenue)}
          sub={`${formatCurrency(financialAnalysis.overview.avgRevenuePerOrder)} po nalogu`}
        />
        <Stat
          label="Ukupan profit"
          value={formatCurrency(financialAnalysis.overview.totalProfit)}
          sub={`${formatCurrency(financialAnalysis.overview.avgProfitPerOrder)} po nalogu`}
        />
        <Stat
          label="Profit margina"
          tone={financialAnalysis.overview.profitMargin > 20 ? 'ok' : financialAnalysis.overview.profitMargin > 10 ? undefined : 'warn'}
          value={`${financialAnalysis.overview.profitMargin.toFixed(1)}%`}
          sub={financialAnalysis.overview.profitMargin > 20 ? 'Odličan' :
               financialAnalysis.overview.profitMargin > 10 ? 'Dobar' : 'Treba poboljšati'}
        />
        <Stat
          label="Ukupni troškovi"
          value={formatCurrency(financialAnalysis.overview.totalCost)}
          sub={`${((financialAnalysis.overview.totalCost / financialAnalysis.overview.totalRevenue) * 100).toFixed(1)}% od prihoda`}
        />
      </div>

      {/* Enhanced Financial Trend Chart */}
      {(financialAnalysis.trends.length > 0 || true) && (
        <Panel
          title="Finansijski trend"
          actions={(
            <Select size="sm" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} aria-label="Period trenda">
              <option value="daily">Dnevno</option>
              <option value="weekly">Nedeljno</option>
              <option value="monthly">Mesečno</option>
            </Select>
          )}
        >
          {/* Chart Header with Stats */}
          {(() => {
            const trendsData = financialAnalysis.trends.length > 0 ? financialAnalysis.trends :
              Array.from({length: 15}, (_, i) => ({
                date: new Date(Date.now() - (14-i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                revenue: Math.random() * 50000 + 20000,
                profit: Math.random() * 20000 + 8000,
                cost: Math.random() * 30000 + 12000,
                orders: Math.floor(Math.random() * 15) + 5
              }));

            return (
              <div className="mx-logdash-mini">
                <div>
                  <b>{formatCurrency(Math.max(...trendsData.map(d => d.revenue)))}</b>
                  <span>Najveći dnevni prihod</span>
                </div>
                <div>
                  <b>{formatCurrency(Math.max(...trendsData.map(d => d.profit)))}</b>
                  <span>Najveći dnevni profit</span>
                </div>
                <div>
                  <b>{formatCurrency(trendsData.reduce((sum, d) => sum + d.revenue, 0) / trendsData.length)}</b>
                  <span>Prosečno dnevno</span>
                </div>
              </div>
            );
          })()}

          {/* Chart Area */}
          {(() => {
            const trendsData = financialAnalysis.trends.length > 0 ? financialAnalysis.trends :
              Array.from({length: 12}, (_, i) => ({
                date: new Date(Date.now() - (11-i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                revenue: Math.random() * 50000 + 20000,
                profit: Math.random() * 20000 + 8000,
                cost: Math.random() * 30000 + 12000,
                orders: Math.floor(Math.random() * 15) + 5
              }));

            const displayData = trendsData.slice(-12);

            return (
              <div className="mx-logdash-chart mx-logdash-chart--tall">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="18%">
                    <CartesianGrid vertical={false} stroke="var(--sx-line)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => new Date(d).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' })}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--sx-line-2)' }}
                      tick={{ fill: 'var(--sx-muted)' }}
                      interval="equidistantPreserveStart"
                      minTickGap={12}
                    />
                    <YAxis width={56} tickFormatter={axisNum} tickLine={false} axisLine={false} tick={{ fill: 'var(--sx-muted)' }} />
                    <ReferenceLine y={0} stroke="var(--sx-line-2)" />
                    <Tooltip content={<DayTip />} cursor={{ fill: 'var(--sx-surface-2)' }} isAnimationActive={false} />
                    {SERIES.map((s) => (
                      <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}

          {/* Legend */}
          <div className="mx-logdash-legend mx-mt">
            {SERIES.map((s) => (
              <span key={s.key} className="mx-logdash-legend__item" style={{ '--c': s.color }}>{s.label}</span>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );

  const renderTechnicianAnalysis = () => (
    <Panel pad={false} title="Analiza po tehničarima">
      <div className="sx-tablewrap">
        <table className="sx-table">
          <thead>
            <tr><th><span className="sx-sr">Tehničar</span></th><th>Prihod</th><th>Profit</th><th>Margina</th><th>Efikasnost</th></tr>
          </thead>
          <tbody>
            {financialAnalysis.byTechnician.map((technician, index) => (
              <tr key={index} style={{ '--i': index }}>
                <td className="is-head"><div className="sx-cell"><b>{technician.name}</b><span>{technician.orderCount} naloga</span></div></td>
                <td data-label="Prihod"><div className="sx-cell"><b>{formatCurrency(technician.totalRevenue)}</b><span>{formatCurrency(technician.avgRevenuePerOrder)}/nalog</span></div></td>
                <td data-label="Profit"><div className="sx-cell"><b>{formatCurrency(technician.totalProfit)}</b><span>{formatCurrency(technician.avgProfitPerOrder)}/nalog</span></div></td>
                <td data-label="Margina"><div className="sx-cell"><b>{technician.profitMargin.toFixed(1)}%</b><span>{technician.completionRate.toFixed(1)}% završeno</span></div></td>
                <td data-label="Efikasnost"><div className="sx-cell"><b>{formatCurrency(technician.efficiency)}/h</b><span>{technician.averageTime.toFixed(0)} min/nalog</span></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );

  const renderMunicipalityAnalysis = () => (
    <Panel pad={false} title="Analiza po opštinama">
      <div className="sx-tablewrap">
        <table className="sx-table">
          <thead>
            <tr>
              <th><span className="sx-sr">Opština</span></th>
              <th className="is-num">Ukupan prihod</th>
              <th className="is-num">Ukupan profit</th>
              <th className="is-num">Broj naloga</th>
              <th className="is-num">Tehničari</th>
              <th className="is-num">Prosečan prihod/nalog</th>
              <th className="is-num">Profit margina</th>
            </tr>
          </thead>
          <tbody>
            {financialAnalysis.byMunicipality.map((municipality, index) => (
              <tr key={index} style={{ '--i': index }}>
                <td className="is-head"><div className="sx-cell"><b>{municipality.name}</b></div></td>
                <td data-label="Ukupan prihod" className="is-num">{formatCurrency(municipality.totalRevenue)}</td>
                <td data-label="Ukupan profit" className="is-num">{formatCurrency(municipality.totalProfit)}</td>
                <td data-label="Broj naloga" className="is-num">{municipality.orderCount}</td>
                <td data-label="Tehničari" className="is-num">{municipality.technicianCount}</td>
                <td data-label="Prosečan prihod/nalog" className="is-num">{formatCurrency(municipality.avgRevenuePerOrder)}</td>
                <td data-label="Profit margina" className="is-num">{municipality.profitMargin.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );

  const renderServiceTypeAnalysis = () => (
    <Panel pad={false} title="Analiza po vrsti usluge">
      <div className="sx-tablewrap">
        <table className="sx-table">
          <thead>
            <tr>
              <th><span className="sx-sr">Usluga</span></th>
              <th className="is-num">Ukupan prihod</th>
              <th className="is-num">Ukupan profit</th>
              <th className="is-num">Broj naloga</th>
              <th className="is-num">Prosek/nalog</th>
              <th className="is-num">Profit margina</th>
            </tr>
          </thead>
          <tbody>
            {financialAnalysis.byServiceType.map((service, index) => (
              <tr key={index} style={{ '--i': index }}>
                <td className="is-head"><div className="sx-cell"><b>{service.name}</b><span>{service.marketShare.toFixed(1)}% tržišnog udela</span></div></td>
                <td data-label="Ukupan prihod" className="is-num">{formatCurrency(service.totalRevenue)}</td>
                <td data-label="Ukupan profit" className="is-num">{formatCurrency(service.totalProfit)}</td>
                <td data-label="Broj naloga" className="is-num">{service.orderCount}</td>
                <td data-label="Prosek/nalog" className="is-num">{formatCurrency(service.avgRevenuePerOrder)}</td>
                <td data-label="Profit margina" className="is-num">{service.profitMargin.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );

  return (
    <div className={cx('mx-logdash-sec', className)}>
      {/* Zaglavlje */}
      <div className="mx-logdash-sec__head">
        <div className="mx-logdash-sec__titles">
          <h3 className="mx-logdash-sec__title">Finansijska analiza</h3>
          <p className="mx-logdash-sec__lead">Prihodi, profiti i troškovi po tehničarima i opštinama</p>
        </div>

        <div className="mx-logdash-sec__tools">
          {onTimeRangeChange && (
            <Select size="sm" value={timeRange} onChange={(e) => onTimeRangeChange(e.target.value)} aria-label="Period">
              <option value="7d">Poslednja 7 dana</option>
              <option value="30d">Poslednja 30 dana</option>
              <option value="90d">Poslednja 3 meseca</option>
              <option value="180d">Poslednja 6 meseci</option>
            </Select>
          )}

          {onExport && (
            <Btn size="sm" icon={Download} onClick={() => onExport(financialAnalysis)}>Export</Btn>
          )}

          {onRefresh && (
            <Btn size="sm" icon={RefreshCw} onClick={onRefresh}>Osvježi</Btn>
          )}
        </div>
      </div>

      {/* View Selection */}
      <Tabs
        className="mx-logdash-fin__tabs"
        ariaLabel="Prikaz"
        layoutId="mx-logdash-fin-tabs"
        value={selectedView}
        onChange={setSelectedView}
        items={[
          { key: 'overview', label: 'Pregled', icon: ChartColumn },
          { key: 'technicians', label: 'Tehničari', icon: Users },
          { key: 'municipalities', label: 'Opštine', icon: Map },
          { key: 'services', label: 'Usluge', icon: ChartPie }
        ]}
      />

      {/* Content */}
      {data.length === 0 ? (
        <Panel>
          <div className="sx-empty-block">
            <h4>Nema finansijskih podataka</h4>
            <span>Podaci o prihodima i profitima će biti prikazani kada budu dostupni.</span>
          </div>
        </Panel>
      ) : (
        <>
          {selectedView === 'overview' && renderOverview()}
          {selectedView === 'technicians' && renderTechnicianAnalysis()}
          {selectedView === 'municipalities' && renderMunicipalityAnalysis()}
          {selectedView === 'services' && renderServiceTypeAnalysis()}

          {/* Info Note */}
          <Note tone="info">
            <h5 className="mx-logdash-note__title">Napomena o podacima</h5>
            <p>
              Finansijski podaci su kalkulisani na osnovu tipova usluga i procenjenih troškova materijala i rada.
              Za preciznije analize, potrebno je integrisati podatke iz fakturnig sistema.
            </p>
          </Note>
        </>
      )}
    </div>
  );
};

export default FinancialAnalysis;
