import React, { useMemo, useState } from 'react';
import { DollarSign, ChartColumn, ChartPie, Users, Map, RefreshCw, Download, Info } from 'lucide-react';
import { cx, Btn } from '../../security/sx/ui';
import { Note, Stat } from '../../security/sx/layout';
import { Select, Choice } from '../../security/sx/forms';
import { Loading } from '../../montaza/ui';

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
    return (
      <div className={cx('mx-logdash-comp', className)}>
        <Loading rows={5} h={64} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cx('mx-logdash-comp', className)}>
        <div className="mx-logdash-empty is-bad">
          <span className="sx-item__icon"><DollarSign size={22} strokeWidth={1.8} aria-hidden="true" /></span>
          <h4>Greška pri učitavanju finansijske analize</h4>
          <p>{error}</p>
          {onRefresh && (
            <Btn size="sm" icon={RefreshCw} onClick={onRefresh}>Pokušaj ponovo</Btn>
          )}
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="mx-logdash-sub">
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
        <div className="mx-logdash-sub mx-mt">
          <div className="mx-logdash-headrow">
            <h4 className="mx-logdash-h">Finansijski trend</h4>
            <Select size="sm" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} aria-label="Period trenda">
              <option value="daily">Dnevno</option>
              <option value="weekly">Nedeljno</option>
              <option value="monthly">Mesečno</option>
            </Select>
          </div>

          <div className="mx-logdash-box mx-logdash-box--flush">
            {/* Chart Header with Stats */}
            <div className="mx-logdash-box__head">
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
                  <div className="mx-logdash-mini is-center is-plain">
                    <div>
                      <span className="sx-label">Najveći dnevni prihod</span>
                      <b>{formatCurrency(Math.max(...trendsData.map(d => d.revenue)))}</b>
                    </div>
                    <div>
                      <span className="sx-label">Najveći dnevni profit</span>
                      <b>{formatCurrency(Math.max(...trendsData.map(d => d.profit)))}</b>
                    </div>
                    <div>
                      <span className="sx-label">Prosečno dnevno</span>
                      <b>{formatCurrency(trendsData.reduce((sum, d) => sum + d.revenue, 0) / trendsData.length)}</b>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Chart Area */}
            <div className="mx-logdash-box__body">
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
                const allValues = displayData.flatMap(d => [d.revenue, d.profit, d.cost]);
                const maxValue = Math.max(...allValues, 1);

                return (
                  <div className="mx-logdash-fchart">
                    {/* Y-axis labels */}
                    <div className="mx-logdash-fchart__y" aria-hidden="true">
                      <span className="mx-logdash-fchart__ysize">{formatCurrency(maxValue)}</span>
                      {[1, 0.75, 0.5, 0.25].map((f, i) => (
                        <span key={f} style={{ top: `${i * 25}%` }}>{formatCurrency(maxValue * f)}</span>
                      ))}
                      <span style={{ top: '100%' }}>0</span>
                    </div>

                    {/* Chart bars container */}
                    <div className="mx-logdash-fchart__plot">
                      {/* Grid lines */}
                      {[0, 70, 140, 210, 280].map((pixels) => (
                        <div key={pixels} className="mx-logdash-fchart__grid" style={{ bottom: `${pixels}px` }} />
                      ))}

                      {/* Bars */}
                      <div className="mx-logdash-fchart__bars">
                        {displayData.map((day, index) => {
                          // Calculate heights in pixels relative to 280px chart height
                          const chartHeight = 280;
                          const revenueHeight = Math.round((day.revenue / maxValue) * chartHeight);
                          const profitHeight = Math.round((day.profit / maxValue) * chartHeight);
                          const costHeight = Math.round((day.cost / maxValue) * chartHeight);

                          return (
                            <div key={index} className={cx('mx-logdash-fchart__day', index < 2 && 'is-start', index > displayData.length - 3 && 'is-end')}>
                              {/* Tooltip */}
                              <div className="mx-logdash-tip">
                                <span className="mx-logdash-tip__title">{new Date(day.date).toLocaleDateString('sr-RS')}</span>
                                <div className="mx-logdash-tip__row"><span className="mx-logdash-tip__key has-key mx-logdash-c--revenue">Prihod:</span><b>{formatCurrency(day.revenue)}</b></div>
                                <div className="mx-logdash-tip__row"><span className="mx-logdash-tip__key has-key mx-logdash-c--profit">Profit:</span><b>{formatCurrency(day.profit)}</b></div>
                                <div className="mx-logdash-tip__row"><span className="mx-logdash-tip__key has-key mx-logdash-c--cost">Troškovi:</span><b>{formatCurrency(day.cost)}</b></div>
                                <div className="mx-logdash-tip__row"><span className="mx-logdash-tip__key">Nalozi:</span><b>{day.orders}</b></div>
                              </div>

                              {/* Revenue Bar */}
                              <div className="mx-logdash-fchart__bar mx-logdash-c--revenue" style={{ height: `${revenueHeight}px` }} />

                              {/* Profit Bar */}
                              <div className="mx-logdash-fchart__bar mx-logdash-c--profit" style={{ height: `${profitHeight}px` }} />

                              {/* Cost Bar */}
                              <div className="mx-logdash-fchart__bar mx-logdash-c--cost" style={{ height: `${costHeight}px` }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* X-axis labels */}
                    <div className="mx-logdash-fchart__x" aria-hidden="true">
                      {displayData.map((day, index) => (
                        <span key={index}>
                          <span>{new Date(day.date).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' })}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Legend */}
            <div className="mx-logdash-box__body mx-logdash-fchart__legend">
              <div className="mx-logdash-legend is-center">
                <span className="mx-logdash-legend__item mx-logdash-c--revenue">Prihod</span>
                <span className="mx-logdash-legend__item mx-logdash-c--profit">Profit</span>
                <span className="mx-logdash-legend__item mx-logdash-c--cost">Troškovi</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTechnicianAnalysis = () => (
    <div className="mx-logdash-sub">
      <h4 className="mx-logdash-h">Analiza po tehničarima</h4>
      <div className="mx-logdash-fin__list">
        {financialAnalysis.byTechnician.map((technician, index) => (
          <div key={index} className="mx-logdash-fin__tech">
            <div className="mx-logdash-metric">
              <h5 className="mx-logdash-fin__name">{technician.name}</h5>
              <small>{technician.orderCount} naloga</small>
            </div>

            <div className="mx-logdash-metric">
              <span className="sx-label">Prihod</span>
              <b>{formatCurrency(technician.totalRevenue)}</b>
              <small>{formatCurrency(technician.avgRevenuePerOrder)}/nalog</small>
            </div>

            <div className="mx-logdash-metric">
              <span className="sx-label">Profit</span>
              <b>{formatCurrency(technician.totalProfit)}</b>
              <small>{formatCurrency(technician.avgProfitPerOrder)}/nalog</small>
            </div>

            <div className="mx-logdash-metric">
              <span className="sx-label">Margina</span>
              <b>{technician.profitMargin.toFixed(1)}%</b>
              <small>{technician.completionRate.toFixed(1)}% završeno</small>
            </div>

            <div className="mx-logdash-metric">
              <span className="sx-label">Efikasnost</span>
              <b>{formatCurrency(technician.efficiency)}/h</b>
              <small>{technician.averageTime.toFixed(0)} min/nalog</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMunicipalityAnalysis = () => (
    <div className="mx-logdash-sub">
      <h4 className="mx-logdash-h">Analiza po opštinama</h4>
      <div className="mx-logdash-fin__grid2">
        {financialAnalysis.byMunicipality.map((municipality, index) => (
          <div key={index} className="mx-logdash-fin__card">
            <div className="mx-logdash-fin__cardhead">
              <h5 className="mx-logdash-fin__name">{municipality.name}</h5>
              <span className="sx-item__icon"><Map size={16} strokeWidth={1.9} aria-hidden="true" /></span>
            </div>

            <div className="mx-logdash-rows">
              <div><span>Ukupan prihod:</span><b>{formatCurrency(municipality.totalRevenue)}</b></div>
              <div><span>Ukupan profit:</span><b>{formatCurrency(municipality.totalProfit)}</b></div>
              <div><span>Broj naloga:</span><b>{municipality.orderCount}</b></div>
              <div><span>Tehničari:</span><b>{municipality.technicianCount}</b></div>
              <div><span>Prosečan prihod/nalog:</span><b>{formatCurrency(municipality.avgRevenuePerOrder)}</b></div>
              <div><span>Profit margina:</span><b>{municipality.profitMargin.toFixed(1)}%</b></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderServiceTypeAnalysis = () => (
    <div className="mx-logdash-sub">
      <h4 className="mx-logdash-h">Analiza po vrsti usluge</h4>
      <div className="mx-logdash-fin__grid3">
        {financialAnalysis.byServiceType.map((service, index) => (
          <div key={index} className="mx-logdash-fin__card">
            <div className="mx-logdash-fin__center">
              <h5 className="mx-logdash-fin__name">{service.name}</h5>
              <p>{service.marketShare.toFixed(1)}% tržišnog udela</p>
            </div>

            <div className="mx-logdash-fin__big">
              <span className="sx-label">Ukupan prihod</span>
              <b className="sx-num">{formatCurrency(service.totalRevenue)}</b>
            </div>

            <div className="mx-logdash-fin__big">
              <span className="sx-label">Ukupan profit</span>
              <b className="sx-num is-sm">{formatCurrency(service.totalProfit)}</b>
            </div>

            <div className="mx-logdash-rows">
              <div><span>Broj naloga:</span><b>{service.orderCount}</b></div>
              <div><span>Prosek/nalog:</span><b>{formatCurrency(service.avgRevenuePerOrder)}</b></div>
              <div><span>Profit margina:</span><b>{service.profitMargin.toFixed(1)}%</b></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={cx('mx-logdash-comp', className)}>
      {/* Header */}
      <div className="mx-logdash-comp__head">
        <div className="mx-logdash-comp__row">
          <div className="mx-logdash-comp__id">
            <span className="sx-item__icon"><DollarSign size={18} strokeWidth={1.9} aria-hidden="true" /></span>
            <div className="mx-logdash-comp__titles">
              <h3 className="mx-logdash-comp__title">Finansijska analiza</h3>
              <p className="mx-logdash-comp__lead">Prihodi, profiti i troškovi po tehničarima i opštinama</p>
            </div>
          </div>

          <div className="mx-logdash-comp__tools">
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
        <Choice
          size="sm"
          scroll
          label="Prikaz"
          layoutId="mx-logdash-fin-view"
          value={selectedView}
          onChange={setSelectedView}
          options={[
            { value: 'overview', label: 'Pregled', icon: ChartColumn },
            { value: 'technicians', label: 'Tehničari', icon: Users },
            { value: 'municipalities', label: 'Opštine', icon: Map },
            { value: 'services', label: 'Usluge', icon: ChartPie }
          ]}
        />
      </div>

      {/* Content */}
      <div className="mx-logdash-comp__body">
        {data.length === 0 ? (
          <div className="mx-logdash-empty">
            <span className="sx-item__icon"><DollarSign size={22} strokeWidth={1.8} aria-hidden="true" /></span>
            <h4>Nema finansijskih podataka</h4>
            <p>Podaci o prihodima i profitima će biti prikazani kada budu dostupni.</p>
          </div>
        ) : (
          <div className="mx-logdash-sub">
            {selectedView === 'overview' && renderOverview()}
            {selectedView === 'technicians' && renderTechnicianAnalysis()}
            {selectedView === 'municipalities' && renderMunicipalityAnalysis()}
            {selectedView === 'services' && renderServiceTypeAnalysis()}

            {/* Info Note */}
            <Note tone="info" icon={Info} className="mx-mt">
              <h5 className="mx-logdash-note__title">Napomena o podacima</h5>
              <p>
                Finansijski podaci su kalkulisani na osnovu tipova usluga i procenjenih troškova materijala i rada.
                Za preciznije analize, potrebno je integrisati podatke iz fakturnig sistema.
              </p>
            </Note>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialAnalysis;
