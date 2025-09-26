import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertTriangleIcon,
  TrendingUpIcon,
  BarChartIcon,
  ClockIcon,
  RefreshIcon,
  DownloadIcon,
  FilterIcon,
  CheckCircleIcon,
  InfoIcon,
  SettingsIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '../icons/SvgIcons';
import { Button } from './button-1';
import { cn } from '../../utils/cn';

const AnomalyDetection = ({
  data = [],
  loading = false,
  error = null,
  onRefresh,
  onExport,
  onAnomalyClick,
  className = ''
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [detectionSettings, setDetectionSettings] = useState({
    enabled: true,
    sensitivity: 'medium', // low, medium, high
    historicalPeriod: 30, // days
    minDataPoints: 10,
    algorithms: {
      statistical: true, // Z-score based detection
      trend: true,      // Trend anomaly detection
      pattern: true,    // Pattern-based detection
      threshold: true   // Threshold-based detection
    },
    thresholds: {
      responseTimeMultiplier: 2.0,
      volumeChangePercent: 50,
      failureRateThreshold: 20,
      zScoreLimit: 2.5
    }
  });
  const [showSettings, setShowSettings] = useState(false);

  // Statistical helper functions
  const calculateMean = (values) => {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  };

  const calculateStandardDeviation = (values, mean) => {
    if (values.length < 2) return 0;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
  };

  const calculateZScore = (value, mean, stdDev) => {
    return stdDev > 0 ? (value - mean) / stdDev : 0;
  };

  // Anomaly detection algorithms
  const detectStatisticalAnomalies = (data) => {
    if (!data || data.length < detectionSettings.minDataPoints) return [];

    const anomalies = [];
    const now = new Date();
    const historicalPeriod = detectionSettings.historicalPeriod;

    // Group data by day
    const dailyMetrics = {};

    data.forEach(item => {
      if (!item.timestamp) return;

      const date = new Date(item.timestamp);
      const dayKey = date.toISOString().split('T')[0];

      if (!dailyMetrics[dayKey]) {
        dailyMetrics[dayKey] = {
          date: dayKey,
          orderCount: 0,
          responseTime: [],
          failureCount: 0,
          urgentCount: 0,
          technicians: new Set()
        };
      }

      const metrics = dailyMetrics[dayKey];
      metrics.orderCount++;

      if (item.technician) {
        metrics.technicians.add(item.technician);
      }

      const responseTime = item.response_time || item.responseTime || Math.random() * 120 + 30;
      metrics.responseTime.push(responseTime);

      if (item.status === 'failed' || item.status === 'cancelled') {
        metrics.failureCount++;
      }

      if (item.priority === 'urgent' || item.urgent) {
        metrics.urgentCount++;
      }
    });

    const dailyData = Object.values(dailyMetrics).map(day => ({
      ...day,
      avgResponseTime: calculateMean(day.responseTime),
      failureRate: day.orderCount > 0 ? (day.failureCount / day.orderCount) * 100 : 0,
      urgentRate: day.orderCount > 0 ? (day.urgentCount / day.orderCount) * 100 : 0,
      technicianCount: day.technicians.size
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (dailyData.length < detectionSettings.minDataPoints) return [];

    // Calculate historical statistics for different metrics
    const metrics = {
      orderCount: dailyData.map(d => d.orderCount),
      avgResponseTime: dailyData.map(d => d.avgResponseTime),
      failureRate: dailyData.map(d => d.failureRate),
      urgentRate: dailyData.map(d => d.urgentRate),
      technicianCount: dailyData.map(d => d.technicianCount)
    };

    Object.keys(metrics).forEach(metricName => {
      const values = metrics[metricName];
      const mean = calculateMean(values);
      const stdDev = calculateStandardDeviation(values, mean);

      // Check recent values for anomalies
      const recentValues = values.slice(-7); // Last 7 days

      recentValues.forEach((value, index) => {
        const zScore = calculateZScore(value, mean, stdDev);

        if (Math.abs(zScore) > detectionSettings.thresholds.zScoreLimit) {
          const severity = Math.abs(zScore) > 3 ? 'high' : Math.abs(zScore) > 2.5 ? 'medium' : 'low';
          const dayIndex = dailyData.length - recentValues.length + index;
          const dayData = dailyData[dayIndex];

          anomalies.push({
            id: `statistical_${metricName}_${dayData.date}`,
            type: 'statistical',
            severity,
            title: `Statistička anomalija - ${getMetricDisplayName(metricName)}`,
            description: `${getMetricDisplayName(metricName)} od ${value.toFixed(2)} je ${zScore > 0 ? 'značajno veća' : 'značajno manja'} od istorijskog proseka (z-score: ${zScore.toFixed(2)})`,
            date: dayData.date,
            metric: metricName,
            value,
            expectedValue: mean,
            zScore,
            confidence: Math.min(95, Math.abs(zScore) * 30),
            impact: severity === 'high' ? 'critical' : severity === 'medium' ? 'moderate' : 'low',
            rawData: dayData
          });
        }
      });
    });

    return anomalies;
  };

  const detectTrendAnomalies = (data) => {
    if (!data || data.length < detectionSettings.minDataPoints) return [];

    const anomalies = [];

    // Group data by day for trend analysis
    const dailyMetrics = {};

    data.forEach(item => {
      if (!item.timestamp) return;

      const date = new Date(item.timestamp);
      const dayKey = date.toISOString().split('T')[0];

      if (!dailyMetrics[dayKey]) {
        dailyMetrics[dayKey] = {
          date: dayKey,
          orderCount: 0,
          completedCount: 0
        };
      }

      dailyMetrics[dayKey].orderCount++;

      if (item.status === 'completed') {
        dailyMetrics[dayKey].completedCount++;
      }
    });

    const dailyData = Object.values(dailyMetrics).map(day => ({
      ...day,
      completionRate: day.orderCount > 0 ? (day.completedCount / day.orderCount) * 100 : 0
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (dailyData.length < 7) return [];

    // Analyze trends over different periods
    const periods = [
      { days: 3, label: 'kratkoročni' },
      { days: 7, label: 'nedeljni' },
      { days: 14, label: 'dvonedeljni' }
    ];

    periods.forEach(period => {
      if (dailyData.length >= period.days) {
        const recentData = dailyData.slice(-period.days);
        const previousData = dailyData.slice(-period.days * 2, -period.days);

        if (previousData.length >= period.days) {
          const recentAvg = calculateMean(recentData.map(d => d.orderCount));
          const previousAvg = calculateMean(previousData.map(d => d.orderCount));

          const changePercent = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

          // Detect significant changes
          if (Math.abs(changePercent) > detectionSettings.thresholds.volumeChangePercent) {
            const severity = Math.abs(changePercent) > 100 ? 'high' : Math.abs(changePercent) > 75 ? 'medium' : 'low';

            anomalies.push({
              id: `trend_volume_${period.days}d_${recentData[recentData.length - 1].date}`,
              type: 'trend',
              severity,
              title: `Trend anomalija - ${period.label} period`,
              description: `${period.label.charAt(0).toUpperCase() + period.label.slice(1)} broj naloga je ${changePercent > 0 ? 'porastao' : 'opao'} za ${Math.abs(changePercent).toFixed(1)}%`,
              date: recentData[recentData.length - 1].date,
              metric: 'orderVolume',
              changePercent,
              currentAverage: recentAvg,
              previousAverage: previousAvg,
              confidence: Math.min(95, Math.abs(changePercent) / 2),
              impact: severity === 'high' ? 'critical' : severity === 'medium' ? 'moderate' : 'low',
              period: period.days
            });
          }

          // Check completion rate trends
          const recentCompletionAvg = calculateMean(recentData.map(d => d.completionRate));
          const previousCompletionAvg = calculateMean(previousData.map(d => d.completionRate));
          const completionChange = recentCompletionAvg - previousCompletionAvg;

          if (Math.abs(completionChange) > 15) { // 15% change threshold
            const severity = Math.abs(completionChange) > 30 ? 'high' : Math.abs(completionChange) > 20 ? 'medium' : 'low';

            anomalies.push({
              id: `trend_completion_${period.days}d_${recentData[recentData.length - 1].date}`,
              type: 'trend',
              severity,
              title: `Trend anomalija - stopa završetka`,
              description: `Stopa završetka naloga je ${completionChange > 0 ? 'porasla' : 'opala'} za ${Math.abs(completionChange).toFixed(1)}% u ${period.label} periodu`,
              date: recentData[recentData.length - 1].date,
              metric: 'completionRate',
              changePercent: completionChange,
              currentAverage: recentCompletionAvg,
              previousAverage: previousCompletionAvg,
              confidence: Math.min(90, Math.abs(completionChange) * 3),
              impact: completionChange < 0 ? (severity === 'high' ? 'critical' : 'moderate') : 'positive',
              period: period.days
            });
          }
        }
      }
    });

    return anomalies;
  };

  const detectPatternAnomalies = (data) => {
    if (!data || data.length < detectionSettings.minDataPoints) return [];

    const anomalies = [];

    // Analyze weekly patterns
    const weeklyPatterns = {};
    const currentWeek = {};

    data.forEach(item => {
      if (!item.timestamp) return;

      const date = new Date(item.timestamp);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();
      const weekKey = `${dayOfWeek}_${hour}`;

      // Historical data
      if (!weeklyPatterns[weekKey]) {
        weeklyPatterns[weekKey] = [];
      }
      weeklyPatterns[weekKey].push(1); // Count occurrences

      // Current week data
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      if (date > weekAgo) {
        if (!currentWeek[weekKey]) {
          currentWeek[weekKey] = 0;
        }
        currentWeek[weekKey]++;
      }
    });

    // Compare current week patterns with historical
    Object.keys(currentWeek).forEach(weekKey => {
      const currentCount = currentWeek[weekKey];
      const historicalData = weeklyPatterns[weekKey] || [];

      if (historicalData.length >= 4) { // Need at least 4 weeks of data
        const historicalMean = calculateMean(historicalData);
        const historicalStdDev = calculateStandardDeviation(historicalData, historicalMean);

        if (historicalStdDev > 0) {
          const zScore = calculateZScore(currentCount, historicalMean, historicalStdDev);

          if (Math.abs(zScore) > 2) {
            const [dayOfWeek, hour] = weekKey.split('_');
            const dayName = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'][parseInt(dayOfWeek)];
            const severity = Math.abs(zScore) > 3 ? 'high' : 'medium';

            anomalies.push({
              id: `pattern_${weekKey}_${new Date().toISOString().split('T')[0]}`,
              type: 'pattern',
              severity,
              title: `Anomalija u obrascima aktivnosti`,
              description: `Neobična aktivnost ${dayName} u ${hour}:00h - ${currentCount} naloga vs. istorijski prosek ${historicalMean.toFixed(1)}`,
              date: new Date().toISOString().split('T')[0],
              metric: 'weeklyPattern',
              dayOfWeek: dayName,
              hour,
              currentValue: currentCount,
              expectedValue: historicalMean,
              zScore,
              confidence: Math.min(85, Math.abs(zScore) * 25),
              impact: zScore > 0 ? 'surge' : 'deficit'
            });
          }
        }
      }
    });

    return anomalies;
  };

  const detectThresholdAnomalies = (data) => {
    if (!data || data.length === 0) return [];

    const anomalies = [];
    const now = new Date();

    // Recent data analysis (last 24 hours)
    const recentData = data.filter(item => {
      if (!item.timestamp) return false;
      const itemTime = new Date(item.timestamp);
      const hoursDiff = (now - itemTime) / (1000 * 60 * 60);
      return hoursDiff <= 24;
    });

    if (recentData.length === 0) return [];

    // Response time threshold violations
    const slowOrders = recentData.filter(item => {
      const responseTime = item.response_time || item.responseTime || 0;
      return responseTime > 180; // 3 hours threshold
    });

    if (slowOrders.length > 0) {
      const severity = slowOrders.length > 10 ? 'high' : slowOrders.length > 5 ? 'medium' : 'low';

      anomalies.push({
        id: `threshold_response_time_${now.toISOString().split('T')[0]}`,
        type: 'threshold',
        severity,
        title: 'Prekoračeno vreme odgovora',
        description: `${slowOrders.length} naloga ima vreme odgovora preko 3 sata u poslednja 24 sata`,
        date: now.toISOString().split('T')[0],
        metric: 'responseTime',
        violationCount: slowOrders.length,
        threshold: 180,
        confidence: 90,
        impact: severity === 'high' ? 'critical' : 'moderate',
        affectedOrders: slowOrders.length
      });
    }

    // Failure rate threshold
    const totalOrders = recentData.length;
    const failedOrders = recentData.filter(item =>
      item.status === 'failed' || item.status === 'cancelled'
    ).length;

    const failureRate = totalOrders > 0 ? (failedOrders / totalOrders) * 100 : 0;

    if (failureRate > detectionSettings.thresholds.failureRateThreshold) {
      anomalies.push({
        id: `threshold_failure_rate_${now.toISOString().split('T')[0]}`,
        type: 'threshold',
        severity: failureRate > 40 ? 'high' : failureRate > 30 ? 'medium' : 'low',
        title: 'Visoka stopa neuspešnosti',
        description: `Stopa neuspešnosti od ${failureRate.toFixed(1)}% prekorači prag od ${detectionSettings.thresholds.failureRateThreshold}%`,
        date: now.toISOString().split('T')[0],
        metric: 'failureRate',
        currentValue: failureRate,
        threshold: detectionSettings.thresholds.failureRateThreshold,
        confidence: 95,
        impact: 'critical',
        affectedOrders: failedOrders
      });
    }

    return anomalies;
  };

  const getMetricDisplayName = (metric) => {
    const names = {
      orderCount: 'Broj naloga',
      avgResponseTime: 'Prosečno vreme odgovora',
      failureRate: 'Stopa neuspešnosti',
      urgentRate: 'Stopa hitnih naloga',
      technicianCount: 'Broj tehničara'
    };
    return names[metric] || metric;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      statistical: 'bg-purple-100 text-purple-700',
      trend: 'bg-blue-100 text-blue-700',
      pattern: 'bg-green-100 text-green-700',
      threshold: 'bg-red-100 text-red-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  // Main anomaly detection
  const detectedAnomalies = useMemo(() => {
    if (!detectionSettings.enabled || !data || data.length < detectionSettings.minDataPoints) {
      return [];
    }

    let anomalies = [];

    if (detectionSettings.algorithms.statistical) {
      anomalies = [...anomalies, ...detectStatisticalAnomalies(data)];
    }

    if (detectionSettings.algorithms.trend) {
      anomalies = [...anomalies, ...detectTrendAnomalies(data)];
    }

    if (detectionSettings.algorithms.pattern) {
      anomalies = [...anomalies, ...detectPatternAnomalies(data)];
    }

    if (detectionSettings.algorithms.threshold) {
      anomalies = [...anomalies, ...detectThresholdAnomalies(data)];
    }

    // Filter by severity and type
    return anomalies
      .filter(anomaly => selectedSeverity === 'all' || anomaly.severity === selectedSeverity)
      .filter(anomaly => selectedType === 'all' || anomaly.type === selectedType)
      .sort((a, b) => {
        // Sort by severity first, then by confidence
        const severityOrder = { high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return (b.confidence || 0) - (a.confidence || 0);
      });
  }, [data, detectionSettings, selectedSeverity, selectedType]);

  if (loading) {
    return (
      <div className={cn("bg-white rounded-xl border border-slate-200 p-6", className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-200 rounded"></div>
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
          <h4 className="text-lg font-semibold text-slate-900 mb-2">Greška pri detekciji anomalija</h4>
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
            <div className="p-2 bg-orange-50 rounded-lg">
              <ExclamationTriangleIcon size={20} className="text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Automatska detekcija anomalija</h3>
              <p className="text-slate-600 mt-1">AI algoritmi za prepoznavanje neobičnih obrazaca i odstupanja</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              type={detectionSettings.enabled ? "primary" : "secondary"}
              size="small"
              onClick={() => setDetectionSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
              prefix={detectionSettings.enabled ? <CheckCircleIcon size={16} /> : <AlertTriangleIcon size={16} />}
            >
              {detectionSettings.enabled ? 'Uključeno' : 'Isključeno'}
            </Button>

            <Button
              type="secondary"
              size="small"
              onClick={() => setShowSettings(!showSettings)}
              prefix={<SettingsIcon size={16} />}
            >
              Podešavanje
            </Button>

            {onExport && (
              <Button
                type="secondary"
                size="small"
                onClick={() => onExport(detectedAnomalies)}
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

        {/* Filters */}
        <div className="flex items-center space-x-4 mt-4">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
          >
            <option value="all">Svi nivoi</option>
            <option value="high">Visoko</option>
            <option value="medium">Srednje</option>
            <option value="low">Nisko</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
          >
            <option value="all">Svi tipovi</option>
            <option value="statistical">Statistička</option>
            <option value="trend">Trend</option>
            <option value="pattern">Obrazac</option>
            <option value="threshold">Prag</option>
          </select>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Podešavanje detekcije</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Settings */}
            <div>
              <h5 className="font-medium text-slate-900 mb-3">Opšte podešavanje</h5>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Osetljivost</label>
                  <select
                    value={detectionSettings.sensitivity}
                    onChange={(e) => setDetectionSettings(prev => ({
                      ...prev,
                      sensitivity: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="low">Niska</option>
                    <option value="medium">Srednja</option>
                    <option value="high">Visoka</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">Istorijski period (dana)</label>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={detectionSettings.historicalPeriod}
                    onChange={(e) => setDetectionSettings(prev => ({
                      ...prev,
                      historicalPeriod: parseInt(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Algorithm Settings */}
            <div>
              <h5 className="font-medium text-slate-900 mb-3">Algoritmi</h5>
              <div className="space-y-3">
                {Object.entries(detectionSettings.algorithms).map(([key, enabled]) => (
                  <label key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setDetectionSettings(prev => ({
                        ...prev,
                        algorithms: {
                          ...prev.algorithms,
                          [key]: e.target.checked
                        }
                      }))}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm text-slate-600 capitalize">
                      {key === 'statistical' ? 'Statistička analiza' :
                       key === 'trend' ? 'Trend analiza' :
                       key === 'pattern' ? 'Analiza obrazaca' :
                       key === 'threshold' ? 'Pragovi' : key}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {!detectionSettings.enabled ? (
          <div className="text-center py-8">
            <AlertTriangleIcon size={48} className="text-slate-400 mb-4 mx-auto" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Detekcija anomalija je isključena</h4>
            <p className="text-slate-600">Uključite detekciju da biste analizirali podatke za anomalije.</p>
          </div>
        ) : data.length < detectionSettings.minDataPoints ? (
          <div className="text-center py-8">
            <BarChartIcon size={48} className="text-slate-400 mb-4 mx-auto" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Nedovoljno podataka</h4>
            <p className="text-slate-600">
              Potrebno je najmanje {detectionSettings.minDataPoints} podataka za analizu anomalija.
              Trenutno je dostupno {data.length} podataka.
            </p>
          </div>
        ) : detectedAnomalies.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon size={48} className="text-green-400 mb-4 mx-auto" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Nema detektovanih anomalija</h4>
            <p className="text-slate-600">Svi podaci su u okviru normalnih parametara.</p>
          </div>
        ) : (
          <div>
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl p-4 border border-red-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {detectedAnomalies.filter(a => a.severity === 'high').length}
                  </div>
                  <div className="text-sm text-red-700">Visok prioritet</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4 border border-orange-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {detectedAnomalies.filter(a => a.severity === 'medium').length}
                  </div>
                  <div className="text-sm text-orange-700">Srednji prioritet</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 rounded-xl p-4 border border-yellow-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {detectedAnomalies.filter(a => a.severity === 'low').length}
                  </div>
                  <div className="text-sm text-yellow-700">Nizak prioritet</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-600">
                    {detectedAnomalies.length}
                  </div>
                  <div className="text-sm text-slate-700">Ukupno anomalija</div>
                </div>
              </div>
            </div>

            {/* Anomaly List */}
            <div className="space-y-4">
              {detectedAnomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={cn(
                    "rounded-xl p-4 border transition-all duration-200 hover:shadow-md",
                    getSeverityColor(anomaly.severity)
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-slate-900">{anomaly.title}</h4>
                        <span className={cn("px-2 py-1 rounded text-xs font-medium", getTypeColor(anomaly.type))}>
                          {anomaly.type === 'statistical' ? 'Statistička' :
                           anomaly.type === 'trend' ? 'Trend' :
                           anomaly.type === 'pattern' ? 'Obrazac' : 'Prag'}
                        </span>
                        <span className="text-xs bg-white/50 px-2 py-1 rounded-full">
                          {(anomaly.confidence || 0).toFixed(0)}% pouzdanost
                        </span>
                      </div>

                      <p className="text-sm text-slate-700 mb-3">{anomaly.description}</p>

                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <div className="flex items-center space-x-1">
                          <ClockIcon size={14} />
                          <span>{anomaly.date}</span>
                        </div>
                        <div>
                          <span className="font-medium">Prioritet:</span>
                          <span className="capitalize ml-1">
                            {anomaly.severity === 'high' ? 'Visok' :
                             anomaly.severity === 'medium' ? 'Srednji' : 'Nizak'}
                          </span>
                        </div>
                        {anomaly.impact && (
                          <div>
                            <span className="font-medium">Uticaj:</span>
                            <span className="capitalize ml-1">{anomaly.impact}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {onAnomalyClick && (
                        <Button
                          type="secondary"
                          size="small"
                          onClick={() => onAnomalyClick(anomaly)}
                          prefix={<EyeIcon size={14} />}
                        >
                          Detalji
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnomalyDetection;