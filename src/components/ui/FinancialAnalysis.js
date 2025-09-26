import React, { useMemo, useState } from 'react';
import {
  DollarSignIcon,
  TrendingUpIcon,
  BarChartIcon,
  PieChartIcon,
  UsersIcon,
  MapIcon,
  RefreshIcon,
  DownloadIcon,
  FilterIcon,
  InfoIcon
} from '../icons/SvgIcons';
import { Button } from './button-1';
import { cn } from '../../utils/cn';

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
      <div className={cn("bg-white rounded-xl border border-slate-200 p-6", className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 rounded"></div>
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
          <DollarSignIcon size={48} className="text-red-400 mb-4 mx-auto" />
          <h4 className="text-lg font-semibold text-slate-900 mb-2">Greška pri učitavanju finansijske analize</h4>
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

  const renderOverview = () => (
    <div>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Ukupan prihod</p>
              <h3 className="text-2xl font-bold text-slate-900 tabular-nums">
                {formatCurrency(financialAnalysis.overview.totalRevenue)}
              </h3>
              <p className="text-xs text-green-700">
                {formatCurrency(financialAnalysis.overview.avgRevenuePerOrder)} po nalogu
              </p>
            </div>
            <div className="p-2 bg-green-200 rounded-lg">
              <DollarSignIcon size={20} className="text-green-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Ukupan profit</p>
              <h3 className="text-2xl font-bold text-slate-900 tabular-nums">
                {formatCurrency(financialAnalysis.overview.totalProfit)}
              </h3>
              <p className="text-xs text-blue-700">
                {formatCurrency(financialAnalysis.overview.avgProfitPerOrder)} po nalogu
              </p>
            </div>
            <div className="p-2 bg-blue-200 rounded-lg">
              <TrendingUpIcon size={20} className="text-blue-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Profit margina</p>
              <h3 className="text-2xl font-bold text-slate-900 tabular-nums">
                {financialAnalysis.overview.profitMargin.toFixed(1)}%
              </h3>
              <p className="text-xs text-purple-700">
                {financialAnalysis.overview.profitMargin > 20 ? 'Odličan' :
                 financialAnalysis.overview.profitMargin > 10 ? 'Dobar' : 'Treba poboljšati'}
              </p>
            </div>
            <div className="p-2 bg-purple-200 rounded-lg">
              <PieChartIcon size={20} className="text-purple-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-600 uppercase tracking-wider">Ukupni troškovi</p>
              <h3 className="text-2xl font-bold text-slate-900 tabular-nums">
                {formatCurrency(financialAnalysis.overview.totalCost)}
              </h3>
              <p className="text-xs text-orange-700">
                {((financialAnalysis.overview.totalCost / financialAnalysis.overview.totalRevenue) * 100).toFixed(1)}% od prihoda
              </p>
            </div>
            <div className="p-2 bg-orange-200 rounded-lg">
              <BarChartIcon size={20} className="text-orange-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Financial Trend Chart */}
      {(financialAnalysis.trends.length > 0 || true) && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-slate-900">Finansijski trend</h4>
            <div className="flex items-center space-x-2">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="h-8 px-3 pr-8 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
              >
                <option value="daily">Dnevno</option>
                <option value="weekly">Nedeljno</option>
                <option value="monthly">Mesečno</option>
              </select>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Chart Header with Stats */}
            <div className="p-4 border-b border-slate-200 bg-white">
              <div className="grid grid-cols-3 gap-4">
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
                    <>
                      <div className="text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Najveći dnevni prihod</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(Math.max(...trendsData.map(d => d.revenue)))}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Najveći dnevni profit</p>
                        <p className="text-lg font-bold text-blue-600">
                          {formatCurrency(Math.max(...trendsData.map(d => d.profit)))}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Prosečno dnevno</p>
                        <p className="text-lg font-bold text-purple-600">
                          {formatCurrency(trendsData.reduce((sum, d) => sum + d.revenue, 0) / trendsData.length)}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Chart Area - Simplified CSS Grid Approach */}
            <div className="p-6">
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
                  <div className="bg-white rounded-lg border border-slate-200" style={{ height: '400px' }}>
                    {/* Chart Grid Container */}
                    <div className="relative p-4" style={{ height: '400px' }}>
                      {/* Y-axis labels */}
                      <div className="absolute left-0 top-4 w-16 text-xs text-slate-500" style={{ height: '280px' }}>
                        <div className="relative h-full flex flex-col justify-between">
                          <span>{formatCurrency(maxValue)}</span>
                          <span>{formatCurrency(maxValue * 0.75)}</span>
                          <span>{formatCurrency(maxValue * 0.5)}</span>
                          <span>{formatCurrency(maxValue * 0.25)}</span>
                          <span>0</span>
                        </div>
                      </div>

                      {/* Chart bars container */}
                      <div className="ml-20 mr-4 relative" style={{ height: '280px' }}>
                        {/* Grid lines */}
                        <div className="absolute inset-0">
                          {[0, 70, 140, 210, 280].map((pixels, index) => (
                            <div
                              key={pixels}
                              className="absolute left-0 right-0 border-t border-slate-100"
                              style={{ bottom: `${pixels}px` }}
                            />
                          ))}
                        </div>

                        {/* Bars */}
                        <div className="absolute inset-0 flex items-end justify-between" style={{ height: '280px' }}>
                          {displayData.map((day, index) => {
                            // Calculate heights in pixels relative to 280px chart height
                            const chartHeight = 280;
                            const revenueHeight = Math.round((day.revenue / maxValue) * chartHeight);
                            const profitHeight = Math.round((day.profit / maxValue) * chartHeight);
                            const costHeight = Math.round((day.cost / maxValue) * chartHeight);

                            return (
                              <div key={index} className="flex items-end space-x-1 group cursor-pointer relative">
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20 whitespace-nowrap shadow-lg">
                                  <div className="font-semibold">{new Date(day.date).toLocaleDateString('sr-RS')}</div>
                                  <div className="text-green-300">Prihod: {formatCurrency(day.revenue)}</div>
                                  <div className="text-blue-300">Profit: {formatCurrency(day.profit)}</div>
                                  <div className="text-red-300">Troškovi: {formatCurrency(day.cost)}</div>
                                  <div className="text-slate-300">Nalozi: {day.orders}</div>
                                </div>

                                {/* Revenue Bar */}
                                <div
                                  className="w-4 bg-gradient-to-t from-green-600 to-green-400 rounded-t hover:from-green-700 hover:to-green-500 transition-colors duration-200"
                                  style={{
                                    height: `${revenueHeight}px`
                                  }}
                                />

                                {/* Profit Bar */}
                                <div
                                  className="w-4 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t hover:from-blue-700 hover:to-blue-500 transition-colors duration-200"
                                  style={{
                                    height: `${profitHeight}px`
                                  }}
                                />

                                {/* Cost Bar */}
                                <div
                                  className="w-4 bg-gradient-to-t from-red-600 to-red-400 rounded-t hover:from-red-700 hover:to-red-500 transition-colors duration-200"
                                  style={{
                                    height: `${costHeight}px`
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* X-axis labels */}
                        <div className="absolute bottom-0 left-0 right-0 -mb-8 flex justify-between text-xs text-slate-500">
                          {displayData.map((day, index) => (
                            <span key={index} className="transform -rotate-45 origin-bottom-left w-12">
                              {new Date(day.date).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' })}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Legend */}
            <div className="px-6 pb-4">
              <div className="flex justify-center space-x-8">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gradient-to-t from-green-600 to-green-400 rounded shadow-sm"></div>
                  <span className="text-sm font-medium text-slate-700">Prihod</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gradient-to-t from-blue-600 to-blue-400 rounded shadow-sm"></div>
                  <span className="text-sm font-medium text-slate-700">Profit</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gradient-to-t from-red-600 to-red-400 rounded shadow-sm"></div>
                  <span className="text-sm font-medium text-slate-700">Troškovi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTechnicianAnalysis = () => (
    <div>
      <h4 className="text-lg font-semibold text-slate-900 mb-4">Analiza po tehničarima</h4>
      <div className="space-y-4">
        {financialAnalysis.byTechnician.map((technician, index) => (
          <div key={index} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <h5 className="font-semibold text-slate-900">{technician.name}</h5>
                <p className="text-sm text-slate-600">{technician.orderCount} naloga</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase">Prihod</p>
                <p className="font-semibold text-green-600">
                  {formatCurrency(technician.totalRevenue)}
                </p>
                <p className="text-xs text-slate-500">
                  {formatCurrency(technician.avgRevenuePerOrder)}/nalog
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase">Profit</p>
                <p className="font-semibold text-blue-600">
                  {formatCurrency(technician.totalProfit)}
                </p>
                <p className="text-xs text-slate-500">
                  {formatCurrency(technician.avgProfitPerOrder)}/nalog
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase">Margina</p>
                <p className="font-semibold text-purple-600">
                  {technician.profitMargin.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500">
                  {technician.completionRate.toFixed(1)}% završeno
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase">Efikasnost</p>
                <p className="font-semibold text-orange-600">
                  {formatCurrency(technician.efficiency)}/h
                </p>
                <p className="text-xs text-slate-500">
                  {technician.averageTime.toFixed(0)} min/nalog
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMunicipalityAnalysis = () => (
    <div>
      <h4 className="text-lg font-semibold text-slate-900 mb-4">Analiza po opštinama</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {financialAnalysis.byMunicipality.map((municipality, index) => (
          <div key={index} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold text-slate-900">{municipality.name}</h5>
              <div className="p-2 bg-slate-200 rounded-lg">
                <MapIcon size={16} className="text-slate-600" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Ukupan prihod:</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(municipality.totalRevenue)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Ukupan profit:</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(municipality.totalProfit)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Broj naloga:</span>
                <span className="font-semibold">{municipality.orderCount}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tehničari:</span>
                <span className="font-semibold">{municipality.technicianCount}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Prosečan prihod/nalog:</span>
                <span className="font-semibold">
                  {formatCurrency(municipality.avgRevenuePerOrder)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Profit margina:</span>
                <span className="font-semibold text-purple-600">
                  {municipality.profitMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderServiceTypeAnalysis = () => (
    <div>
      <h4 className="text-lg font-semibold text-slate-900 mb-4">Analiza po vrsti usluge</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {financialAnalysis.byServiceType.map((service, index) => (
          <div key={index} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="text-center mb-4">
              <h5 className="font-semibold text-slate-900 text-lg">{service.name}</h5>
              <p className="text-sm text-slate-600">{service.marketShare.toFixed(1)}% tržišnog udela</p>
            </div>

            <div className="space-y-3">
              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase">Ukupan prihod</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(service.totalRevenue)}
                </p>
              </div>

              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase">Ukupan profit</p>
                <p className="text-lg font-semibold text-blue-600">
                  {formatCurrency(service.totalProfit)}
                </p>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Broj naloga:</span>
                <span className="font-semibold">{service.orderCount}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Prosek/nalog:</span>
                <span className="font-semibold">
                  {formatCurrency(service.avgRevenuePerOrder)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Profit margina:</span>
                <span className="font-semibold text-purple-600">
                  {service.profitMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSignIcon size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Finansijska analiza</h3>
              <p className="text-slate-600 mt-1">Prihodi, profiti i troškovi po tehničarima i opštinama</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {onTimeRangeChange && (
              <select
                value={timeRange}
                onChange={(e) => onTimeRangeChange(e.target.value)}
                className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
              >
                <option value="7d">Poslednja 7 dana</option>
                <option value="30d">Poslednja 30 dana</option>
                <option value="90d">Poslednja 3 meseca</option>
                <option value="180d">Poslednja 6 meseci</option>
              </select>
            )}

            {onExport && (
              <Button
                type="secondary"
                size="small"
                onClick={() => onExport(financialAnalysis)}
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

        {/* View Selection */}
        <div className="flex items-center space-x-2 mt-4">
          {[
            { id: 'overview', label: 'Pregled', icon: BarChartIcon },
            { id: 'technicians', label: 'Tehničari', icon: UsersIcon },
            { id: 'municipalities', label: 'Opštine', icon: MapIcon },
            { id: 'services', label: 'Usluge', icon: PieChartIcon }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedView(id)}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                selectedView === id
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {data.length === 0 ? (
          <div className="text-center py-8">
            <DollarSignIcon size={48} className="text-slate-400 mb-4 mx-auto" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Nema finansijskih podataka</h4>
            <p className="text-slate-600">Podaci o prihodima i profitima će biti prikazani kada budu dostupni.</p>
          </div>
        ) : (
          <div>
            {selectedView === 'overview' && renderOverview()}
            {selectedView === 'technicians' && renderTechnicianAnalysis()}
            {selectedView === 'municipalities' && renderMunicipalityAnalysis()}
            {selectedView === 'services' && renderServiceTypeAnalysis()}

            {/* Info Note */}
            <div className="mt-8 bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-start space-x-3">
                <InfoIcon size={20} className="text-blue-600 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-blue-900 mb-1">Napomena o podacima</h5>
                  <p className="text-sm text-blue-800">
                    Finansijski podaci su kalkulisani na osnovu tipova usluga i procenjenih troškova materijala i rada.
                    Za preciznije analize, potrebno je integrisati podatke iz fakturnig sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialAnalysis;