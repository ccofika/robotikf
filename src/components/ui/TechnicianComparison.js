import React, { useMemo, useState } from 'react';
import { Users, Award, RefreshCw, Download } from 'lucide-react';
import { cx, Btn, State } from '../../security/sx/ui';
import { Stat } from '../../security/sx/layout';
import { Select, Choice } from '../../security/sx/forms';
import { Loading } from '../../montaza/ui';

const TechnicianComparison = ({
  data = [],
  loading = false,
  error = null,
  timeRange = '30d',
  onTimeRangeChange,
  onRefresh,
  onExport,
  className = ''
}) => {
  const [sortBy, setSortBy] = useState('successRate'); // successRate, speed, satisfaction, profit
  const [sortDirection, setSortDirection] = useState('desc'); // asc, desc
  const [selectedMetric, setSelectedMetric] = useState('all'); // all, performance, financial, satisfaction

  // Helper functions
  const calculateTechnicianMetrics = (data) => {
    const technicianMap = {};

    data.forEach(item => {
      const technicianId = item.technician || item.worker || 'unknown';

      if (!technicianMap[technicianId]) {
        technicianMap[technicianId] = {
          id: technicianId,
          name: technicianId,
          totalOrders: 0,
          completedOrders: 0,
          urgentOrders: 0,
          completedUrgentOrders: 0,
          totalResponseTime: 0,
          totalWorkTime: 0,
          totalRevenue: 0,
          totalCost: 0,
          customerRatings: [],
          serviceTypes: new Set(),
          locations: new Set(),
          workDays: new Set(),
          firstOrderDate: null,
          lastOrderDate: null,
          cancelledOrders: 0,
          reworkOrders: 0
        };
      }

      const technician = technicianMap[technicianId];
      technician.totalOrders++;

      // Track dates
      if (item.timestamp) {
        const orderDate = new Date(item.timestamp);
        if (!isNaN(orderDate.getTime())) {
          const dateStr = orderDate.toISOString().split('T')[0];
          technician.workDays.add(dateStr);

          if (!technician.firstOrderDate || orderDate < technician.firstOrderDate) {
            technician.firstOrderDate = orderDate;
          }
          if (!technician.lastOrderDate || orderDate > technician.lastOrderDate) {
            technician.lastOrderDate = orderDate;
          }
        }
      }

      // Success metrics
      if (item.status === 'completed' || item.completed) {
        technician.completedOrders++;
      }

      if (item.status === 'cancelled' || item.cancelled) {
        technician.cancelledOrders++;
      }

      if (item.rework || item.status === 'rework') {
        technician.reworkOrders++;
      }

      // Urgency handling
      if (item.priority === 'urgent' || item.urgent) {
        technician.urgentOrders++;
        if (item.status === 'completed') {
          technician.completedUrgentOrders++;
        }
      }

      // Time metrics
      const responseTime = item.response_time || item.responseTime || (Math.random() * 120 + 30);
      const workTime = item.work_time || item.duration || (Math.random() * 180 + 60);

      technician.totalResponseTime += responseTime;
      technician.totalWorkTime += workTime;

      // Financial metrics
      const revenue = item.revenue || getDefaultRevenue(item);
      const cost = item.cost || getDefaultCost(item);

      technician.totalRevenue += revenue;
      technician.totalCost += cost;

      // Customer satisfaction (simulated if not available)
      const rating = item.customer_rating || item.rating || (Math.random() * 2 + 3); // 3-5 range
      technician.customerRatings.push(rating);

      // Service tracking
      if (item.service_type || item.type) {
        technician.serviceTypes.add(item.service_type || item.type);
      }

      if (item.location || item.municipality) {
        technician.locations.add(item.location || item.municipality);
      }
    });

    // Calculate derived metrics
    return Object.values(technicianMap).map(tech => {
      const avgResponseTime = tech.totalOrders > 0 ? tech.totalResponseTime / tech.totalOrders : 0;
      const avgWorkTime = tech.totalOrders > 0 ? tech.totalWorkTime / tech.totalOrders : 0;
      const successRate = tech.totalOrders > 0 ? (tech.completedOrders / tech.totalOrders) * 100 : 0;
      const urgentSuccessRate = tech.urgentOrders > 0 ? (tech.completedUrgentOrders / tech.urgentOrders) * 100 : 0;
      const avgSatisfaction = tech.customerRatings.length > 0 ?
        tech.customerRatings.reduce((sum, rating) => sum + rating, 0) / tech.customerRatings.length : 0;
      const totalProfit = tech.totalRevenue - tech.totalCost;
      const profitPerOrder = tech.totalOrders > 0 ? totalProfit / tech.totalOrders : 0;
      const revenuePerOrder = tech.totalOrders > 0 ? tech.totalRevenue / tech.totalOrders : 0;
      const efficiency = avgWorkTime > 0 ? (totalProfit / (avgWorkTime / 60)) : 0; // profit per hour
      const cancelRate = tech.totalOrders > 0 ? (tech.cancelledOrders / tech.totalOrders) * 100 : 0;
      const reworkRate = tech.totalOrders > 0 ? (tech.reworkOrders / tech.totalOrders) * 100 : 0;

      // Experience calculation (days worked)
      const experienceDays = tech.workDays.size;
      const ordersPerDay = experienceDays > 0 ? tech.totalOrders / experienceDays : 0;

      // Speed score (lower response time and work time = higher score)
      const speedScore = Math.max(0, 100 - (avgResponseTime / 10) - (avgWorkTime / 5));

      // Overall performance score
      const performanceScore = (
        (successRate * 0.3) +
        (urgentSuccessRate * 0.2) +
        (avgSatisfaction * 20 * 0.25) + // convert 5-star to 100-point scale
        (speedScore * 0.15) +
        (Math.max(0, 100 - cancelRate) * 0.1)
      );

      return {
        ...tech,
        avgResponseTime,
        avgWorkTime,
        successRate,
        urgentSuccessRate,
        avgSatisfaction,
        totalProfit,
        profitPerOrder,
        revenuePerOrder,
        efficiency,
        cancelRate,
        reworkRate,
        experienceDays,
        ordersPerDay,
        speedScore,
        performanceScore,
        serviceTypeCount: tech.serviceTypes.size,
        locationCount: tech.locations.size,
        specializations: Array.from(tech.serviceTypes),
        territories: Array.from(tech.locations)
      };
    });
  };

  const getDefaultRevenue = (item) => {
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
    const baseCost = getDefaultRevenue(item) * 0.4;
    const materialCost = Math.random() * 500 + 200;
    const laborCost = Math.random() * 800 + 400;
    return baseCost + materialCost + laborCost;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPerformanceBadge = (score) => {
    if (score >= 85) return { label: 'Odličan', tone: 'ok' };
    if (score >= 70) return { label: 'Dobar', tone: 'info' };
    if (score >= 55) return { label: 'Prosečan', tone: 'warn' };
    return { label: 'Treba poboljšanje', tone: 'bad' };
  };

  const getRankIcon = (rank) => {
    if (rank <= 3) return <Award size={18} strokeWidth={1.9} aria-label={`#${rank}`} />;
    return <span>#{rank}</span>;
  };

  // Process technician metrics
  const technicianMetrics = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Check if data is already structured (from API) or needs processing (from logs)
    const isStructuredData = data.length > 0 && data[0].hasOwnProperty('successRate');

    console.log('🔍 TechnicianComparison data analysis:', {
      dataLength: data.length,
      isStructuredData,
      firstItem: data[0],
      hasSuccessRate: data[0]?.hasOwnProperty('successRate'),
      hasTotalEarnings: data[0]?.hasOwnProperty('totalEarnings')
    });

    let metrics;
    if (isStructuredData) {
      // Use data directly from API (already structured)
      metrics = data.map(technician => ({
        ...technician,
        // Map API fields to component expected fields for compatibility
        totalOrders: technician.totalWorkOrders || 0,
        completedOrders: technician.completedWorkOrders || 0,
        urgentOrders: technician.urgentWorkOrders || 0,
        completedUrgentOrders: technician.completedUrgentWorkOrders || 0,
        totalResponseTime: technician.totalResponseTime || 0,
        totalWorkTime: technician.avgResponseTime || 0,
        totalRevenue: technician.totalRevenue || 0,
        totalCost: technician.totalCost || 0,
        customerRatings: [],
        serviceTypes: new Set(Object.keys(technician.serviceTypes || {})),
        locations: new Set(Array.isArray(technician.municipalities) ? technician.municipalities : Object.keys(technician.municipalities || {})),
        workDays: new Set(technician.workDays || []),
        firstOrderDate: technician.firstActivity ? new Date(technician.firstActivity) : null,
        lastOrderDate: technician.lastActivity ? new Date(technician.lastActivity) : null,
        cancelledOrders: technician.cancelledWorkOrders || 0,
        reworkOrders: technician.reworkCount || 0,

        // Performance metrics - use API calculated values
        speedScore: technician.avgResponseTime > 0 ? Math.max(0, 100 - technician.avgResponseTime / 2) : 50,
        satisfactionScore: Math.random() * 30 + 70, // Mock satisfaction since we don't have this data
        profitPerOrder: technician.totalTransactions > 0 ? technician.totalProfit / technician.totalTransactions : 0,
        overallScore: technician.performanceScore || 0,

        // Additional calculated fields
        avgOrdersPerDay: technician.activeDays > 0 ? technician.totalWorkOrders / technician.activeDays : 0,
        completionRate: technician.totalWorkOrders > 0 ? (technician.completedWorkOrders / technician.totalWorkOrders) * 100 : 0,
        activityScore: Math.min(100, (technician.totalActivities || 0) / 10), // Scale activities to 0-100

        // Fix cancel rate calculation
        cancelRate: technician.totalWorkOrders > 0 ? (technician.cancelledWorkOrders / technician.totalWorkOrders) * 100 : 0,

        // Use backend calculated values for profit and efficiency
        totalProfit: technician.totalProfit || 0, // Backend sends technician's actual earnings as their profit
        profitPerOrder: technician.totalTransactions > 0 ? (technician.totalProfit || 0) / technician.totalTransactions : 0,
        efficiency: (technician.avgResponseTime && technician.avgResponseTime > 0) ?
          ((technician.totalProfit || 0) / technician.avgResponseTime) : 0, // Profit per hour (avgResponseTime is in hours)

        // Also calculate minutes per order for display
        avgMinutesPerOrder: technician.avgResponseTimeInMinutes || 0,

        // Trend and ranking
        trend: technician.trend || 'stable',
        rank: technician.rank || 0,

        // Ensure arrays exist - use proper field names for API data
        specializations: technician.serviceTypes ? Object.keys(technician.serviceTypes) : [],
        territories: technician.municipalities ? Object.keys(technician.municipalities) : []
      }));
    } else {
      // Process raw log data (fallback to old behavior)
      metrics = calculateTechnicianMetrics(data);
    }

    // Sort by selected criteria
    return metrics.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'successRate':
          aVal = a.successRate || a.completionRate || 0;
          bVal = b.successRate || b.completionRate || 0;
          break;
        case 'speed':
          aVal = a.speedScore || (a.avgResponseTime ? 100 - a.avgResponseTime / 2 : 50);
          bVal = b.speedScore || (b.avgResponseTime ? 100 - b.avgResponseTime / 2 : 50);
          break;
        case 'totalOrders':
          aVal = a.totalOrders || a.totalWorkOrders || 0;
          bVal = b.totalOrders || b.totalWorkOrders || 0;
          break;
        case 'earnings':
          aVal = a.totalRevenue || a.totalEarnings || 0;
          bVal = b.totalRevenue || b.totalEarnings || 0;
          break;
        case 'performance':
          aVal = a.overallScore || a.performanceScore || 0;
          bVal = b.overallScore || b.performanceScore || 0;
          break;
        case 'profit':
          aVal = a.totalProfit || a.profitGenerated || 0;
          bVal = b.totalProfit || b.profitGenerated || 0;
          break;
        default:
          aVal = a.performanceScore || a.overallScore || 0;
          bVal = b.performanceScore || b.overallScore || 0;
      }

      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [data, sortBy, sortDirection]);

  const handleSort = (criteria) => {
    if (sortBy === criteria) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(criteria);
      setSortDirection('desc');
    }
  };

  if (loading) {
    return (
      <div className={cx('mx-logdash-comp', className)}>
        <Loading rows={5} h={88} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cx('mx-logdash-comp', className)}>
        <div className="mx-logdash-empty is-bad">
          <span className="sx-item__icon"><Users size={22} strokeWidth={1.8} aria-hidden="true" /></span>
          <h4>Greška pri učitavanju poređenja tehničara</h4>
          <p>{error}</p>
          {onRefresh && (
            <Btn size="sm" icon={RefreshCw} onClick={onRefresh}>Pokušaj ponovo</Btn>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cx('mx-logdash-comp', className)}>
      {/* Header */}
      <div className="mx-logdash-comp__head">
        <div className="mx-logdash-comp__row">
          <div className="mx-logdash-comp__id">
            <span className="sx-item__icon"><Users size={18} strokeWidth={1.9} aria-hidden="true" /></span>
            <div className="mx-logdash-comp__titles">
              <h3 className="mx-logdash-comp__title">Poređenje tehničara</h3>
              <p className="mx-logdash-comp__lead">Rangiranje prema performansama, brzini i zadovoljstvu korisnika</p>
            </div>
          </div>

          <div className="mx-logdash-comp__tools">
            {onTimeRangeChange && (
              <Select size="sm" value={timeRange} onChange={(e) => onTimeRangeChange(e.target.value)} aria-label="Period">
                <option value="7d">Poslednja 7 dana</option>
                <option value="30d">Poslednja 30 dana</option>
                <option value="90d">Poslednja 3 meseca</option>
                <option value="180d">Poslednja 6 meseci</option>
                <option value="365d">Poslednja godina</option>
              </Select>
            )}

            <Select size="sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sortiranje">
              <option value="performance">Ukupna ocena</option>
              <option value="successRate">Stopa uspešnosti</option>
              <option value="speed">Brzina rada</option>
              <option value="profit">Profit</option>
            </Select>

            {onExport && (
              <Btn size="sm" icon={Download} onClick={() => onExport(technicianMetrics)}>Export</Btn>
            )}

            {onRefresh && (
              <Btn size="sm" icon={RefreshCw} onClick={onRefresh}>Osvježi</Btn>
            )}
          </div>
        </div>

        {/* Filter Buttons */}
        <Choice
          size="sm"
          scroll
          label="Metrike"
          layoutId="mx-logdash-tech-metric"
          value={selectedMetric}
          onChange={setSelectedMetric}
          options={[
            { value: 'all', label: 'Sve metrike' },
            { value: 'performance', label: 'Performanse' },
            { value: 'financial', label: 'Finansije' }
          ]}
        />
      </div>

      {/* Content */}
      <div className="mx-logdash-comp__body">
        {technicianMetrics.length === 0 ? (
          <div className="mx-logdash-empty">
            <span className="sx-item__icon"><Users size={22} strokeWidth={1.8} aria-hidden="true" /></span>
            <h4>Nema podataka o tehničarima</h4>
            <p>Podaci će biti prikazani kada budu dostupni radni nalozi sa informacijama o tehničarima.</p>
          </div>
        ) : (
          <div className="mx-logdash-sub">
            {/* Summary Stats */}
            <div className="sx-stats">
              <Stat label="Ukupno tehničara" value={technicianMetrics.length} />
              <Stat
                label="Prosečna uspešnost"
                value={`${technicianMetrics.length > 0
                  ? (technicianMetrics.reduce((sum, t) => sum + (t.successRate || 0), 0) / technicianMetrics.length).toFixed(1)
                  : '0.0'
                }%`}
              />
              <Stat
                label="Prosečno naloga/dan"
                value={technicianMetrics.length > 0
                  ? (technicianMetrics.reduce((sum, t) => sum + (t.avgOrdersPerDay || t.ordersPerDay || 0), 0) / technicianMetrics.length).toFixed(1)
                  : '0.0'
                }
              />
              <Stat label="Ukupni troškovi radnika" value={formatCurrency(technicianMetrics.reduce((sum, t) => sum + t.totalProfit, 0))} />
            </div>

            {/* Technician Rankings */}
            <div className="mx-logdash-techs mx-mt">
              {technicianMetrics.map((technician, index) => {
                const rank = index + 1;
                const badge = getPerformanceBadge(technician.performanceScore);

                return (
                  <div key={technician.id} className="mx-logdash-tech">
                    <div className="mx-logdash-tech__head">
                      <span className={cx('mx-logdash-tech__rank', rank === 1 && 'is-top')}>{getRankIcon(rank)}</span>
                      <div className="mx-logdash-tech__who">
                        <h4>{technician.name}</h4>
                        <div className="mx-logdash-tech__meta">
                          <State tone={badge.tone}>{badge.label}</State>
                          <span>{technician.totalOrders} naloga • {technician.experienceDays} dana rada</span>
                        </div>
                      </div>
                      <div className="mx-logdash-tech__score">
                        <b className="sx-num">{(technician.performanceScore || technician.overallScore || 0).toFixed(1)}</b>
                        <span className="sx-label">Ukupna ocena</span>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="mx-logdash-metrics">
                      {(selectedMetric === 'all' || selectedMetric === 'performance') && (
                        <>
                          <div className="mx-logdash-metric">
                            <span className="sx-label">Uspešnost</span>
                            <b>{(technician.successRate || technician.completionRate || 0).toFixed(1)}%</b>
                            <small>{technician.completedOrders}/{technician.totalOrders} završeno</small>
                          </div>

                          <div className="mx-logdash-metric">
                            <span className="sx-label">Brzina</span>
                            <b>{(technician.speedScore || 50).toFixed(1)}</b>
                            <small>{(technician.avgResponseTime || technician.totalWorkTime || 0).toFixed(0)}min odgovor</small>
                          </div>
                        </>
                      )}

                      {(selectedMetric === 'all' || selectedMetric === 'performance') && (
                        <>
                          <div className="mx-logdash-metric">
                            <span className="sx-label">Otkazivanja</span>
                            <b>{(technician.cancelRate || 0).toFixed(1)}%</b>
                            <small>{technician.cancelledOrders} otkazano</small>
                          </div>

                          <div className="mx-logdash-metric">
                            <span className="sx-label">Ukupno aktivnosti</span>
                            <b>{technician.totalActivities || technician.totalOrders || 0}</b>
                            <small>{(technician.avgOrdersPerDay || technician.ordersPerDay || 0).toFixed(1)}/dan</small>
                          </div>
                        </>
                      )}

                      {(selectedMetric === 'all' || selectedMetric === 'financial') && (
                        <>
                          <div className="mx-logdash-metric">
                            <span className="sx-label">Deo profita kompanije</span>
                            <b>{formatCurrency(technician.totalProfit)}</b>
                            <small>{formatCurrency(technician.profitPerOrder)}/nalog</small>
                          </div>

                          <div className="mx-logdash-metric">
                            <span className="sx-label">Efikasnost</span>
                            <b>{formatCurrency(technician.efficiency)}/h</b>
                            <small>{(technician.avgWorkTime || technician.avgResponseTime || 0).toFixed(0)} min/nalog</small>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Territories */}
                    <div className="mx-logdash-tags">
                      <span className="sx-label">Teritorije</span>
                      <div>
                        {(technician.territories || []).slice(0, 5).map((territory, idx) => (
                          <span key={idx} className="sx-tag is-ok">{territory}</span>
                        ))}
                        {(technician.territories || []).length > 5 && (
                          <span className="sx-tag">+{(technician.territories || []).length - 5} više</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicianComparison;
