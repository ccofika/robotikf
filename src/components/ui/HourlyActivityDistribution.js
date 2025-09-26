import React, { useMemo, useState } from 'react';
import {
  ClockIcon,
  BarChartIcon,
  TrendingUpIcon,
  RefreshIcon,
  DownloadIcon,
  FilterIcon,
  SunIcon,
  MoonIcon,
  AlertTriangleIcon
} from '../icons/SvgIcons';
import { Button } from './button-1';
import { cn } from '../../utils/cn';

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

  const getHourColor = (hour) => {
    if (hour >= 6 && hour < 12) return 'bg-yellow-100 border-yellow-300 text-yellow-800'; // Morning
    if (hour >= 12 && hour < 18) return 'bg-green-100 border-green-300 text-green-800'; // Afternoon
    if (hour >= 18 && hour < 24) return 'bg-orange-100 border-orange-300 text-orange-800'; // Evening
    return 'bg-blue-100 border-blue-300 text-blue-800'; // Night
  };

  const getTimeOfDayColor = (hour) => {
    if (hour >= 6 && hour < 12) return 'bg-amber-400'; // Morning
    if (hour >= 12 && hour < 18) return 'bg-emerald-500'; // Afternoon
    if (hour >= 18 && hour < 24) return 'bg-orange-500'; // Evening
    return 'bg-slate-500'; // Night
  };

  const getTimeIcon = (hour) => {
    if (hour >= 6 && hour < 18) return <SunIcon size={16} className="text-yellow-600" />;
    return <MoonIcon size={16} className="text-blue-600" />;
  };

  const formatTime = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  if (loading) {
    return (
      <div className={cn("bg-white rounded-xl border border-slate-200 p-6", className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-12 gap-2">
            {[...Array(24)].map((_, i) => (
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
            <div className="p-2 bg-blue-50 rounded-lg">
              <ClockIcon size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Distribucija aktivnosti tokom dana</h3>
              <p className="text-slate-600 mt-1">Analiza aktivnosti po satima i danima u nedelji</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {onTimeRangeChange && (
              <select
                value={timeRange}
                onChange={(e) => onTimeRangeChange(e.target.value)}
                className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="7d">Poslednja 7 dana</option>
                <option value="30d">Poslednja 30 dana</option>
                <option value="90d">Poslednja 3 meseca</option>
                <option value="180d">Poslednja 6 meseci</option>
                <option value="365d">Poslednja godina</option>
              </select>
            )}

            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="all">Svi dani</option>
              <option value="monday">Ponedeljak</option>
              <option value="tuesday">Utorak</option>
              <option value="wednesday">Sreda</option>
              <option value="thursday">Četvrtak</option>
              <option value="friday">Petak</option>
              <option value="saturday">Subota</option>
              <option value="sunday">Nedelja</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="hour">Po satu</option>
              <option value="activities">Po broju aktivnosti</option>
              <option value="percentage">Po procentu</option>
              <option value="responseTime">Po vremenu odgovora</option>
            </select>

            {onExport && (
              <Button
                type="secondary"
                size="small"
                onClick={() => onExport(hourlyAnalysis)}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{hourlyAnalysis.statistics.totalActivities}</div>
            <div className="text-sm text-slate-600">Ukupno aktivnosti</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{formatTime(hourlyAnalysis.statistics.mostActiveHour?.hour || 0)}</div>
            <div className="text-sm text-slate-600">Najaktivniji sat</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{Math.round(hourlyAnalysis.statistics.averageActivitiesPerHour)}</div>
            <div className="text-sm text-slate-600">Prosek po satu</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{hourlyAnalysis.peakHours.length}</div>
            <div className="text-sm text-slate-600">Vrhunski sati</div>
          </div>
        </div>

        {/* Time of day distribution */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
            <div className="flex items-center justify-center mb-2">
              <SunIcon size={20} className="text-yellow-600 mr-2" />
              <span className="text-sm font-medium text-yellow-800">Jutro (6-12h)</span>
            </div>
            <div className="text-lg font-bold text-yellow-900">
              {hourlyAnalysis.statistics.timeOfDayDistribution?.morning?.count || 0}
            </div>
            <div className="text-xs text-yellow-700">
              {(hourlyAnalysis.statistics.timeOfDayDistribution?.morning?.percentage || 0).toFixed(1)}%
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
            <div className="flex items-center justify-center mb-2">
              <SunIcon size={20} className="text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-800">Popodne (12-18h)</span>
            </div>
            <div className="text-lg font-bold text-green-900">
              {hourlyAnalysis.statistics.timeOfDayDistribution?.afternoon?.count || 0}
            </div>
            <div className="text-xs text-green-700">
              {(hourlyAnalysis.statistics.timeOfDayDistribution?.afternoon?.percentage || 0).toFixed(1)}%
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
            <div className="flex items-center justify-center mb-2">
              <MoonIcon size={20} className="text-orange-600 mr-2" />
              <span className="text-sm font-medium text-orange-800">Veče (18-24h)</span>
            </div>
            <div className="text-lg font-bold text-orange-900">
              {hourlyAnalysis.statistics.timeOfDayDistribution?.evening?.count || 0}
            </div>
            <div className="text-xs text-orange-700">
              {(hourlyAnalysis.statistics.timeOfDayDistribution?.evening?.percentage || 0).toFixed(1)}%
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
            <div className="flex items-center justify-center mb-2">
              <MoonIcon size={20} className="text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">Noć (0-6h)</span>
            </div>
            <div className="text-lg font-bold text-blue-900">
              {hourlyAnalysis.statistics.timeOfDayDistribution?.night?.count || 0}
            </div>
            <div className="text-xs text-blue-700">
              {(hourlyAnalysis.statistics.timeOfDayDistribution?.night?.percentage || 0).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Data Visualization */}
      <div className="p-6">
        {hourlyAnalysis.hourlyData.length === 0 ? (
          <div className="text-center py-8">
            <BarChartIcon size={48} className="text-slate-400 mb-4 mx-auto" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Nema podataka</h4>
            <p className="text-slate-600">Nema aktivnosti za izabrani period i dan.</p>
          </div>
        ) : (
          <div>
            {/* Modern ShadCN-style Hourly Activity Chart */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold tracking-tight">Aktivnosti po satima</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="w-3 h-3 rounded-full bg-primary/20"></div>
                    <span>Aktivnost tokom dana</span>
                  </div>
                </div>
              </div>

              {/* ShadCN Card Container */}
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="p-6">
                  {/* Stats Summary Bar */}
                  <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-primary">{hourlyAnalysis.statistics.totalActivities}</div>
                      <div className="text-sm text-muted-foreground">Ukupno</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-primary">{hourlyAnalysis.statistics.mostActiveHour?.displayTime || '00:00'}</div>
                      <div className="text-sm text-muted-foreground">Najaktivniji</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-primary">{Math.round(hourlyAnalysis.statistics.averageActivitiesPerHour || 0)}</div>
                      <div className="text-sm text-muted-foreground">Prosek/sat</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-primary">{hourlyAnalysis.peakHours.length}</div>
                      <div className="text-sm text-muted-foreground">Vrhovi</div>
                    </div>
                  </div>

                  {/* Modern Chart Area */}
                  <div className="relative">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 h-64 w-12 flex flex-col justify-between text-xs text-muted-foreground py-2">
                      {(() => {
                        const maxActivities = Math.max(...hourlyAnalysis.hourlyData.map(h => h.totalActivities)) || 1;
                        const steps = [maxActivities, Math.round(maxActivities * 0.75), Math.round(maxActivities * 0.5), Math.round(maxActivities * 0.25), 0];
                        return steps.map((value, index) => (
                          <div key={index} className="text-right pr-2">{value}</div>
                        ));
                      })()}
                    </div>

                    {/* Chart Grid Background */}
                    <div className="ml-12 mr-4">
                      <div className="relative h-64 border-l border-b border-border">
                        {/* Horizontal grid lines */}
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute left-0 right-0 border-t border-border/30"
                            style={{top: `${i * 25}%`}}
                          />
                        ))}

                        {/* Activity Bars */}
                        <div className="absolute inset-0 flex items-end">
                          {(() => {
                            // Calculate max activities once for all bars
                            const maxActivities = Math.max(...hourlyAnalysis.hourlyData.map(h => h.totalActivities)) || 1;

                            return [...Array(24)].map((_, hour) => {
                              const hourData = hourlyAnalysis.hourlyData.find(h => h.hour === hour);
                              const activities = hourData?.totalActivities || 0;
                              const heightPercent = maxActivities > 0 ? (activities / maxActivities) * 100 : 0;

                              return (
                                <div
                                  key={hour}
                                  className="flex-1 flex flex-col justify-end px-0.5 group"
                                >
                                  {/* Activity Count Badge */}
                                  {activities > 0 && (
                                    <div className="mb-1 flex justify-center relative group/badge">
                                      <div className="inline-flex items-center justify-center min-w-6 h-5 text-xs font-medium bg-primary text-primary-foreground rounded-full px-1 cursor-pointer">
                                        {activities}
                                      </div>

                                      {/* Badge Tooltip */}
                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 opacity-0 group-hover/badge:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                        <div className="bg-popover text-popover-foreground border rounded-md shadow-lg px-3 py-2 text-sm whitespace-nowrap">
                                          <div className="font-semibold text-center mb-1">
                                            {hour.toString().padStart(2, '0')}:00
                                          </div>
                                          <div className="text-center">
                                            <span className="font-bold text-lg">{activities}</span>
                                            <span className="text-muted-foreground ml-1">aktivnosti</span>
                                          </div>
                                          {hourData && activities > 0 && (
                                            <div className="mt-2 pt-2 border-t space-y-1 text-xs">
                                              <div className="flex justify-between">
                                                <span>Tehničari:</span>
                                                <span className="font-medium">{hourData.technicians.length}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Opštine:</span>
                                                <span className="font-medium">{hourData.municipalities.length}</span>
                                              </div>
                                              {hourData.averageResponseTime > 0 && (
                                                <div className="flex justify-between">
                                                  <span>Prosek:</span>
                                                  <span className="font-medium">{Math.round(hourData.averageResponseTime)}min</span>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Bar */}
                                  <div
                                    className={cn(
                                      "w-full rounded-t-sm transition-all duration-300 cursor-pointer",
                                      "hover:brightness-110 hover:scale-x-110",
                                      getTimeOfDayColor(hour),
                                      activities === 0 ? "opacity-20" : "shadow-sm"
                                    )}
                                    style={{
                                      height: activities > 0 ? `${heightPercent}%` : '0%',
                                      minHeight: activities > 0 ? '8px' : '0px'
                                    }}
                                  />
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* X-axis labels */}
                      <div className="flex mt-2">
                        {[...Array(24)].map((_, hour) => (
                          <div key={hour} className="flex-1 text-center">
                            <span className={cn(
                              "text-xs",
                              hour % 6 === 0 ? "text-foreground font-medium" : "text-muted-foreground",
                              hour % 6 === 0 && "border-t border-border pt-1"
                            )}>
                              {hour % 6 === 0 ? hour.toString().padStart(2, '0') : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Time Period Legend */}
                  <div className="mt-8 pt-6 border-t">
                    <div className="flex flex-wrap justify-center gap-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-3 bg-slate-500 rounded-sm"></div>
                        <span className="text-sm text-muted-foreground">Noć (0-6h)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-3 bg-amber-400 rounded-sm"></div>
                        <span className="text-sm text-muted-foreground">Jutro (6-12h)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-3 bg-emerald-500 rounded-sm"></div>
                        <span className="text-sm text-muted-foreground">Popodne (12-18h)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-3 bg-orange-500 rounded-sm"></div>
                        <span className="text-sm text-muted-foreground">Veče (18-24h)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Peak Hours */}
            {hourlyAnalysis.peakHours.length > 0 && (
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Vrhunski sati</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {hourlyAnalysis.peakHours.map((peak, index) => (
                    <div
                      key={peak.hour}
                      className={cn(
                        "rounded-xl p-4 border transition-all duration-200",
                        index === 0 ? "bg-yellow-50 border-yellow-200" :
                        index === 1 ? "bg-orange-50 border-orange-200" :
                        "bg-red-50 border-red-200"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getTimeIcon(peak.hour)}
                          <span className="font-semibold text-lg">{peak.displayTime}</span>
                        </div>
                        <div className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          index === 0 ? "bg-yellow-200 text-yellow-800" :
                          index === 1 ? "bg-orange-200 text-orange-800" :
                          "bg-red-200 text-red-800"
                        )}>
                          #{index + 1}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Aktivnosti:</span>
                          <span className="font-semibold">{peak.totalActivities}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Procenat:</span>
                          <span className="font-semibold">{peak.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Tehničari:</span>
                          <span className="font-semibold">{peak.technicians.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Opštine:</span>
                          <span className="font-semibold">{peak.municipalities.length}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed hourly breakdown table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Sat</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Aktivnosti</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Procenat</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tehničari</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Opštine</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Prosečno vreme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {hourlyAnalysis.hourlyData.map((hour, index) => (
                    <tr key={hour.hour} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          {getTimeIcon(hour.hour)}
                          <span className="font-mono font-semibold">{formatTime(hour.hour)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          getHourColor(hour.hour)
                        )}>
                          {hour.hour >= 6 && hour.hour < 12 ? 'Jutro' :
                           hour.hour >= 12 && hour.hour < 18 ? 'Popodne' :
                           hour.hour >= 18 && hour.hour < 24 ? 'Veče' : 'Noć'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{hour.totalActivities}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{hour.percentage.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{hour.technicians.length}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{hour.municipalities.length}</td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-600">
                        {hour.averageResponseTime > 0 ? `${Math.round(hour.averageResponseTime)}min` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HourlyActivityDistribution;