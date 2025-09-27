import React from 'react';
import {
  ActivityIcon,
  CheckCircleIcon,
  UsersIcon,
  ClockIcon,
  TrendingUpIcon,
  BarChartIcon,
  AlertTriangleIcon,
  MapPinIcon,
  DollarSignIcon,
  UserCheckIcon,
  CalendarIcon,
  PieChartIcon
} from '../icons/SvgIcons';

const KPICards = ({ kpiData, onCardClick, activeCard }) => {
  // KPI configuration with proper icons and descriptions
  const kpiConfig = [
    {
      id: 'map',
      title: 'Interactive Map',
      icon: MapPinIcon,
      description: 'Interaktivna mapa aktivnosti',
      color: 'bg-orange-500',
      data: kpiData?.map || null,
      metrics: ['mapActivities', 'geoDistribution', 'locationInsights']
    },
    {
      id: 'cancellation',
      title: 'Cancellation Analysis',
      icon: AlertTriangleIcon,
      description: 'Analiza otkazanih radnih naloga',
      color: 'bg-red-500',
      data: kpiData?.cancellation || null,
      metrics: ['totalCancelled', 'cancellationReasons', 'trendAnalysis']
    },
    {
      id: 'hourly',
      title: 'Hourly Activity',
      icon: ClockIcon,
      description: 'Distribucija aktivnosti po satima',
      color: 'bg-indigo-500',
      data: kpiData?.hourly || null,
      metrics: ['hourlyDistribution', 'peakHours', 'workPatterns']
    },
    {
      id: 'financial',
      title: 'Financial Analysis',
      icon: DollarSignIcon,
      description: 'Finansijska analiza i troškovi',
      color: 'bg-yellow-500',
      data: kpiData?.financial || null,
      metrics: ['totalRevenue', 'costAnalysis', 'profitMargins']
    },
    {
      id: 'technician',
      title: 'Technician Comparison',
      icon: UserCheckIcon,
      description: 'Poređenje performansi tehničara',
      color: 'bg-teal-500',
      data: kpiData?.technician || null,
      metrics: ['technicianStats', 'performanceMetrics', 'efficiency']
    }
  ];

  const formatMetricValue = (value) => {
    if (typeof value === 'number') {
      if (value > 1000) {
        return (value / 1000).toFixed(1) + 'k';
      }
      return value.toLocaleString();
    }
    return value || 'N/A';
  };

  const getStatusIcon = (hasData) => {
    return hasData ? (
      <CheckCircleIcon className="w-4 h-4 text-green-500" />
    ) : (
      <ClockIcon className="w-4 h-4 text-gray-400" />
    );
  };

  return (
    <div className="kpi-cards-grid">
      {kpiConfig.map((config) => {
        const IconComponent = config.icon;
        const isActive = activeCard === config.id;
        const hasData = config.data !== null;

        return (
          <div
            key={config.id}
            onClick={() => onCardClick(config.id)}
            className={`kpi-card ${isActive ? 'active' : ''}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className={`kpi-card-icon ${config.color}`}>
                <IconComponent className="w-6 h-6" />
              </div>
              {getStatusIcon(hasData)}
            </div>

            {/* Title */}
            <h3 className="kpi-card-title">
              {config.title}
            </h3>

            {/* Description */}
            <p className="kpi-card-description">
              {config.description}
            </p>

            {/* Status and Stats */}
            <div className="kpi-card-status">
              {hasData ? (
                <div>
                  {config.data.isStatsOnly ? (
                    <div>
                      <span style={{color: '#3b82f6', fontWeight: '500', fontSize: '14px'}}>
                        {config.data.total} stavki
                      </span>
                      <span style={{color: '#6b7280', fontSize: '12px', display: 'block'}}>
                        Kliknite za detalje
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span style={{color: '#22c55e', fontWeight: '500'}}>Data Loaded</span>
                      <span style={{color: '#374151', fontSize: '12px', display: 'block'}}>
                        Ready
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <span style={{color: '#6b7280'}}>Click to load</span>
              )}
            </div>

            {/* Active indicator */}
            {isActive && (
              <div className="kpi-card-indicator" style={{background: '#3b82f6'}}></div>
            )}

            {/* Data loaded indicator */}
            {hasData && !isActive && (
              <div className="kpi-card-indicator" style={{background: '#22c55e'}}></div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default KPICards;