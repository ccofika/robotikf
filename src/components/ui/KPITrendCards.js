import React from 'react';
import {
  TrendingUpIcon,
  ChevronDownIcon,
  MinusIcon,
  ChartIcon,
  UsersIcon,
  ClockIcon,
  CheckIcon,
  CloseIcon,
  AlertTriangleIcon
} from '../icons/SvgIcons';
import { cn } from '../../utils/cn';

const KPITrendCards = ({
  kpiData = [],
  loading = false,
  comparisonEnabled = false,
  className = ''
}) => {
  if (loading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
              <div className="w-16 h-4 bg-slate-200 rounded"></div>
            </div>
            <div className="w-24 h-8 bg-slate-200 rounded mb-2"></div>
            <div className="w-20 h-3 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const formatValue = (value, format = 'number') => {
    if (value === null || value === undefined) return 'N/A';

    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `${value.toLocaleString('sr-RS', { style: 'currency', currency: 'RSD' })}`;
      case 'time':
        return `${value.toFixed(1)}h`;
      case 'large_number':
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
          return `${(value / 1000).toFixed(1)}K`;
        }
        return value.toFixed(0);
      default:
        return value.toLocaleString('sr-RS');
    }
  };

  const getTrendIcon = (trend, size = 16) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon size={size} className="text-green-600" />;
      case 'down':
        return <ChevronDownIcon size={size} className="text-red-600" />;
      default:
        return <MinusIcon size={size} className="text-slate-600" />;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getKPIIcon = (type) => {
    const iconMap = {
      'total_work_orders': ChartIcon,
      'completion_rate': CheckIcon,
      'average_time': ClockIcon,
      'technician_count': UsersIcon,
      'failed_orders': CloseIcon,
      'urgent_orders': AlertTriangleIcon,
      'revenue': ChartIcon,
      'customer_satisfaction': CheckIcon
    };

    const IconComponent = iconMap[type] || ChartIcon;
    return IconComponent;
  };

  const getCardColor = (type, trend) => {
    const colorMap = {
      'total_work_orders': 'from-blue-50 to-blue-100/50 border-blue-200',
      'completion_rate': trend === 'up' ? 'from-green-50 to-green-100/50 border-green-200' : 'from-orange-50 to-orange-100/50 border-orange-200',
      'average_time': trend === 'down' ? 'from-green-50 to-green-100/50 border-green-200' : 'from-red-50 to-red-100/50 border-red-200',
      'technician_count': 'from-purple-50 to-purple-100/50 border-purple-200',
      'failed_orders': 'from-red-50 to-red-100/50 border-red-200',
      'urgent_orders': 'from-orange-50 to-orange-100/50 border-orange-200',
      'revenue': 'from-green-50 to-green-100/50 border-green-200',
      'customer_satisfaction': 'from-blue-50 to-blue-100/50 border-blue-200'
    };

    return colorMap[type] || 'from-slate-50 to-slate-100/50 border-slate-200';
  };

  if (!kpiData.length) {
    return (
      <div className={cn("p-8 text-center", className)}>
        <ChartIcon size={48} className="text-slate-400 mb-4 mx-auto" />
        <h4 className="text-lg font-semibold text-slate-900 mb-2">Nema KPI podataka</h4>
        <p className="text-slate-600">Podaci nisu dostupni za izabrani period.</p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {kpiData.map((kpi, index) => {
        const IconComponent = getKPIIcon(kpi.type);
        const cardColorClass = getCardColor(kpi.type, kpi.trend);

        return (
          <div
            key={kpi.type || index}
            className={cn(
              "bg-gradient-to-br rounded-xl border shadow-sm p-4 transition-all duration-200 hover:shadow-md",
              cardColorClass
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-white/80 rounded-lg">
                  <IconComponent size={20} className="text-slate-700" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {kpi.label}
                  </h4>
                </div>
              </div>

              {comparisonEnabled && kpi.trend && (
                <div className={cn(
                  "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border",
                  getTrendColor(kpi.trend)
                )}>
                  {getTrendIcon(kpi.trend, 12)}
                  <span>
                    {kpi.percentageChange !== undefined
                      ? `${kpi.percentageChange >= 0 ? '+' : ''}${kpi.percentageChange.toFixed(1)}%`
                      : kpi.trend
                    }
                  </span>
                </div>
              )}
            </div>

            {/* Main Value */}
            <div className="mb-2">
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {formatValue(kpi.currentValue, kpi.format)}
              </div>
              {kpi.unit && (
                <div className="text-xs text-slate-600 mt-1">{kpi.unit}</div>
              )}
            </div>

            {/* Comparison */}
            {comparisonEnabled && kpi.previousValue !== undefined && (
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Prethodni period:</span>
                <span className="font-mono">
                  {formatValue(kpi.previousValue, kpi.format)}
                </span>
              </div>
            )}

            {/* Mini trend chart (optional) */}
            {kpi.trendData && kpi.trendData.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/50">
                <div className="h-8 flex items-end space-x-1">
                  {kpi.trendData.slice(-7).map((point, i) => {
                    const maxValue = Math.max(...kpi.trendData.slice(-7));
                    const height = maxValue > 0 ? (point / maxValue) * 100 : 0;

                    return (
                      <div
                        key={i}
                        className="flex-1 bg-slate-400/30 rounded-sm"
                        style={{ height: `${Math.max(height, 10)}%` }}
                        title={`${formatValue(point, kpi.format)}`}
                      ></div>
                    );
                  })}
                </div>
                <div className="text-xs text-slate-500 mt-1">Poslednja 7 dana</div>
              </div>
            )}

            {/* Additional Info */}
            {kpi.additionalInfo && (
              <div className="mt-2 text-xs text-slate-600">
                {kpi.additionalInfo}
              </div>
            )}

            {/* Target/Goal indicator */}
            {kpi.target && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-600">Cilj:</span>
                <span className={cn(
                  "font-medium",
                  kpi.currentValue >= kpi.target ? "text-green-600" : "text-orange-600"
                )}>
                  {formatValue(kpi.target, kpi.format)}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default KPITrendCards;