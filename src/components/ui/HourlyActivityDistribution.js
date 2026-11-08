import React, { useMemo, useState } from 'react';
import { Clock, ChartColumn, RefreshCw, Download, Sun, Moon, TriangleAlert } from 'lucide-react';
import { cx, Btn } from '../../security/sx/ui';
import { Select } from '../../security/sx/forms';
import { Loading } from '../../montaza/ui';

const HourlyActivityDistribution = ({
  data = [],
  loading = false,
  error = null,
  timeRange = '30d',
  onTimeRangeChange,
  onRefresh,
  onExport,
  className = ''
}) => {
  const [selectedDay, setSelectedDay] = useState('all');
  const [sortBy, setSortBy] = useState('hour');

  // Helper function - must be defined before useMemo
  const getDayDisplayName = (day) => {
    const dayNames = {
      sunday: 'Nedelja',
      monday: 'Ponedeljak',
      tuesday: 'Utorak',
      wednesday: 'Sreda',
      thursday: 'Četvrtak',
      friday: 'Petak',
      saturday: 'Subota'
    };
    return dayNames[day] || day;
  };

  const filterByDay = (hourlyData, day) => {
    if (day === 'all') return hourlyData;

    return hourlyData.map(hour => ({
      ...hour,
      totalActivities: hour.dayBreakdown[day] || 0,
      percentage: ((hour.dayBreakdown[day] || 0) / data.length) * 100
    }));
  };

  // Process hourly activity data
  const hourlyAnalysis = useMemo(() => {
    if (!data.length) return {
      hourlyData: [],
      peakHours: [],
      statistics: {},
      dayOfWeekData: {},
      activityTypes: []
    };

    // Group activities by hour (0-23)
    const hourGroups = {};
    const dayOfWeekGroups = {};
    const activityTypeGroups = {};

    // Initialize hour groups
    for (let hour = 0; hour < 24; hour++) {
      hourGroups[hour] = {
        hour,
        totalActivities: 0,
        technicians: new Set(),
        municipalities: new Set(),
        activities: [],
        activityTypes: {},
        averageResponseTime: 0,
        totalResponseTime: 0,
        dayBreakdown: {
          monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
          friday: 0, saturday: 0, sunday: 0
        }
      };
    }

    // Initialize day of week groups
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    daysOfWeek.forEach(day => {
      dayOfWeekGroups[day] = {
        day,
        displayName: getDayDisplayName(day),
        totalActivities: 0,
        hourlyDistribution: {}
      };
    });

    // Process each activity
    data.forEach(activity => {
      const timestamp = new Date(activity.timestamp);
      const hour = timestamp.getHours();
      const dayOfWeek = daysOfWeek[timestamp.getDay()];

      // Update hourly data
      if (hourGroups[hour]) {
        hourGroups[hour].totalActivities++;
        hourGroups[hour].technicians.add(activity.technician);
        hourGroups[hour].municipalities.add(activity.municipality);
        hourGroups[hour].activities.push(activity);

        // Track activity types
        const activityType = activity.action || activity.activityType || 'Unknown';
        hourGroups[hour].activityTypes[activityType] = (hourGroups[hour].activityTypes[activityType] || 0) + 1;

        // Track response time
        const responseTime = activity.responseTime || 0;
        hourGroups[hour].totalResponseTime += responseTime;

        // Update day breakdown
        hourGroups[hour].dayBreakdown[dayOfWeek]++;
      }

      // Update day of week data
      if (dayOfWeekGroups[dayOfWeek]) {
        dayOfWeekGroups[dayOfWeek].totalActivities++;
        if (!dayOfWeekGroups[dayOfWeek].hourlyDistribution[hour]) {
          dayOfWeekGroups[dayOfWeek].hourlyDistribution[hour] = 0;
        }
        dayOfWeekGroups[dayOfWeek].hourlyDistribution[hour]++;
      }

      // Update activity type groups
      const activityType = activity.action || activity.activityType || 'Unknown';
      if (!activityTypeGroups[activityType]) {
        activityTypeGroups[activityType] = {
          type: activityType,
          count: 0,
          hourlyDistribution: {}
        };
      }
      activityTypeGroups[activityType].count++;
      if (!activityTypeGroups[activityType].hourlyDistribution[hour]) {
        activityTypeGroups[activityType].hourlyDistribution[hour] = 0;
      }
      activityTypeGroups[activityType].hourlyDistribution[hour]++;
    });

    // Calculate averages and convert sets to arrays
    const hourlyData = Object.values(hourGroups).map(group => ({
      ...group,
      technicians: Array.from(group.technicians),
      municipalities: Array.from(group.municipalities),
      averageResponseTime: group.totalActivities > 0 ? group.totalResponseTime / group.totalActivities : 0,
      percentage: (group.totalActivities / data.length) * 100
    }));

    // Sort hourly data
    hourlyData.sort((a, b) => {
      switch (sortBy) {
        case 'activities':
          return b.totalActivities - a.totalActivities;
        case 'percentage':
          return b.percentage - a.percentage;
        case 'responseTime':
          return b.averageResponseTime - a.averageResponseTime;
        default:
          return a.hour - b.hour;
      }
    });

    // Identify peak hours (top 3)
    const peakHours = [...hourlyData]
      .sort((a, b) => b.totalActivities - a.totalActivities)
      .slice(0, 3)
      .map(hour => ({
        ...hour,
        displayTime: `${hour.hour.toString().padStart(2, '0')}:00`
      }));

    // Calculate statistics
    const totalActivities = data.length;
    const mostActiveHour = hourlyData.reduce((max, current) =>
      current.totalActivities > max.totalActivities ? current : max, hourlyData[0]);
    const leastActiveHour = hourlyData.reduce((min, current) =>
      current.totalActivities < min.totalActivities ? current : min, hourlyData[0]);

    const morningActivities = hourlyData.filter(h => h.hour >= 6 && h.hour < 12).reduce((sum, h) => sum + h.totalActivities, 0);
    const afternoonActivities = hourlyData.filter(h => h.hour >= 12 && h.hour < 18).reduce((sum, h) => sum + h.totalActivities, 0);
    const eveningActivities = hourlyData.filter(h => h.hour >= 18 && h.hour < 24).reduce((sum, h) => sum + h.totalActivities, 0);
    const nightActivities = hourlyData.filter(h => h.hour >= 0 && h.hour < 6).reduce((sum, h) => sum + h.totalActivities, 0);

    const statistics = {
      totalActivities,
      mostActiveHour: {
        hour: mostActiveHour.hour,
        count: mostActiveHour.totalActivities,
        displayTime: `${mostActiveHour.hour.toString().padStart(2, '0')}:00`
      },
      leastActiveHour: {
        hour: leastActiveHour.hour,
        count: leastActiveHour.totalActivities,
        displayTime: `${leastActiveHour.hour.toString().padStart(2, '0')}:00`
      },
      averageActivitiesPerHour: totalActivities / 24,
      timeOfDayDistribution: {
        morning: { count: morningActivities, percentage: (morningActivities / totalActivities) * 100 },
        afternoon: { count: afternoonActivities, percentage: (afternoonActivities / totalActivities) * 100 },
        evening: { count: eveningActivities, percentage: (eveningActivities / totalActivities) * 100 },
        night: { count: nightActivities, percentage: (nightActivities / totalActivities) * 100 }
      }
    };

    return {
      hourlyData: selectedDay === 'all' ? hourlyData : filterByDay(hourlyData, selectedDay),
      peakHours,
      statistics,
      dayOfWeekData: Object.values(dayOfWeekGroups),
      activityTypes: Object.values(activityTypeGroups).sort((a, b) => b.count - a.count)
    };
  }, [data, sortBy, selectedDay]);


  // Deo dana po satu (boja stubića i oznake, ista podela kao ranije)
  const getPeriodClass = (hour) => {
    if (hour >= 6 && hour < 12) return 'mx-logdash-c--morning'; // Morning
    if (hour >= 12 && hour < 18) return 'mx-logdash-c--afternoon'; // Afternoon
    if (hour >= 18 && hour < 24) return 'mx-logdash-c--evening'; // Evening
    return 'mx-logdash-c--night'; // Night
  };

  const getTimeIcon = (hour) => {
    if (hour >= 6 && hour < 18) return <Sun size={16} strokeWidth={1.9} aria-hidden="true" />;
    return <Moon size={16} strokeWidth={1.9} aria-hidden="true" />;
  };

  const formatTime = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  if (loading) {
    return (
      <div className={cx('mx-logdash-comp', className)}>
        <Loading rows={4} h={64} />
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
            <span className="sx-item__icon"><Clock size={18} strokeWidth={1.9} aria-hidden="true" /></span>
            <div className="mx-logdash-comp__titles">
              <h3 className="mx-logdash-comp__title">Distribucija aktivnosti tokom dana</h3>
              <p className="mx-logdash-comp__lead">Analiza aktivnosti po satima i danima u nedelji</p>
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

            <Select size="sm" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} aria-label="Dan u nedelji">
              <option value="all">Svi dani</option>
              <option value="monday">Ponedeljak</option>
              <option value="tuesday">Utorak</option>
              <option value="wednesday">Sreda</option>
              <option value="thursday">Četvrtak</option>
              <option value="friday">Petak</option>
              <option value="saturday">Subota</option>
              <option value="sunday">Nedelja</option>
            </Select>

            <Select size="sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sortiranje">
              <option value="hour">Po satu</option>
              <option value="activities">Po broju aktivnosti</option>
              <option value="percentage">Po procentu</option>
              <option value="responseTime">Po vremenu odgovora</option>
            </Select>

            {onExport && (
              <Btn size="sm" icon={Download} onClick={() => onExport(hourlyAnalysis)}>Export</Btn>
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
          <div><b>{hourlyAnalysis.statistics.totalActivities}</b><span>Ukupno aktivnosti</span></div>
          <div><b>{formatTime(hourlyAnalysis.statistics.mostActiveHour?.hour || 0)}</b><span>Najaktivniji sat</span></div>
          <div><b>{Math.round(hourlyAnalysis.statistics.averageActivitiesPerHour)}</b><span>Prosek po satu</span></div>
          <div><b>{hourlyAnalysis.peakHours.length}</b><span>Vrhunski sati</span></div>
        </div>

        {/* Time of day distribution */}
        <div className="mx-logdash-tods">
          <div className="mx-logdash-tod mx-logdash-c--morning">
            <span className="mx-logdash-tod__label"><Sun size={16} strokeWidth={1.9} aria-hidden="true" />Jutro (6-12h)</span>
            <b className="sx-num">{hourlyAnalysis.statistics.timeOfDayDistribution?.morning?.count || 0}</b>
            <small>{(hourlyAnalysis.statistics.timeOfDayDistribution?.morning?.percentage || 0).toFixed(1)}%</small>
          </div>

          <div className="mx-logdash-tod mx-logdash-c--afternoon">
            <span className="mx-logdash-tod__label"><Sun size={16} strokeWidth={1.9} aria-hidden="true" />Popodne (12-18h)</span>
            <b className="sx-num">{hourlyAnalysis.statistics.timeOfDayDistribution?.afternoon?.count || 0}</b>
            <small>{(hourlyAnalysis.statistics.timeOfDayDistribution?.afternoon?.percentage || 0).toFixed(1)}%</small>
          </div>

          <div className="mx-logdash-tod mx-logdash-c--evening">
            <span className="mx-logdash-tod__label"><Moon size={16} strokeWidth={1.9} aria-hidden="true" />Veče (18-24h)</span>
            <b className="sx-num">{hourlyAnalysis.statistics.timeOfDayDistribution?.evening?.count || 0}</b>
            <small>{(hourlyAnalysis.statistics.timeOfDayDistribution?.evening?.percentage || 0).toFixed(1)}%</small>
          </div>

          <div className="mx-logdash-tod mx-logdash-c--night">
            <span className="mx-logdash-tod__label"><Moon size={16} strokeWidth={1.9} aria-hidden="true" />Noć (0-6h)</span>
            <b className="sx-num">{hourlyAnalysis.statistics.timeOfDayDistribution?.night?.count || 0}</b>
            <small>{(hourlyAnalysis.statistics.timeOfDayDistribution?.night?.percentage || 0).toFixed(1)}%</small>
          </div>
        </div>
      </div>

      {/* Hourly Data Visualization */}
      <div className="mx-logdash-comp__body">
        {hourlyAnalysis.hourlyData.length === 0 ? (
          <div className="mx-logdash-empty">
            <span className="sx-item__icon"><ChartColumn size={22} strokeWidth={1.8} aria-hidden="true" /></span>
            <h4>Nema podataka</h4>
            <p>Nema aktivnosti za izabrani period i dan.</p>
          </div>
        ) : (
          <>
            {/* Hourly Activity Chart */}
            <div className="mx-logdash-sub">
              <div className="mx-logdash-headrow">
                <h3 className="mx-logdash-h">Aktivnosti po satima</h3>
                <span className="mx-logdash-legend">
                  <span className="mx-logdash-legend__item is-dot" style={{ '--c': 'var(--sx-line-3)' }}>Aktivnost tokom dana</span>
                </span>
              </div>

              <div className="mx-logdash-box">
                {/* Stats Summary Bar */}
                <div className="mx-logdash-mini is-center">
                  <div><b>{hourlyAnalysis.statistics.totalActivities}</b><span>Ukupno</span></div>
                  <div><b>{hourlyAnalysis.statistics.mostActiveHour?.displayTime || '00:00'}</b><span>Najaktivniji</span></div>
                  <div><b>{Math.round(hourlyAnalysis.statistics.averageActivitiesPerHour || 0)}</b><span>Prosek/sat</span></div>
                  <div><b>{hourlyAnalysis.peakHours.length}</b><span>Vrhovi</span></div>
                </div>

                {/* Chart Area */}
                {(() => {
                  const maxActivities = Math.max(...hourlyAnalysis.hourlyData.map(h => h.totalActivities)) || 1;
                  const steps = [maxActivities, Math.round(maxActivities * 0.75), Math.round(maxActivities * 0.5), Math.round(maxActivities * 0.25), 0];

                  return (
                    <div className="mx-logdash-hchart">
                      {/* Y-axis labels */}
                      <div className="mx-logdash-hchart__y" aria-hidden="true">
                        {steps.map((value, index) => (
                          <span key={index} style={{ top: `${index * 25}%` }}>{value}</span>
                        ))}
                      </div>

                      <div className="mx-logdash-hchart__plot">
                        {/* Horizontal grid lines */}
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="mx-logdash-hchart__grid" style={{ top: `${i * 25}%` }} />
                        ))}

                        {/* Activity Bars */}
                        <div className="mx-logdash-hchart__bars">
                          {[...Array(24)].map((_, hour) => {
                            const hourData = hourlyAnalysis.hourlyData.find(h => h.hour === hour);
                            const activities = hourData?.totalActivities || 0;
                            const heightPercent = maxActivities > 0 ? (activities / maxActivities) * 100 : 0;

                            return (
                              <div key={hour} className={cx('mx-logdash-hchart__col', getPeriodClass(hour))}>
                                {/* Activity Count Badge */}
                                {activities > 0 && (
                                  <div className={cx('mx-logdash-hchart__badge', hour < 4 && 'is-start', hour > 19 && 'is-end')}>
                                    {activities}

                                    {/* Badge Tooltip */}
                                    <div className="mx-logdash-tip">
                                      <span className="mx-logdash-tip__title">{hour.toString().padStart(2, '0')}:00</span>
                                      <div><span className="mx-logdash-tip__big">{activities}</span> <span className="mx-logdash-tip__key">aktivnosti</span></div>
                                      {hourData && activities > 0 && (
                                        <>
                                          <div className="mx-logdash-tip__sep" />
                                          <div className="mx-logdash-tip__row"><span className="mx-logdash-tip__key">Tehničari:</span><b>{hourData.technicians.length}</b></div>
                                          <div className="mx-logdash-tip__row"><span className="mx-logdash-tip__key">Opštine:</span><b>{hourData.municipalities.length}</b></div>
                                          {hourData.averageResponseTime > 0 && (
                                            <div className="mx-logdash-tip__row"><span className="mx-logdash-tip__key">Prosek:</span><b>{Math.round(hourData.averageResponseTime)}min</b></div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Bar */}
                                <div
                                  className="mx-logdash-hchart__bar"
                                  style={{
                                    height: activities > 0 ? `${heightPercent}%` : '0%',
                                    minHeight: activities > 0 ? '8px' : '0px'
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* X-axis labels */}
                      <div className="mx-logdash-hchart__x" aria-hidden="true">
                        {[...Array(24)].map((_, hour) => (
                          <span key={hour} className={cx(hour % 6 === 0 && 'is-mark')}>
                            {hour % 6 === 0 ? hour.toString().padStart(2, '0') : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Time Period Legend */}
                <div className="mx-logdash-legend is-center mx-logdash-hchart__legend">
                  <span className="mx-logdash-legend__item mx-logdash-c--night">Noć (0-6h)</span>
                  <span className="mx-logdash-legend__item mx-logdash-c--morning">Jutro (6-12h)</span>
                  <span className="mx-logdash-legend__item mx-logdash-c--afternoon">Popodne (12-18h)</span>
                  <span className="mx-logdash-legend__item mx-logdash-c--evening">Veče (18-24h)</span>
                </div>
              </div>
            </div>

            {/* Peak Hours */}
            {hourlyAnalysis.peakHours.length > 0 && (
              <div className="mx-logdash-sub">
                <h4 className="mx-logdash-h">Vrhunski sati</h4>
                <div className="mx-logdash-peaks">
                  {hourlyAnalysis.peakHours.map((peak, index) => (
                    <div key={peak.hour} className="mx-logdash-peak">
                      <div className="mx-logdash-peak__head">
                        <span className="mx-logdash-peak__time">{getTimeIcon(peak.hour)}{peak.displayTime}</span>
                        <span className={cx('sx-tag', index === 0 && 'is-ink')}>#{index + 1}</span>
                      </div>

                      <div className="mx-logdash-rows">
                        <div><span>Aktivnosti:</span><b>{peak.totalActivities}</b></div>
                        <div><span>Procenat:</span><b>{peak.percentage.toFixed(1)}%</b></div>
                        <div><span>Tehničari:</span><b>{peak.technicians.length}</b></div>
                        <div><span>Opštine:</span><b>{peak.municipalities.length}</b></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed hourly breakdown table */}
            <div className="mx-logdash-tablebox">
              <div className="mx-scroll">
                <table className="sx-table">
                  <thead>
                    <tr>
                      <th>Sat</th>
                      <th>Period</th>
                      <th>Aktivnosti</th>
                      <th>Procenat</th>
                      <th>Tehničari</th>
                      <th>Opštine</th>
                      <th>Prosečno vreme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hourlyAnalysis.hourlyData.map((hour, index) => (
                      <tr key={hour.hour} style={{ '--i': index }}>
                        <td><span className="mx-logdash-period">{getTimeIcon(hour.hour)}<b>{formatTime(hour.hour)}</b></span></td>
                        <td>
                          <span className={cx('mx-logdash-legend__item', getPeriodClass(hour.hour))}>
                            {hour.hour >= 6 && hour.hour < 12 ? 'Jutro' :
                             hour.hour >= 12 && hour.hour < 18 ? 'Popodne' :
                             hour.hour >= 18 && hour.hour < 24 ? 'Veče' : 'Noć'}
                          </span>
                        </td>
                        <td className="mx-strong">{hour.totalActivities}</td>
                        <td>{hour.percentage.toFixed(1)}%</td>
                        <td>{hour.technicians.length}</td>
                        <td>{hour.municipalities.length}</td>
                        <td className="sx-mono">
                          {hour.averageResponseTime > 0 ? `${Math.round(hour.averageResponseTime)}min` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HourlyActivityDistribution;
