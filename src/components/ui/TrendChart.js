import React, { useMemo } from 'react';
import {
  TrendingUpIcon,
  ChevronDownIcon,
  MinusIcon,
  AlertTriangleIcon
} from '../icons/SvgIcons';
import { cn } from '../../utils/cn';

const TrendChart = ({
  title,
  subtitle,
  currentPeriodData = [],
  previousPeriodData = [],
  metric = 'value',
  timeFormat = 'date',
  showComparison = true,
  chartType = 'line',
  color = 'blue',
  className = ''
}) => {
  // Calculate trend metrics
  const trendMetrics = useMemo(() => {
    const currentTotal = currentPeriodData.reduce((sum, item) => sum + (item[metric] || 0), 0);
    const previousTotal = previousPeriodData.reduce((sum, item) => sum + (item[metric] || 0), 0);

    const percentChange = previousTotal === 0 ? 0 : ((currentTotal - previousTotal) / previousTotal) * 100;
    const absoluteChange = currentTotal - previousTotal;

    const trend = percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'stable';

    // Calculate average, min, max for current period
    const currentValues = currentPeriodData.map(item => item[metric] || 0);
    const average = currentValues.length > 0 ? currentValues.reduce((a, b) => a + b, 0) / currentValues.length : 0;
    const min = currentValues.length > 0 ? Math.min(...currentValues) : 0;
    const max = currentValues.length > 0 ? Math.max(...currentValues) : 0;

    return {
      currentTotal,
      previousTotal,
      percentChange,
      absoluteChange,
      trend,
      average,
      min,
      max
    };
  }, [currentPeriodData, previousPeriodData, metric]);

  // Prepare chart data for visualization
  const chartData = useMemo(() => {
    const maxLength = Math.max(currentPeriodData.length, previousPeriodData.length);
    const data = [];

    for (let i = 0; i < maxLength; i++) {
      const current = currentPeriodData[i] || {};
      const previous = previousPeriodData[i] || {};

      data.push({
        index: i,
        label: current.label || current.date || `Period ${i + 1}`,
        current: current[metric] || 0,
        previous: previous[metric] || 0,
        currentItem: current,
        previousItem: previous
      });
    }

    return data;
  }, [currentPeriodData, previousPeriodData, metric]);

  // Generate SVG path for line chart
  const generatePath = (data, key, width, height, padding) => {
    if (data.length === 0) return '';

    const values = data.map(d => d[key]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    const stepX = (width - 2 * padding) / (data.length - 1 || 1);

    const points = data.map((d, i) => {
      const x = padding + i * stepX;
      const y = height - padding - ((d[key] - minValue) / range) * (height - 2 * padding);
      return `${x},${y}`;
    });

    return `M${points.join('L')}`;
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon size={16} className="text-green-600" />;
      case 'down':
        return <ChevronDownIcon size={16} className="text-red-600" />;
      default:
        return <MinusIcon size={16} className="text-slate-600" />;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-50';
      case 'down':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  const formatValue = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  };

  const formatPercentage = (percentage) => {
    const abs = Math.abs(percentage);
    const sign = percentage >= 0 ? '+' : '-';
    return `${sign}${abs.toFixed(1)}%`;
  };

  const colorClasses = {
    blue: {
      primary: 'stroke-blue-600',
      secondary: 'stroke-blue-300',
      background: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
      border: 'border-blue-200'
    },
    green: {
      primary: 'stroke-green-600',
      secondary: 'stroke-green-300',
      background: 'bg-gradient-to-br from-green-50 to-green-100/50',
      border: 'border-green-200'
    },
    purple: {
      primary: 'stroke-purple-600',
      secondary: 'stroke-purple-300',
      background: 'bg-gradient-to-br from-purple-50 to-purple-100/50',
      border: 'border-purple-200'
    },
    orange: {
      primary: 'stroke-orange-600',
      secondary: 'stroke-orange-300',
      background: 'bg-gradient-to-br from-orange-50 to-orange-100/50',
      border: 'border-orange-200'
    }
  };

  const colorClass = colorClasses[color] || colorClasses.blue;

  return (
    <div className={cn(
      "rounded-xl border shadow-sm overflow-hidden",
      colorClass.background,
      colorClass.border,
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
          </div>

          {showComparison && (
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900">
                  {formatValue(trendMetrics.currentTotal)}
                </div>
                <div className="text-xs text-slate-600">Trenutni period</div>
              </div>

              <div className={cn(
                "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
                getTrendColor(trendMetrics.trend)
              )}>
                {getTrendIcon(trendMetrics.trend)}
                <span>{formatPercentage(trendMetrics.percentChange)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-4">
        {chartData.length > 0 ? (
          <div className="space-y-4">
            {/* SVG Chart */}
            <div className="relative">
              <svg
                width="100%"
                height="200"
                viewBox="0 0 400 200"
                className="overflow-visible"
              >
                {/* Grid lines */}
                <defs>
                  <pattern
                    id={`grid-${color}`}
                    width="40"
                    height="20"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 40 0 L 0 0 0 20"
                      fill="none"
                      stroke="rgb(148 163 184 / 0.1)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="400" height="200" fill={`url(#grid-${color})`} />

                {/* Previous period line (if comparison enabled) */}
                {showComparison && (
                  <path
                    d={generatePath(chartData, 'previous', 400, 200, 20)}
                    fill="none"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    className={colorClass.secondary}
                  />
                )}

                {/* Current period line */}
                <path
                  d={generatePath(chartData, 'current', 400, 200, 20)}
                  fill="none"
                  strokeWidth="3"
                  className={colorClass.primary}
                />

                {/* Data points */}
                {chartData.map((point, index) => {
                  const x = 20 + index * ((400 - 40) / (chartData.length - 1 || 1));
                  const values = chartData.map(d => d.current);
                  const minValue = Math.min(...values);
                  const maxValue = Math.max(...values);
                  const range = maxValue - minValue || 1;
                  const y = 200 - 20 - ((point.current - minValue) / range) * (200 - 40);

                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="white"
                      strokeWidth="2"
                      className={colorClass.primary}
                    >
                      <title>
                        {point.label}: {point.current}
                        {showComparison && ` (prethodni: ${point.previous})`}
                      </title>
                    </circle>
                  );
                })}
              </svg>

              {/* Legend */}
              {showComparison && (
                <div className="flex items-center justify-center space-x-6 mt-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className={cn("w-3 h-0.5", colorClass.primary)}></div>
                    <span className="text-slate-700">Trenutni period</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={cn("w-3 h-0.5 border-dashed border-t-2", colorClass.secondary)}></div>
                    <span className="text-slate-700">Prethodni period</span>
                  </div>
                </div>
              )}
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-200/50">
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">{formatValue(trendMetrics.average)}</div>
                <div className="text-xs text-slate-600">Prosek</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">{formatValue(trendMetrics.max)}</div>
                <div className="text-xs text-slate-600">Maksimum</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">{formatValue(trendMetrics.min)}</div>
                <div className="text-xs text-slate-600">Minimum</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">{formatValue(Math.abs(trendMetrics.absoluteChange))}</div>
                <div className="text-xs text-slate-600">Promena</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertTriangleIcon size={48} className="text-slate-400 mb-4 mx-auto" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Nema podataka</h4>
            <p className="text-slate-600">Nema dostupnih podataka za prikaz trenda.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendChart;