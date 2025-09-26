import React, { useMemo, useState } from 'react';
import {
  UsersIcon,
  TrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  StarIcon,
  AwardIcon,
  BarChartIcon,
  RefreshIcon,
  DownloadIcon,
  FilterIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '../icons/SvgIcons';
import { Button } from './button-1';
import { cn } from '../../utils/cn';

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

  const getPerformanceColor = (score) => {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-blue-600 bg-blue-50';
    if (score >= 55) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getPerformanceBadge = (score) => {
    if (score >= 85) return { label: 'Odličan', color: 'bg-green-500' };
    if (score >= 70) return { label: 'Dobar', color: 'bg-blue-500' };
    if (score >= 55) return { label: 'Prosečan', color: 'bg-yellow-500' };
    return { label: 'Treba poboljšanje', color: 'bg-red-500' };
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <AwardIcon size={20} className="text-yellow-500" />;
    if (rank === 2) return <AwardIcon size={20} className="text-gray-400" />;
    if (rank === 3) return <AwardIcon size={20} className="text-orange-600" />;
    return <span className="text-lg font-bold text-slate-400">#{rank}</span>;
  };

  // Process technician metrics
  const technicianMetrics = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Check if data is already structured (from API) or needs processing (from logs)
    const isStructuredData = data.length > 0 && data[0].hasOwnProperty('successRate');

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
        totalRevenue: technician.totalEarnings || 0,
        totalCost: technician.totalEarnings ? technician.totalEarnings * 0.4 : 0, // Estimate cost
        customerRatings: [],
        serviceTypes: new Set(Object.keys(technician.serviceTypes || {})),
        locations: new Set(Object.keys(technician.municipalities || {})),
        workDays: new Set(technician.workDays || []),
        firstOrderDate: technician.firstActivity ? new Date(technician.firstActivity) : null,
        lastOrderDate: technician.lastActivity ? new Date(technician.lastActivity) : null,
        cancelledOrders: technician.cancelledWorkOrders || 0,
        reworkOrders: technician.reworkCount || 0,

        // Performance metrics - use API calculated values
        speedScore: technician.avgResponseTime > 0 ? Math.max(0, 100 - technician.avgResponseTime / 2) : 50,
        satisfactionScore: Math.random() * 30 + 70, // Mock satisfaction since we don't have this data
        profitPerOrder: technician.totalTransactions > 0 ? technician.totalEarnings / technician.totalTransactions : 0,
        overallScore: technician.performanceScore || 0,

        // Additional calculated fields
        avgOrdersPerDay: technician.activeDays > 0 ? technician.totalWorkOrders / technician.activeDays : 0,
        completionRate: technician.totalWorkOrders > 0 ? (technician.completedWorkOrders / technician.totalWorkOrders) * 100 : 0,
        activityScore: Math.min(100, (technician.totalActivities || 0) / 10), // Scale activities to 0-100

        // Fix cancel rate calculation
        cancelRate: technician.totalWorkOrders > 0 ? (technician.cancelledWorkOrders / technician.totalWorkOrders) * 100 : 0,

        // Fix profit and efficiency calculations
        totalProfit: (technician.totalEarnings || 0) - (technician.totalEarnings ? technician.totalEarnings * 0.4 : 0),
        profitPerOrder: technician.totalTransactions > 0 ? (technician.totalEarnings || 0) / technician.totalTransactions : 0,
        efficiency: (technician.avgResponseTime && technician.avgResponseTime > 0) ?
          ((technician.totalEarnings || 0) / (technician.avgResponseTime / 60)) : 0,

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
      <div className={cn("bg-white rounded-xl border border-slate-200 p-6", className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("bg-white rounded-xl border border-red-200 p-6", className)}>
        <div className="text-center">
          <UsersIcon size={48} className="text-red-400 mb-4 mx-auto" />
          <h4 className="text-lg font-semibold text-slate-900 mb-2">Greška pri učitavanju poređenja tehničara</h4>
          <p className="text-slate-600 mb-4">{error}</p>
          {onRefresh && (
            <Button type="secondary" size="small" onClick={onRefresh} prefix={<RefreshIcon size={16} />}>
              Pokušaj ponovo
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <UsersIcon size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Poređenje tehničara</h3>
              <p className="text-slate-600 mt-1">Rangiranje prema performansama, brzini i zadovoljstvu korisnika</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {onTimeRangeChange && (
              <select
                value={timeRange}
                onChange={(e) => onTimeRangeChange(e.target.value)}
                className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="7d">Poslednja 7 dana</option>
                <option value="30d">Poslednja 30 dana</option>
                <option value="90d">Poslednja 3 meseca</option>
                <option value="180d">Poslednja 6 meseci</option>
              </select>
            )}

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="performance">Ukupna ocena</option>
              <option value="successRate">Stopa uspešnosti</option>
              <option value="speed">Brzina rada</option>
              <option value="profit">Profit</option>
            </select>

            {onExport && (
              <Button
                type="secondary"
                size="small"
                onClick={() => onExport(technicianMetrics)}
                prefix={<DownloadIcon size={16} />}
              >
                Export
              </Button>
            )}

            {onRefresh && (
              <Button
                type="secondary"
                size="small"
                onClick={onRefresh}
                prefix={<RefreshIcon size={16} />}
              >
                Osvježi
              </Button>
            )}
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center space-x-2 mt-4">
          {[
            { id: 'all', label: 'Sve metrike' },
            { id: 'performance', label: 'Performanse' },
            { id: 'financial', label: 'Finansije' }
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSelectedMetric(id)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                selectedMetric === id
                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {technicianMetrics.length === 0 ? (
          <div className="text-center py-8">
            <UsersIcon size={48} className="text-slate-400 mb-4 mx-auto" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Nema podataka o tehničarima</h4>
            <p className="text-slate-600">Podaci će biti prikazani kada budu dostupni radni nalozi sa informacijama o tehničarima.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Ukupno tehničara</p>
                    <h3 className="text-2xl font-bold text-slate-900">{technicianMetrics.length}</h3>
                  </div>
                  <UsersIcon size={20} className="text-blue-600" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Prosečna uspešnost</p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {technicianMetrics.length > 0
                        ? (technicianMetrics.reduce((sum, t) => sum + (t.successRate || 0), 0) / technicianMetrics.length).toFixed(1)
                        : '0.0'
                      }%
                    </h3>
                  </div>
                  <CheckCircleIcon size={20} className="text-green-600" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-orange-600 uppercase tracking-wider">Prosečno naloga/dan</p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {technicianMetrics.length > 0
                        ? (technicianMetrics.reduce((sum, t) => sum + (t.avgOrdersPerDay || t.ordersPerDay || 0), 0) / technicianMetrics.length).toFixed(1)
                        : '0.0'
                      }
                    </h3>
                  </div>
                  <BarChartIcon size={20} className="text-orange-600" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Ukupan profit</p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {formatCurrency(technicianMetrics.reduce((sum, t) => sum + t.totalProfit, 0))}
                    </h3>
                  </div>
                  <TrendingUpIcon size={20} className="text-purple-600" />
                </div>
              </div>
            </div>

            {/* Technician Rankings */}
            {technicianMetrics.map((technician, index) => {
              const rank = index + 1;
              const badge = getPerformanceBadge(technician.performanceScore);

              return (
                <div
                  key={technician.id}
                  className="bg-slate-50 rounded-xl p-6 border border-slate-200 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-white rounded-xl border-2 border-slate-200">
                        {getRankIcon(rank)}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">{technician.name}</h4>
                        <div className="flex items-center space-x-3 mt-1">
                          <div className={cn("px-2 py-1 rounded-full text-xs font-medium text-white", badge.color)}>
                            {badge.label}
                          </div>
                          <span className="text-sm text-slate-500">
                            {technician.totalOrders} naloga • {technician.experienceDays} dana rada
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={cn("text-3xl font-bold", getPerformanceColor(technician.performanceScore || technician.overallScore || 0))}>
                        {(technician.performanceScore || technician.overallScore || 0).toFixed(1)}
                      </div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Ukupna ocena</p>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(selectedMetric === 'all' || selectedMetric === 'performance') && (
                      <>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Uspešnost</p>
                          <p className="text-lg font-semibold text-green-600">
                            {(technician.successRate || technician.completionRate || 0).toFixed(1)}%
                          </p>
                          <p className="text-xs text-slate-400">
                            {technician.completedOrders}/{technician.totalOrders} završeno
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Brzina</p>
                          <p className="text-lg font-semibold text-blue-600">
                            {(technician.speedScore || 50).toFixed(1)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {(technician.avgResponseTime || technician.totalWorkTime || 0).toFixed(0)}min odgovor
                          </p>
                        </div>
                      </>
                    )}

                    {(selectedMetric === 'all' || selectedMetric === 'performance') && (
                      <>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Otkazivanja</p>
                          <p className="text-lg font-semibold text-red-600">
                            {(technician.cancelRate || 0).toFixed(1)}%
                          </p>
                          <p className="text-xs text-slate-400">
                            {technician.cancelledOrders} otkazano
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Ukupno aktivnosti</p>
                          <p className="text-lg font-semibold text-blue-600">
                            {technician.totalActivities || technician.totalOrders || 0}
                          </p>
                          <p className="text-xs text-slate-400">
                            {(technician.avgOrdersPerDay || technician.ordersPerDay || 0).toFixed(1)}/dan
                          </p>
                        </div>
                      </>
                    )}

                    {(selectedMetric === 'all' || selectedMetric === 'financial') && (
                      <>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Ukupan profit</p>
                          <p className="text-lg font-semibold text-purple-600">
                            {formatCurrency(technician.totalProfit)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatCurrency(technician.profitPerOrder)}/nalog
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Efikasnost</p>
                          <p className="text-lg font-semibold text-orange-600">
                            {formatCurrency(technician.efficiency)}/h
                          </p>
                          <p className="text-xs text-slate-400">
                            {(technician.avgWorkTime || technician.avgResponseTime || 0).toFixed(0)} min/nalog
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Territories */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Teritorije</p>
                      <div className="flex flex-wrap gap-1">
                        {(technician.territories || []).slice(0, 5).map((territory, idx) => (
                          <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            {territory}
                          </span>
                        ))}
                        {(technician.territories || []).length > 5 && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                            +{(technician.territories || []).length - 5} više
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicianComparison;