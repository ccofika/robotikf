import React, { useState, useMemo } from 'react';
import { X, ChartColumn, TrendingUp, TrendingDown, TriangleAlert, User, Clock, MapPin, RefreshCw, Download } from 'lucide-react';
import { cx, Btn } from '../../security/sx/ui';
import { Select } from '../../security/sx/forms';
import { Loading } from '../../montaza/ui';

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

  const getTrendIcon = (trend) => {
    if (trend > 0.1) return <TrendingUp size={16} strokeWidth={1.9} className="mx-logdash-trend is-bad" aria-hidden="true" />;
    if (trend < -0.1) return <TrendingDown size={16} strokeWidth={1.9} className="mx-logdash-trend is-good" aria-hidden="true" />;
    return <Clock size={16} strokeWidth={1.9} className="mx-logdash-trend is-flat" aria-hidden="true" />;
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    return `${Math.round(minutes / 60 * 10) / 10}h`;
  };

  if (loading) {
    return (
      <div className={cx('mx-logdash-comp', className)}>
        <Loading rows={5} h={56} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cx('mx-logdash-comp', className)}>
        <div className="mx-logdash-empty is-bad">
          <span className="sx-item__icon"><TriangleAlert size={22} strokeWidth={1.8} aria-hidden="true" /></span>
          <h4>Greška pri učitavanju</h4>
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
            <span className="sx-item__icon"><X size={18} strokeWidth={1.9} aria-hidden="true" /></span>
            <div className="mx-logdash-comp__titles">
              <h3 className="mx-logdash-comp__title">Analiza uzroka otkazivanja</h3>
              <p className="mx-logdash-comp__lead">Najčešći razlozi otkazivanja radnih naloga</p>
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
              <option value="count">Po broju slučajeva</option>
              <option value="percentage">Po procentu</option>
              <option value="trend">Po trendu</option>
              <option value="avgResponseTime">Po vremenu odgovora</option>
            </Select>

            {onExport && (
              <Btn size="sm" icon={Download} onClick={() => onExport(analysisData)}>Export</Btn>
            )}

            {onRefresh && (
              <Btn size="sm" icon={RefreshCw} onClick={onRefresh}>Osvježi</Btn>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="mx-logdash-comp__band">
        <div className="mx-logdash-mini is-center is-plain">
          <div><b>{analysisData.statistics.totalCancellations}</b><span>Ukupno otkazanih</span></div>
          <div><b className="mx-logdash-stat-text">{analysisData.statistics.mostCommonReason}</b><span>Najčešći razlog</span></div>
          <div><b>{formatTime(analysisData.statistics.avgResponseTime)}</b><span>Prosečno vreme</span></div>
          <div><b>{analysisData.statistics.affectedMunicipalities}</b><span>Pogođene opštine</span></div>
        </div>
      </div>

      {/* Reasons List */}
      <div className="mx-logdash-comp__body">
        {analysisData.reasons.length === 0 ? (
          <div className="mx-logdash-empty">
            <span className="sx-item__icon"><ChartColumn size={22} strokeWidth={1.8} aria-hidden="true" /></span>
            <h4>Nema podataka</h4>
            <p>Nema otkazanih naloga za izabrani period.</p>
          </div>
        ) : (
          <div className="mx-logdash-reasons">
            {analysisData.reasons.map((reason) => (
              <div key={reason.reason} className="mx-logdash-reason">
                <div className="mx-logdash-reason__head">
                  <span className="mx-logdash-reason__name">
                    <span>{reason.reason}</span>
                    {getTrendIcon(reason.trend)}
                  </span>
                  <div className="mx-logdash-reason__num">
                    <b className="sx-num">{reason.count}</b>
                    <span>{reason.percentage.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mx-logdash-meter" aria-hidden="true">
                  <i style={{ width: `${reason.percentage}%` }} />
                </div>

                {/* Details */}
                <div className="mx-logdash-facts">
                  <span><User size={14} strokeWidth={1.9} aria-hidden="true" />{reason.technicians.length} tehničara</span>
                  <span><MapPin size={14} strokeWidth={1.9} aria-hidden="true" />{reason.locations.length} opština</span>
                  <span><Clock size={14} strokeWidth={1.9} aria-hidden="true" />{formatTime(reason.avgResponseTime)} prosek</span>
                  <span>
                    <TrendingUp size={14} strokeWidth={1.9} aria-hidden="true" />
                    {reason.trend > 0 ? '+' : ''}{(reason.trend * 100).toFixed(1)}% trend
                  </span>
                </div>

                {/* Recent incidents count */}
                {reason.recentIncidents.length > 0 && (
                  <div className="mx-logdash-reason__recent">
                    {reason.recentIncidents.length} slučajeva u poslednjih 7 dana
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Peak Hours Info */}
      {analysisData.statistics.peakHours && (
        <div className="mx-logdash-comp__foot">
          <h4 className="mx-logdash-foot__title">
            <Clock size={16} strokeWidth={1.9} aria-hidden="true" />
            Kritična vremena za otkazivanja
          </h4>
          <p>Najveći broj otkazivanja se dešava u: {analysisData.statistics.peakHours}</p>
        </div>
      )}
    </div>
  );
};

export default CancellationAnalysis;
