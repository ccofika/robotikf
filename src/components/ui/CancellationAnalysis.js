import React, { useState, useMemo } from 'react';
import {
  CloseIcon,
  BarChartIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  UserIcon,
  ClockIcon,
  MapPinIcon,
  FilterIcon,
  RefreshIcon,
  DownloadIcon
} from '../icons/SvgIcons';
import { Button } from './button-1';
import { cn } from '../../utils/cn';

const CancellationAnalysis = ({
  data = [],
  loading = false,
  error = null,
  timeRange = '30d',
  onTimeRangeChange,
  onRefresh,
  onExport,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('count');

  // Helper functions
  const calculateTrends = (data) => {
    // Group data by date for trend analysis
    const dateGroups = data.reduce((acc, item) => {
      const date = new Date(item.timestamp).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = 0;
      acc[date]++;
      return acc;
    }, {});

    return Object.entries(dateGroups).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const calculatePeakHours = (data) => {
    const hourGroups = data.reduce((acc, item) => {
      const hour = new Date(item.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const sortedHours = Object.entries(hourGroups)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    return sortedHours.map(([hour, count]) => `${hour}:00 (${count})`).join(', ');
  };

  // Process and analyze cancellation data
  const analysisData = useMemo(() => {
    if (!data.length) return { reasons: [], trends: [], statistics: {} };

    // Group by cancellation reasons
    const reasonGroups = data.reduce((acc, item) => {
      const reason = item.cancellationReason || 'Nespecifikovano';
      if (!acc[reason]) {
        acc[reason] = {
          reason,
          count: 0,
          percentage: 0,
          trend: 0,
          locations: new Set(),
          technicians: new Set(),
          avgResponseTime: 0,
          totalResponseTime: 0,
          recentIncidents: []
        };
      }

      acc[reason].count++;
      acc[reason].locations.add(item.municipality);
      acc[reason].technicians.add(item.technician);
      acc[reason].totalResponseTime += item.responseTime || 0;

      // Track recent incidents (last 7 days)
      const incidentDate = new Date(item.timestamp);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      if (incidentDate >= sevenDaysAgo) {
        acc[reason].recentIncidents.push(item);
      }

      return acc;
    }, {});

    // Calculate percentages and averages
    const totalCancellations = data.length;
    const reasonsArray = Object.values(reasonGroups).map(group => ({
      ...group,
      percentage: (group.count / totalCancellations) * 100,
      avgResponseTime: group.totalResponseTime / group.count,
      locations: Array.from(group.locations),
      technicians: Array.from(group.technicians),
      trend: group.recentIncidents.length / Math.max(group.count - group.recentIncidents.length, 1) - 1 // Trend calculation
    }));

    // Sort reasons
    reasonsArray.sort((a, b) => {
      switch (sortBy) {
        case 'count':
          return b.count - a.count;
        case 'percentage':
          return b.percentage - a.percentage;
        case 'trend':
          return b.trend - a.trend;
        case 'avgResponseTime':
          return b.avgResponseTime - a.avgResponseTime;
        default:
          return a.reason.localeCompare(b.reason);
      }
    });

    // Calculate trends over time
    const trends = calculateTrends(data);

    // Overall statistics
    const statistics = {
      totalCancellations,
      avgCancellationRate: (totalCancellations / Math.max(data.length, 1)) * 100,
      mostCommonReason: reasonsArray[0]?.reason || 'N/A',
      avgResponseTime: data.reduce((sum, item) => sum + (item.responseTime || 0), 0) / data.length || 0,
      affectedMunicipalities: new Set(data.map(item => item.municipality)).size,
      peakHours: calculatePeakHours(data)
    };

    return {
      reasons: reasonsArray,
      trends,
      statistics
    };
  }, [data, sortBy]);

  const getReasonColor = (index) => {
    const colors = [
      'bg-red-100 border-red-300 text-red-800',
      'bg-orange-100 border-orange-300 text-orange-800',
      'bg-yellow-100 border-yellow-300 text-yellow-800',
      'bg-blue-100 border-blue-300 text-blue-800',
      'bg-purple-100 border-purple-300 text-purple-800',
      'bg-green-100 border-green-300 text-green-800',
      'bg-indigo-100 border-indigo-300 text-indigo-800',
      'bg-pink-100 border-pink-300 text-pink-800'
    ];
    return colors[index % colors.length];
  };

  const getTrendIcon = (trend) => {
    if (trend > 0.1) return <TrendingUpIcon size={16} className="text-red-600" />;
    if (trend < -0.1) return <TrendingUpIcon size={16} className="text-green-600 rotate-180" />;
    return <ClockIcon size={16} className="text-slate-600" />;
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    return `${Math.round(minutes / 60 * 10) / 10}h`;
  };

  if (loading) {
    return (
      <div className={cn("bg-white rounded-xl border border-slate-200 p-6", className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-slate-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
                <div className="h-8 w-16 bg-slate-200 rounded"></div>
              </div>
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
          <AlertTriangleIcon size={48} className="text-red-400 mb-4 mx-auto" />
          <h4 className="text-lg font-semibold text-slate-900 mb-2">Greška pri učitavanju</h4>
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
            <div className="p-2 bg-red-50 rounded-lg">
              <CloseIcon size={20} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Analiza uzroka otkazivanja</h3>
              <p className="text-slate-600 mt-1">Najčešći razlozi otkazivanja radnih naloga</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {onTimeRangeChange && (
              <select
                value={timeRange}
                onChange={(e) => onTimeRangeChange(e.target.value)}
                className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none"
              >
                <option value="7d">Poslednja 7 dana</option>
                <option value="30d">Poslednja 30 dana</option>
                <option value="90d">Poslednja 3 meseca</option>
                <option value="180d">Poslednja 6 meseci</option>
                <option value="365d">Poslednja godina</option>
              </select>
            )}

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none"
            >
              <option value="count">Po broju slučajeva</option>
              <option value="percentage">Po procentu</option>
              <option value="trend">Po trendu</option>
              <option value="avgResponseTime">Po vremenu odgovora</option>
            </select>

            {onExport && (
              <Button
                type="secondary"
                size="small"
                onClick={() => onExport(analysisData)}
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
      </div>

      {/* Statistics Overview */}
      <div className="p-6 border-b border-slate-200 bg-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{analysisData.statistics.totalCancellations}</div>
            <div className="text-sm text-slate-600">Ukupno otkazanih</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{analysisData.statistics.mostCommonReason}</div>
            <div className="text-sm text-slate-600">Najčešći razlog</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{formatTime(analysisData.statistics.avgResponseTime)}</div>
            <div className="text-sm text-slate-600">Prosečno vreme</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{analysisData.statistics.affectedMunicipalities}</div>
            <div className="text-sm text-slate-600">Pogođene opštine</div>
          </div>
        </div>
      </div>

      {/* Reasons List */}
      <div className="p-6">
        {analysisData.reasons.length === 0 ? (
          <div className="text-center py-8">
            <BarChartIcon size={48} className="text-slate-400 mb-4 mx-auto" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Nema podataka</h4>
            <p className="text-slate-600">Nema otkazanih naloga za izabrani period.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {analysisData.reasons.map((reason, index) => (
              <div
                key={reason.reason}
                className={cn(
                  "border rounded-xl p-4 transition-all duration-200",
                  getReasonColor(index)
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-semibold">{reason.reason}</span>
                      {getTrendIcon(reason.trend)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{reason.count}</div>
                    <div className="text-sm opacity-75">{reason.percentage.toFixed(1)}%</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/50 rounded-full h-3 mb-3">
                  <div
                    className="bg-current h-3 rounded-full opacity-60 transition-all duration-500"
                    style={{ width: `${reason.percentage}%` }}
                  ></div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm opacity-90">
                  <div className="flex items-center space-x-2">
                    <UserIcon size={14} />
                    <span>{reason.technicians.length} tehničara</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPinIcon size={14} />
                    <span>{reason.locations.length} opština</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ClockIcon size={14} />
                    <span>{formatTime(reason.avgResponseTime)} prosek</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUpIcon size={14} />
                    <span>
                      {reason.trend > 0 ? '+' : ''}{(reason.trend * 100).toFixed(1)}% trend
                    </span>
                  </div>
                </div>

                {/* Recent incidents count */}
                {reason.recentIncidents.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-current/20">
                    <span className="text-sm font-medium">
                      {reason.recentIncidents.length} slučajeva u poslednjih 7 dana
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Peak Hours Info */}
      {analysisData.statistics.peakHours && (
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center">
            <ClockIcon size={16} className="mr-2 text-slate-600" />
            Kritična vremena za otkazivanja
          </h4>
          <p className="text-sm text-slate-600">
            Najveći broj otkazivanja se dešava u: {analysisData.statistics.peakHours}
          </p>
        </div>
      )}
    </div>
  );
};

export default CancellationAnalysis;