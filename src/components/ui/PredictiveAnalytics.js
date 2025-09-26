import React, { useMemo, useState } from 'react';
import {
  TrendingUpIcon,
  BarChartIcon,
  AlertTriangleIcon,
  RefreshIcon,
  DownloadIcon,
  CalendarIcon,
  UsersIcon,
  ClockIcon,
  ChartIcon,
  LayersIcon,
  ZoomInIcon,
  FilterIcon,
  CheckIcon
} from '../icons/SvgIcons';
import { Button } from './button-1';
import { cn } from '../../utils/cn';

const PredictiveAnalytics = ({
  data = [],
  loading = false,
  error = null,
  timeRange = '30d',
  onTimeRangeChange,
  onRefresh,
  onExport,
  className = ''
}) => {
  const [predictionHorizon, setPredictionHorizon] = useState('7d'); // 7d, 14d, 30d, 90d
  const [modelType, setModelType] = useState('trend'); // 'trend', 'seasonal', 'advanced'
  const [confidenceLevel, setConfidenceLevel] = useState('80'); // 70, 80, 90, 95
  const [selectedMetric, setSelectedMetric] = useState('workOrders'); // workOrders, resources, technicians

  // Helper functions - must be defined before useMemo
  const groupDataByDay = (data) => {
    const groups = {};

    data.forEach(item => {
      // Validacija timestamp-a
      if (!item.timestamp) return;

      const timestamp = new Date(item.timestamp);
      if (isNaN(timestamp.getTime())) return; // Proverava da li je validan datum

      const date = timestamp.toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = {
          date,
          workOrders: 0,
          technicians: new Set(),
          avgResponseTime: 0,
          completedOrders: 0,
          urgentOrders: 0,
          totalResponseTime: 0,
          activities: []
        };
      }

      const group = groups[date];
      group.workOrders++;
      group.technicians.add(item.technician);
      group.activities.push(item);

      const responseTime = item.responseTime || Math.random() * 120 + 30;
      group.totalResponseTime += responseTime;

      if (item.status === 'completed') group.completedOrders++;
      if (item.priority === 'urgent' || item.urgent) group.urgentOrders++;
    });

    // Calculate averages
    return Object.values(groups).map(group => ({
      ...group,
      technicians: Array.from(group.technicians),
      technicianCount: group.technicians.size,
      avgResponseTime: group.workOrders > 0 ? group.totalResponseTime / group.workOrders : 0,
      completionRate: group.workOrders > 0 ? (group.completedOrders / group.workOrders) * 100 : 0,
      urgencyRate: group.workOrders > 0 ? (group.urgentOrders / group.workOrders) * 100 : 0
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const calculateLinearTrend = (xValues, yValues) => {
    const n = xValues.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope || 0;
  };

  const analyzeHistoricalPatterns = (dailyData) => {
    const patterns = {
      weeklyPattern: {},
      monthlyTrend: 0,
      seasonality: {},
      averages: {},
      volatility: 0
    };

    // Weekly pattern analysis
    dailyData.forEach(day => {
      const dayOfWeek = new Date(day.date).getDay();
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

      if (!patterns.weeklyPattern[dayName]) {
        patterns.weeklyPattern[dayName] = { total: 0, count: 0 };
      }

      patterns.weeklyPattern[dayName].total += day.workOrders;
      patterns.weeklyPattern[dayName].count++;
    });

    // Calculate weekly averages
    Object.keys(patterns.weeklyPattern).forEach(day => {
      const pattern = patterns.weeklyPattern[day];
      pattern.average = pattern.count > 0 ? pattern.total / pattern.count : 0;
    });

    // Monthly trend (simple linear regression)
    if (dailyData.length > 1) {
      const xValues = dailyData.map((_, index) => index);
      const yValues = dailyData.map(day => day.workOrders);
      patterns.monthlyTrend = calculateLinearTrend(xValues, yValues);
    }

    // Calculate averages
    patterns.averages = {
      workOrders: dailyData.reduce((sum, day) => sum + day.workOrders, 0) / dailyData.length || 0,
      technicians: dailyData.reduce((sum, day) => sum + day.technicianCount, 0) / dailyData.length || 0,
      responseTime: dailyData.reduce((sum, day) => sum + day.avgResponseTime, 0) / dailyData.length || 0,
      completionRate: dailyData.reduce((sum, day) => sum + day.completionRate, 0) / dailyData.length || 0
    };

    // Calculate volatility (standard deviation)
    const workOrderVariance = dailyData.reduce((sum, day) =>
      sum + Math.pow(day.workOrders - patterns.averages.workOrders, 2), 0) / dailyData.length;
    patterns.volatility = Math.sqrt(workOrderVariance);

    return patterns;
  };

  const calculateDayConfidence = (dayOffset, totalDays) => {
    // Confidence decreases over time
    const baseConfidence = 95;
    const decayRate = 15; // confidence decreases by 15% per week
    const weeksOut = dayOffset / 7;
    return Math.max(50, baseConfidence - (decayRate * weeksOut));
  };

  const generatePredictions = (dailyData, patterns, horizon, model) => {
    const predictions = [];
    const daysToPredict = parseInt(horizon.replace('d', ''));
    const lastDate = new Date(dailyData[dailyData.length - 1]?.date || new Date());

    for (let i = 1; i <= daysToPredict; i++) {
      const predictionDate = new Date(lastDate);
      predictionDate.setDate(predictionDate.getDate() + i);

      const dayOfWeek = predictionDate.getDay();
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

      let predictedWorkOrders = patterns.averages.workOrders;

      // Apply model-specific calculations
      switch (model) {
        case 'trend':
          predictedWorkOrders = patterns.averages.workOrders + (patterns.monthlyTrend * i);
          break;
        case 'seasonal':
          const weeklyMultiplier = patterns.weeklyPattern[dayName]?.average / patterns.averages.workOrders || 1;
          predictedWorkOrders = patterns.averages.workOrders * weeklyMultiplier;
          break;
        case 'advanced':
          const trendComponent = patterns.averages.workOrders + (patterns.monthlyTrend * i);
          const seasonalComponent = patterns.weeklyPattern[dayName]?.average / patterns.averages.workOrders || 1;
          predictedWorkOrders = trendComponent * seasonalComponent;
          break;
      }

      // Add some random variation based on historical volatility
      const variation = (Math.random() - 0.5) * patterns.volatility * 0.3;
      predictedWorkOrders = Math.max(0, predictedWorkOrders + variation);

      predictions.push({
        date: predictionDate.toISOString().split('T')[0],
        predictedWorkOrders: Math.round(predictedWorkOrders),
        predictedTechnicians: Math.round(predictedWorkOrders / (patterns.averages.workOrders / patterns.averages.technicians || 1)),
        predictedResponseTime: patterns.averages.responseTime * (1 + Math.random() * 0.1 - 0.05),
        confidence: calculateDayConfidence(i, daysToPredict),
        dayOfWeek: dayName
      });
    }

    return predictions;
  };

  const calculateConfidenceIntervals = (predictions, confidenceLevel) => {
    const confidence = parseInt(confidenceLevel);
    const zScore = confidence === 95 ? 1.96 : confidence === 90 ? 1.645 : confidence === 80 ? 1.282 : 1.04;

    return predictions.map(pred => ({
      ...pred,
      lowerBound: Math.max(0, Math.round(pred.predictedWorkOrders - zScore * 2)),
      upperBound: Math.round(pred.predictedWorkOrders + zScore * 2),
      confidenceLevel: confidence
    }));
  };

  const analyzeTrends = (historicalData, predictions) => {
    const recentData = historicalData.slice(-7); // Last 7 days
    const avgRecent = recentData.reduce((sum, day) => sum + day.workOrders, 0) / recentData.length || 0;
    const avgPredicted = predictions.reduce((sum, pred) => sum + pred.predictedWorkOrders, 0) / predictions.length || 0;

    const trendDirection = avgPredicted > avgRecent ? 'increasing' : avgPredicted < avgRecent ? 'decreasing' : 'stable';
    const trendMagnitude = Math.abs((avgPredicted - avgRecent) / avgRecent * 100);

    return {
      direction: trendDirection,
      magnitude: trendMagnitude,
      avgRecent,
      avgPredicted,
      classification: trendMagnitude < 5 ? 'stable' : trendMagnitude < 15 ? 'moderate' : 'significant'
    };
  };

  const generateResourceForecasts = (predictions, historicalData) => {
    const avgWorkOrdersPerTechnician = historicalData.length > 0
      ? historicalData.reduce((sum, item) => sum + 1, 0) / new Set(historicalData.map(item => item.technician)).size
      : 10;

    const totalPredictedWorkOrders = predictions.reduce((sum, pred) => sum + pred.predictedWorkOrders, 0);
    const requiredTechnicians = Math.ceil(totalPredictedWorkOrders / avgWorkOrdersPerTechnician);

    return {
      requiredTechnicians,
      totalPredictedWorkOrders,
      peakDay: predictions.reduce((max, pred) => pred.predictedWorkOrders > max.predictedWorkOrders ? pred : max),
      avgDailyWorkload: totalPredictedWorkOrders / predictions.length,
      capacityUtilization: Math.min(100, (totalPredictedWorkOrders / (requiredTechnicians * predictions.length * 5)) * 100)
    };
  };

  const generateRecommendations = (predictions, trends, resourceForecasts) => {
    const recommendations = [];

    // Staffing recommendations
    if (resourceForecasts.requiredTechnicians > 5) {
      recommendations.push({
        type: 'staffing',
        priority: 'high',
        title: 'Povećajte broj tehničara',
        description: `Predviđanja pokazuju potrebu za ${resourceForecasts.requiredTechnicians} tehničara u sledećem periodu.`,
        impact: 'positive',
        category: 'resources'
      });
    }

    // Trend-based recommendations
    if (trends.direction === 'increasing' && trends.classification === 'significant') {
      recommendations.push({
        type: 'capacity',
        priority: 'high',
        title: 'Pripremite se za povećanu aktivnost',
        description: `Trend pokazuje ${trends.magnitude.toFixed(1)}% povećanje aktivnosti. Razmotrite dodatne resurse.`,
        impact: 'warning',
        category: 'planning'
      });
    }

    // Peak day recommendations
    const peakDay = resourceForecasts.peakDay;
    if (peakDay && peakDay.predictedWorkOrders > trends.avgRecent * 1.5) {
      recommendations.push({
        type: 'scheduling',
        priority: 'medium',
        title: 'Planiran je vrhunski dan',
        description: `${peakDay.date} se predviđa kao dan sa ${peakDay.predictedWorkOrders} radnih naloga.`,
        impact: 'info',
        category: 'scheduling'
      });
    }

    // Capacity utilization recommendations
    if (resourceForecasts.capacityUtilization > 85) {
      recommendations.push({
        type: 'efficiency',
        priority: 'medium',
        title: 'Visoka iskorišćenost kapaciteta',
        description: `Predviđena iskorišćenost od ${resourceForecasts.capacityUtilization.toFixed(1)}% može uticati na kvalitet.`,
        impact: 'warning',
        category: 'efficiency'
      });
    }

    return recommendations;
  };

  const generateAlerts = (predictions, trends, patterns) => {
    const alerts = [];

    // High volume alert
    const maxPredicted = Math.max(...predictions.map(p => p.predictedWorkOrders));
    if (maxPredicted > patterns.averages.workOrders * 2) {
      alerts.push({
        type: 'volume',
        severity: 'high',
        title: 'Upozorenje na veliki obim posla',
        message: `Predviđa se do ${maxPredicted} radnih naloga u jednom danu.`,
        date: predictions.find(p => p.predictedWorkOrders === maxPredicted)?.date
      });
    }

    // Trend alert
    if (trends.classification === 'significant' && trends.direction === 'increasing') {
      alerts.push({
        type: 'trend',
        severity: 'medium',
        title: 'Značajan rastući trend',
        message: `Aktivnost raste za ${trends.magnitude.toFixed(1)}% u odnosu na prethodne dane.`,
        date: null
      });
    }

    return alerts;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 border-red-300 text-red-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'low': return 'bg-green-100 border-green-300 text-green-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-orange-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Predictive analysis calculations
  const predictiveAnalysis = useMemo(() => {
    if (!data.length) return {
      predictions: [],
      confidence: {},
      trends: {},
      recommendations: [],
      resourceForecasts: {},
      alerts: []
    };

    // Time series preparation
    const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Group data by day for trend analysis
    const dailyData = groupDataByDay(sortedData);

    // Calculate historical patterns
    const historicalPatterns = analyzeHistoricalPatterns(dailyData);

    // Generate predictions based on selected model
    const predictions = generatePredictions(dailyData, historicalPatterns, predictionHorizon, modelType);

    // Calculate confidence intervals
    const confidence = calculateConfidenceIntervals(predictions, confidenceLevel);

    // Analyze trends
    const trends = analyzeTrends(dailyData, predictions);

    // Generate resource forecasts
    const resourceForecasts = generateResourceForecasts(predictions, data);

    // Generate recommendations
    const recommendations = generateRecommendations(predictions, trends, resourceForecasts);

    // Generate alerts
    const alerts = generateAlerts(predictions, trends, historicalPatterns);

    return {
      predictions,
      confidence,
      trends,
      recommendations,
      resourceForecasts,
      alerts,
      historicalPatterns
    };
  }, [data, predictionHorizon, modelType, confidenceLevel, selectedMetric]);

  if (loading) {
    return (
      <div className={cn("bg-white rounded-xl border border-slate-200 p-6", className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-40 bg-slate-200 rounded"></div>
            <div className="h-40 bg-slate-200 rounded"></div>
          </div>
          <div className="mt-4 space-y-3">
            {[...Array(3)].map((_, i) => (
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
          <AlertTriangleIcon size={48} className="text-red-400 mb-4 mx-auto" />
          <h4 className="text-lg font-semibold text-slate-900 mb-2">Greška pri učitavanju prediktivne analize</h4>
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
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUpIcon size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Prediktivna analitika</h3>
              <p className="text-slate-600 mt-1">AI model za predviđanje radnih naloga i potrebnih resursa</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {onTimeRangeChange && (
              <select
                value={timeRange}
                onChange={(e) => onTimeRangeChange(e.target.value)}
                className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
              >
                <option value="7d">Poslednja 7 dana</option>
                <option value="30d">Poslednja 30 dana</option>
                <option value="90d">Poslednja 3 meseca</option>
                <option value="180d">Poslednja 6 meseci</option>
              </select>
            )}

            <select
              value={predictionHorizon}
              onChange={(e) => setPredictionHorizon(e.target.value)}
              className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
            >
              <option value="7d">Predviđanje 7 dana</option>
              <option value="14d">Predviđanje 14 dana</option>
              <option value="30d">Predviđanje 30 dana</option>
              <option value="90d">Predviđanje 90 dana</option>
            </select>

            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
            >
              <option value="trend">Trend model</option>
              <option value="seasonal">Sezonski model</option>
              <option value="advanced">Napredni model</option>
            </select>

            {onExport && (
              <Button
                type="secondary"
                size="small"
                onClick={() => onExport(predictiveAnalysis)}
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

      {/* Alerts */}
      {predictiveAnalysis.alerts.length > 0 && (
        <div className="p-6 border-b border-slate-200 bg-red-50">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Upozorenja</h4>
          <div className="space-y-3">
            {predictiveAnalysis.alerts.map((alert, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className={cn("px-2 py-1 rounded-full text-xs font-medium", getSeverityColor(alert.severity))}>
                  {alert.severity === 'high' ? 'VISOKO' : alert.severity === 'medium' ? 'SREDNJE' : 'NISKO'}
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-slate-900">{alert.title}</h5>
                  <p className="text-sm text-slate-600">{alert.message}</p>
                  {alert.date && <p className="text-xs text-slate-500 mt-1">Datum: {alert.date}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Predictions */}
      <div className="p-6">
        {predictiveAnalysis.predictions.length === 0 ? (
          <div className="text-center py-8">
            <BarChartIcon size={48} className="text-slate-400 mb-4 mx-auto" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Nedovoljno podataka</h4>
            <p className="text-slate-600">Potrebno je više istorijskih podataka za generisanje predviđanja.</p>
          </div>
        ) : (
          <div>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Ukupno predviđeno</p>
                    <h3 className="text-2xl font-bold text-slate-900 tabular-nums">
                      {predictiveAnalysis.resourceForecasts.totalPredictedWorkOrders}
                    </h3>
                    <p className="text-xs text-purple-700">radnih naloga</p>
                  </div>
                  <div className="p-2 bg-purple-200 rounded-lg">
                    <ChartIcon size={20} className="text-purple-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Potrebno tehničara</p>
                    <h3 className="text-2xl font-bold text-slate-900 tabular-nums">
                      {predictiveAnalysis.resourceForecasts.requiredTechnicians}
                    </h3>
                    <p className="text-xs text-blue-700">za period</p>
                  </div>
                  <div className="p-2 bg-blue-200 rounded-lg">
                    <UsersIcon size={20} className="text-blue-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Trend</p>
                    <h3 className="text-2xl font-bold text-slate-900 tabular-nums">
                      {predictiveAnalysis.trends.direction === 'increasing' ? '↗' :
                       predictiveAnalysis.trends.direction === 'decreasing' ? '↘' : '→'}
                      {predictiveAnalysis.trends.magnitude.toFixed(1)}%
                    </h3>
                    <p className="text-xs text-green-700">{predictiveAnalysis.trends.classification}</p>
                  </div>
                  <div className="p-2 bg-green-200 rounded-lg">
                    <TrendingUpIcon size={20} className="text-green-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-orange-600 uppercase tracking-wider">Vrhunski dan</p>
                    <h3 className="text-2xl font-bold text-slate-900 tabular-nums">
                      {predictiveAnalysis.resourceForecasts.peakDay?.predictedWorkOrders || 0}
                    </h3>
                    <p className="text-xs text-orange-700">
                      {predictiveAnalysis.resourceForecasts.peakDay?.date?.split('-')[2] || 'N/A'}. dan
                    </p>
                  </div>
                  <div className="p-2 bg-orange-200 rounded-lg">
                    <CalendarIcon size={20} className="text-orange-700" />
                  </div>
                </div>
              </div>
            </div>

            {/* Predictions Chart Visualization */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-slate-900 mb-4">Predviđanja po danima</h4>
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200">
                <div className="grid grid-cols-7 gap-2">
                  {predictiveAnalysis.predictions.slice(0, 21).map((prediction, index) => {
                    const maxValue = Math.max(...predictiveAnalysis.predictions.map(p => p.predictedWorkOrders));
                    const height = (prediction.predictedWorkOrders / maxValue) * 100;

                    return (
                      <div key={index} className="text-center">
                        <div className="h-24 flex flex-col justify-end mb-2">
                          <div
                            className="bg-purple-500 rounded-t transition-all duration-300 hover:bg-purple-600"
                            style={{ height: `${Math.max(height, 10)}%` }}
                            title={`${prediction.date}: ${prediction.predictedWorkOrders} naloga (${prediction.confidence.toFixed(0)}% pouzdanost)`}
                          />
                        </div>
                        <div className="text-xs text-slate-600">
                          {new Date(prediction.date).getDate()}
                        </div>
                        <div className="text-xs font-medium text-slate-900">
                          {prediction.predictedWorkOrders}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-slate-900 mb-4">Preporuke</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {predictiveAnalysis.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={cn(
                      "rounded-xl p-4 border transition-all duration-200",
                      getPriorityColor(rec.priority)
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-semibold">{rec.title}</h5>
                      <div className="flex items-center space-x-1">
                        {rec.impact === 'positive' && <CheckIcon size={14} className="text-green-600" />}
                        {rec.impact === 'warning' && <AlertTriangleIcon size={14} className="text-orange-600" />}
                      </div>
                    </div>
                    <p className="text-sm mb-2">{rec.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs bg-white/50 px-2 py-1 rounded-full">
                        {rec.category}
                      </span>
                      <span className="text-xs font-medium">
                        Prioritet: {rec.priority === 'high' ? 'Visok' : rec.priority === 'medium' ? 'Srednji' : 'Nizak'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Information */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="text-lg font-semibold text-slate-900 mb-4">Informacije o modelu</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-700">Tip modela:</span>
                  <p className="text-slate-600">
                    {modelType === 'trend' ? 'Trend analiza' :
                     modelType === 'seasonal' ? 'Sezonska analiza' : 'Napredni hibridni model'}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Nivo pouzdanosti:</span>
                  <p className="text-slate-600">{confidenceLevel}%</p>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Horizont predviđanja:</span>
                  <p className="text-slate-600">{predictionHorizon.replace('d', ' dana')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictiveAnalytics;