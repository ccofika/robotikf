import React from 'react';
import { MapPin, TriangleAlert, Clock, DollarSign, UserCheck, CircleCheck } from 'lucide-react';
import { cx, Sign, Led } from '../../security/sx/ui';

const KPICards = ({ kpiData, onCardClick, activeCard }) => {
  // KPI configuration with proper icons and descriptions
  const kpiConfig = [
    {
      id: 'map',
      title: 'Interactive Map',
      icon: MapPin,
      description: 'Interaktivna mapa aktivnosti',
      data: kpiData?.map || null,
      metrics: ['mapActivities', 'geoDistribution', 'locationInsights']
    },
    {
      id: 'cancellation',
      title: 'Cancellation Analysis',
      icon: TriangleAlert,
      description: 'Analiza otkazanih radnih naloga',
      data: kpiData?.cancellation || null,
      metrics: ['totalCancelled', 'cancellationReasons', 'trendAnalysis']
    },
    {
      id: 'hourly',
      title: 'Hourly Activity',
      icon: Clock,
      description: 'Distribucija aktivnosti po satima',
      data: kpiData?.hourly || null,
      metrics: ['hourlyDistribution', 'peakHours', 'workPatterns']
    },
    {
      id: 'financial',
      title: 'Financial Analysis',
      icon: DollarSign,
      description: 'Finansijska analiza i troškovi',
      data: kpiData?.financial || null,
      metrics: ['totalRevenue', 'costAnalysis', 'profitMargins']
    },
    {
      id: 'technician',
      title: 'Technician Comparison',
      icon: UserCheck,
      description: 'Poređenje performansi tehničara',
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
      <CircleCheck size={16} strokeWidth={1.9} className="mx-logdash-kpi__state is-ok" aria-hidden="true" />
    ) : (
      <Clock size={16} strokeWidth={1.9} className="mx-logdash-kpi__state is-idle" aria-hidden="true" />
    );
  };

  return (
    <div className="mx-logdash-kpis">
      {kpiConfig.map((config, i) => {
        const IconComponent = config.icon;
        const isActive = activeCard === config.id;
        const hasData = config.data !== null;

        return (
          <div
            key={config.id}
            role="button"
            tabIndex={0}
            onClick={() => onCardClick(config.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(config.id); } }}
            className={cx('sx-card mx-logdash-kpi', isActive && 'is-active')}
            style={{ '--i': i }}
          >
            {/* Header */}
            <div className="mx-logdash-kpi__top">
              <span className="sx-item__icon"><IconComponent size={20} strokeWidth={1.8} aria-hidden="true" /></span>
              {getStatusIcon(hasData)}
            </div>

            {/* Title */}
            <h3 className="mx-logdash-kpi__title">{config.title}</h3>

            {/* Description */}
            <p className="mx-logdash-kpi__desc">{config.description}</p>

            {/* Status and Stats */}
            <div className="mx-logdash-kpi__status">
              {hasData ? (
                config.data.isStatsOnly ? (
                  <>
                    <Sign tone="info">{config.data.total} stavki</Sign>
                    <small>Kliknite za detalje</small>
                  </>
                ) : (
                  <>
                    <Sign tone="ok">Data Loaded</Sign>
                    <small>Ready</small>
                  </>
                )
              ) : (
                <Sign tone="idle">Click to load</Sign>
              )}
            </div>

            {/* Active indicator */}
            {isActive && <Led tone="info" live className="mx-logdash-kpi__dot" />}

            {/* Data loaded indicator */}
            {hasData && !isActive && <Led tone="ok" live className="mx-logdash-kpi__dot" />}
          </div>
        );
      })}
    </div>
  );
};

export default KPICards;
