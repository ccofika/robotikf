import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { RefreshCw, Download, Sun, Moon, TriangleAlert } from 'lucide-react';
import { cx, Btn } from '../../security/sx/ui';
import { Panel, Note, Stat, KV } from '../../security/sx/layout';
import { Select } from '../../security/sx/forms';
import { Loading } from '../../montaza/ui';

const pad2 = (n) => n.toString().padStart(2, '0');

// Oblačić stubića: sat, broj aktivnosti, tehničari, opštine, prosek (kao ranije)
const HourTip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const { hour, activities, hourData } = payload[0].payload;
  if (!activities) return null;
  return (
    <div className="mx-logdash-tip">
      <span className="mx-logdash-tip__title">{pad2(hour)}:00</span>
      <div className="mx-logdash-tip__row"><span className="mx-logdash-tip__key">aktivnosti</span><b>{activities}</b></div>
      {hourData && (
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
  );
};

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


  const getTimeIcon = (hour) => {
    if (hour >= 6 && hour < 18) return <Sun size={15} strokeWidth={1.9} aria-hidden="true" />;
    return <Moon size={15} strokeWidth={1.9} aria-hidden="true" />;
  };

  const formatTime = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  // Stubići za svih 24 sata, uvek po redu sati (kao ranije)
  const chartData = [...Array(24)].map((_, hour) => {
    const hourData = hourlyAnalysis.hourlyData.find(h => h.hour === hour);
    return { hour, activities: hourData?.totalActivities || 0, hourData };
  });

  if (loading) {
    return <Loading rows={4} h={64} />;
  }

  if (error) {
    return (
      <Note tone="bad" icon={TriangleAlert} actions={onRefresh && (
        <Btn size="sm" icon={RefreshCw} onClick={onRefresh}>Pokušaj ponovo</Btn>
      )}>
        <h4 className="mx-logdash-note__title">Greška pri učitavanju</h4>
        <p>{error}</p>
      </Note>
    );
  }

  const tod = hourlyAnalysis.statistics.timeOfDayDistribution;

  return (
    <div className={cx('mx-logdash-sec', className)}>
      {/* Zaglavlje */}
      <div className="mx-logdash-sec__head">
        <div className="mx-logdash-sec__titles">
          <h3 className="mx-logdash-sec__title">Distribucija aktivnosti tokom dana</h3>
          <p className="mx-logdash-sec__lead">Analiza aktivnosti po satima i danima u nedelji</p>
        </div>

        <div className="mx-logdash-sec__tools">
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

      {/* Statistics Overview */}
      <div className="sx-stats">
        <Stat label="Ukupno aktivnosti" value={hourlyAnalysis.statistics.totalActivities} />
        <Stat label="Najaktivniji sat" value={formatTime(hourlyAnalysis.statistics.mostActiveHour?.hour || 0)} />
        <Stat label="Prosek po satu" value={Math.round(hourlyAnalysis.statistics.averageActivitiesPerHour)} />
        <Stat label="Vrhunski sati" value={hourlyAnalysis.peakHours.length} />
      </div>

      {/* Time of day distribution */}
      <div className="sx-stats mx-logdash-stats2">
        <Stat label={<><Sun size={13} strokeWidth={2} aria-hidden="true" />Jutro (6-12h)</>} value={tod?.morning?.count || 0} sub={`${(tod?.morning?.percentage || 0).toFixed(1)}%`} />
        <Stat label={<><Sun size={13} strokeWidth={2} aria-hidden="true" />Popodne (12-18h)</>} value={tod?.afternoon?.count || 0} sub={`${(tod?.afternoon?.percentage || 0).toFixed(1)}%`} />
        <Stat label={<><Moon size={13} strokeWidth={2} aria-hidden="true" />Veče (18-24h)</>} value={tod?.evening?.count || 0} sub={`${(tod?.evening?.percentage || 0).toFixed(1)}%`} />
        <Stat label={<><Moon size={13} strokeWidth={2} aria-hidden="true" />Noć (0-6h)</>} value={tod?.night?.count || 0} sub={`${(tod?.night?.percentage || 0).toFixed(1)}%`} />
      </div>

      {/* Hourly Data Visualization */}
      {hourlyAnalysis.hourlyData.length === 0 ? (
        <Panel>
          <div className="sx-empty-block">
            <h4>Nema podataka</h4>
            <span>Nema aktivnosti za izabrani period i dan.</span>
          </div>
        </Panel>
      ) : (
        <>
          <Panel title="Aktivnosti po satima" sub="Aktivnost tokom dana">
            <div className="mx-logdash-mini">
              <div><b>{hourlyAnalysis.statistics.totalActivities}</b><span>Ukupno</span></div>
              <div><b>{hourlyAnalysis.statistics.mostActiveHour?.displayTime || '00:00'}</b><span>Najaktivniji</span></div>
              <div><b>{Math.round(hourlyAnalysis.statistics.averageActivitiesPerHour || 0)}</b><span>Prosek/sat</span></div>
              <div><b>{hourlyAnalysis.peakHours.length}</b><span>Vrhovi</span></div>
            </div>

            <div className="mx-logdash-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="16%">
                  <CartesianGrid vertical={false} stroke="var(--sx-line)" />
                  <XAxis dataKey="hour" interval={5} tickFormatter={pad2} tickLine={false} axisLine={{ stroke: 'var(--sx-line-2)' }} tick={{ fill: 'var(--sx-muted)' }} />
                  <YAxis width={36} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--sx-muted)' }} />
                  <Tooltip content={<HourTip />} cursor={{ fill: 'var(--sx-surface-2)' }} isAnimationActive={false} />
                  <Bar dataKey="activities" fill="var(--sx-text)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Delovi dana (ispod odgovarajućih sati) */}
            <div className="mx-logdash-periods">
              <span><Moon size={14} strokeWidth={1.9} aria-hidden="true" />Noć (0-6h)</span>
              <span><Sun size={14} strokeWidth={1.9} aria-hidden="true" />Jutro (6-12h)</span>
              <span><Sun size={14} strokeWidth={1.9} aria-hidden="true" />Popodne (12-18h)</span>
              <span><Moon size={14} strokeWidth={1.9} aria-hidden="true" />Veče (18-24h)</span>
            </div>
          </Panel>

          {/* Peak Hours */}
          {hourlyAnalysis.peakHours.length > 0 && (
            <Panel title="Vrhunski sati">
              <div className="mx-logdash-peaks">
                {hourlyAnalysis.peakHours.map((peak, index) => (
                  <div key={peak.hour} className="mx-logdash-peak">
                    <div className="mx-logdash-peak__head">
                      <span className="mx-logdash-peak__time">{getTimeIcon(peak.hour)}{peak.displayTime}</span>
                      <span className={cx('sx-tag', index === 0 && 'is-ink')}>#{index + 1}</span>
                    </div>
                    <KV items={[
                      { k: 'Aktivnosti', v: <span className="sx-mono">{peak.totalActivities}</span> },
                      { k: 'Procenat', v: <span className="sx-mono">{peak.percentage.toFixed(1)}%</span> },
                      { k: 'Tehničari', v: <span className="sx-mono">{peak.technicians.length}</span> },
                      { k: 'Opštine', v: <span className="sx-mono">{peak.municipalities.length}</span> }
                    ]} />
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* Detailed hourly breakdown table (24 reda: vodoravni skrol umesto kartica na telefonu) */}
          <Panel pad={false}>
            <div className="mx-scroll">
              <table className="sx-table">
                <thead>
                  <tr>
                    <th>Sat</th>
                    <th>Period</th>
                    <th className="is-num">Aktivnosti</th>
                    <th className="is-num">Procenat</th>
                    <th className="is-num">Tehničari</th>
                    <th className="is-num">Opštine</th>
                    <th className="is-num">Prosečno vreme</th>
                  </tr>
                </thead>
                <tbody>
                  {hourlyAnalysis.hourlyData.map((hour, index) => (
                    <tr key={hour.hour} style={{ '--i': index }}>
                      <td className="is-head"><span className="mx-logdash-period sx-mono">{getTimeIcon(hour.hour)}<b>{formatTime(hour.hour)}</b></span></td>
                      <td data-label="Period">
                        {hour.hour >= 6 && hour.hour < 12 ? 'Jutro' :
                         hour.hour >= 12 && hour.hour < 18 ? 'Popodne' :
                         hour.hour >= 18 && hour.hour < 24 ? 'Veče' : 'Noć'}
                      </td>
                      <td data-label="Aktivnosti" className="is-num">{hour.totalActivities}</td>
                      <td data-label="Procenat" className="is-num">{hour.percentage.toFixed(1)}%</td>
                      <td data-label="Tehničari" className="is-num">{hour.technicians.length}</td>
                      <td data-label="Opštine" className="is-num">{hour.municipalities.length}</td>
                      <td data-label="Prosečno vreme" className="is-num">
                        {hour.averageResponseTime > 0 ? `${Math.round(hour.averageResponseTime)}min` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
};

export default HourlyActivityDistribution;
