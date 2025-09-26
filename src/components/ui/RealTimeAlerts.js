import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangleIcon,
  BellIcon,
  ClockIcon,
  TrendingUpIcon,
  XCircleIcon,
  CheckCircleIcon,
  InfoIcon,
  SettingsIcon,
  VolumeUpIcon,
  VolumeOffIcon,
  RefreshIcon,
  FilterIcon,
  ExclamationTriangleIcon
} from '../icons/SvgIcons';
import { Button } from './button-1';
import { cn } from '../../utils/cn';

const RealTimeAlerts = ({
  data = [],
  loading = false,
  error = null,
  onRefresh,
  onAlertAction,
  className = ''
}) => {
  const [alerts, setAlerts] = useState([]);
  const [alertSettings, setAlertSettings] = useState({
    enabled: true,
    soundEnabled: true,
    highPriorityOnly: false,
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    thresholds: {
      responseTime: 120, // minutes
      failureRate: 15, // percentage
      urgentOrders: 5, // count
      technicianLoad: 10, // orders per technician
      customerWaitTime: 180, // minutes
      systemLoad: 80 // percentage
    }
  });
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  // Auto-refresh effect
  useEffect(() => {
    if (!alertSettings.enabled || !alertSettings.autoRefresh) return;

    const interval = setInterval(() => {
      if (onRefresh) {
        onRefresh();
      }
    }, alertSettings.refreshInterval);

    return () => clearInterval(interval);
  }, [alertSettings.enabled, alertSettings.autoRefresh, alertSettings.refreshInterval, onRefresh]);

  // Alert generation logic
  const generateAlerts = useCallback((data) => {
    if (!data || data.length === 0) return [];

    const now = new Date();
    const alerts = [];
    const { thresholds } = alertSettings;

    // Calculate current metrics
    const recentData = data.filter(item => {
      if (!item.timestamp) return false;
      const itemTime = new Date(item.timestamp);
      const timeDiff = (now - itemTime) / (1000 * 60); // minutes
      return timeDiff <= 60; // last hour
    });

    // 1. High Response Time Alert
    const longResponseOrders = recentData.filter(item => {
      const responseTime = item.response_time || item.responseTime || 0;
      return responseTime > thresholds.responseTime && item.status !== 'completed';
    });

    if (longResponseOrders.length > 0) {
      alerts.push({
        id: 'high_response_time',
        type: 'performance',
        severity: 'high',
        title: 'Dugačko vreme odgovora',
        message: `${longResponseOrders.length} naloga ima vreme odgovora preko ${thresholds.responseTime} minuta`,
        timestamp: now,
        data: longResponseOrders,
        actions: ['view_details', 'escalate', 'dismiss']
      });
    }

    // 2. High Failure Rate Alert
    const totalOrders = recentData.length;
    const failedOrders = recentData.filter(item =>
      item.status === 'failed' || item.status === 'cancelled' || item.failed
    ).length;
    const failureRate = totalOrders > 0 ? (failedOrders / totalOrders) * 100 : 0;

    if (failureRate > thresholds.failureRate) {
      alerts.push({
        id: 'high_failure_rate',
        type: 'quality',
        severity: 'high',
        title: 'Visoka stopa neuspešnosti',
        message: `Stopa neuspešnosti od ${failureRate.toFixed(1)}% prekorači prag od ${thresholds.failureRate}%`,
        timestamp: now,
        data: { failureRate, failedOrders, totalOrders },
        actions: ['analyze', 'alert_team', 'dismiss']
      });
    }

    // 3. Urgent Orders Backlog
    const urgentOrders = data.filter(item =>
      (item.priority === 'urgent' || item.urgent) &&
      (item.status === 'pending' || item.status === 'in_progress')
    );

    if (urgentOrders.length > thresholds.urgentOrders) {
      alerts.push({
        id: 'urgent_backlog',
        type: 'capacity',
        severity: 'medium',
        title: 'Nakupljanje hitnih naloga',
        message: `${urgentOrders.length} hitnih naloga čeka na obradu`,
        timestamp: now,
        data: urgentOrders,
        actions: ['assign_technicians', 'escalate', 'dismiss']
      });
    }

    // 4. Technician Overload
    const technicianLoad = {};
    data.forEach(item => {
      const technician = item.technician || 'unknown';
      if (item.status === 'pending' || item.status === 'in_progress') {
        technicianLoad[technician] = (technicianLoad[technician] || 0) + 1;
      }
    });

    const overloadedTechnicians = Object.entries(technicianLoad)
      .filter(([_, count]) => count > thresholds.technicianLoad)
      .map(([name, count]) => ({ name, count }));

    if (overloadedTechnicians.length > 0) {
      alerts.push({
        id: 'technician_overload',
        type: 'resource',
        severity: 'medium',
        title: 'Preopterećeni tehničari',
        message: `${overloadedTechnicians.length} tehničara ima preko ${thresholds.technicianLoad} aktivnih naloga`,
        timestamp: now,
        data: overloadedTechnicians,
        actions: ['redistribute', 'add_capacity', 'dismiss']
      });
    }

    // 5. Long Customer Wait Time
    const longWaitOrders = data.filter(item => {
      if (item.status === 'completed' || !item.created_at) return false;
      const createdTime = new Date(item.created_at || item.timestamp);
      const waitTime = (now - createdTime) / (1000 * 60); // minutes
      return waitTime > thresholds.customerWaitTime;
    });

    if (longWaitOrders.length > 0) {
      alerts.push({
        id: 'long_wait_time',
        type: 'customer',
        severity: 'high',
        title: 'Dugačko vreme čekanja kupaca',
        message: `${longWaitOrders.length} kupaca čeka preko ${thresholds.customerWaitTime} minuta`,
        timestamp: now,
        data: longWaitOrders,
        actions: ['prioritize', 'contact_customers', 'dismiss']
      });
    }

    // 6. System Load Alert
    const activeOrders = data.filter(item =>
      item.status === 'pending' || item.status === 'in_progress'
    ).length;

    const systemCapacity = 100; // Assume 100 concurrent orders capacity
    const systemLoad = (activeOrders / systemCapacity) * 100;

    if (systemLoad > thresholds.systemLoad) {
      alerts.push({
        id: 'system_overload',
        type: 'system',
        severity: 'high',
        title: 'Preopterećenost sistema',
        message: `Sistemsko opterećenje od ${systemLoad.toFixed(1)}% prekorači prag od ${thresholds.systemLoad}%`,
        timestamp: now,
        data: { systemLoad, activeOrders, systemCapacity },
        actions: ['scale_up', 'optimize', 'dismiss']
      });
    }

    // 7. Trend Alerts - Rapid increase in orders
    const last30Min = data.filter(item => {
      if (!item.timestamp) return false;
      const itemTime = new Date(item.timestamp);
      const timeDiff = (now - itemTime) / (1000 * 60);
      return timeDiff <= 30;
    });

    const last60Min = data.filter(item => {
      if (!item.timestamp) return false;
      const itemTime = new Date(item.timestamp);
      const timeDiff = (now - itemTime) / (1000 * 60);
      return timeDiff <= 60 && timeDiff > 30;
    });

    if (last30Min.length > last60Min.length * 1.5 && last30Min.length > 10) {
      alerts.push({
        id: 'sudden_spike',
        type: 'trend',
        severity: 'medium',
        title: 'Nagli porast naloga',
        message: `${last30Min.length} novih naloga u poslednje 30 min (50% povećanje)`,
        timestamp: now,
        data: { recent: last30Min.length, previous: last60Min.length },
        actions: ['prepare_resources', 'monitor', 'dismiss']
      });
    }

    return alerts.map(alert => ({
      ...alert,
      dismissed: dismissedAlerts.has(alert.id)
    }));
  }, [alertSettings.thresholds, dismissedAlerts]);

  // Generate alerts from data
  useEffect(() => {
    if (!alertSettings.enabled) {
      setAlerts([]);
      return;
    }

    const newAlerts = generateAlerts(data);
    setAlerts(newAlerts);

    // Play sound for new high-priority alerts
    if (alertSettings.soundEnabled && newAlerts.some(alert =>
      alert.severity === 'high' && !alert.dismissed
    )) {
      // In a real app, you would play an actual sound
      console.log('🔊 High priority alert sound');
    }
  }, [data, generateAlerts, alertSettings.enabled, alertSettings.soundEnabled]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <ExclamationTriangleIcon size={20} className="text-red-500" />;
      case 'medium': return <AlertTriangleIcon size={20} className="text-orange-500" />;
      case 'low': return <InfoIcon size={20} className="text-blue-500" />;
      default: return <BellIcon size={20} className="text-slate-500" />;
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      performance: 'bg-purple-100 text-purple-700',
      quality: 'bg-red-100 text-red-700',
      capacity: 'bg-blue-100 text-blue-700',
      resource: 'bg-green-100 text-green-700',
      customer: 'bg-orange-100 text-orange-700',
      system: 'bg-slate-100 text-slate-700',
      trend: 'bg-yellow-100 text-yellow-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const handleDismissAlert = (alertId) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const handleAlertClick = (alert, action) => {
    if (onAlertAction) {
      onAlertAction(alert, action);
    }

    if (action === 'dismiss') {
      handleDismissAlert(alert.id);
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (alert.dismissed && !showSettings) return false;
      if (alertSettings.highPriorityOnly && alert.severity !== 'high') return false;
      if (selectedSeverity !== 'all' && alert.severity !== selectedSeverity) return false;
      if (selectedType !== 'all' && alert.type !== selectedType) return false;
      return true;
    });
  }, [alerts, selectedSeverity, selectedType, alertSettings.highPriorityOnly, showSettings]);

  const getActionLabel = (action) => {
    const labels = {
      view_details: 'Prikaži detalje',
      escalate: 'Eskaliraj',
      dismiss: 'Odbaci',
      analyze: 'Analiziraj',
      alert_team: 'Obavesti tim',
      assign_technicians: 'Dodeli tehničare',
      redistribute: 'Preraspodeli',
      add_capacity: 'Dodaj kapacitet',
      prioritize: 'Prioritizuj',
      contact_customers: 'Kontaktiraj kupce',
      scale_up: 'Povećaj kapacitet',
      optimize: 'Optimizuj',
      prepare_resources: 'Pripremi resurse',
      monitor: 'Prati'
    };
    return labels[action] || action;
  };

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
          <h4 className="text-lg font-semibold text-slate-900 mb-2">Greška pri učitavanju alarma</h4>
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
            <div className="relative p-2 bg-red-50 rounded-lg">
              <BellIcon size={20} className="text-red-600" />
              {filteredAlerts.length > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">
                    {filteredAlerts.length > 9 ? '9+' : filteredAlerts.length}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Real-time alarmi</h3>
              <p className="text-slate-600 mt-1">
                Automatska obaveštenja kada parametri pređu kritične vrednosti
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              type={alertSettings.enabled ? "primary" : "secondary"}
              size="small"
              onClick={() => setAlertSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
              prefix={alertSettings.enabled ? <CheckCircleIcon size={16} /> : <XCircleIcon size={16} />}
            >
              {alertSettings.enabled ? 'Uključeno' : 'Isključeno'}
            </Button>

            <Button
              type="secondary"
              size="small"
              onClick={() => setAlertSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
              prefix={alertSettings.soundEnabled ? <VolumeUpIcon size={16} /> : <VolumeOffIcon size={16} />}
            >
              {alertSettings.soundEnabled ? 'Zvuk' : 'Nema zvuka'}
            </Button>

            <Button
              type="secondary"
              size="small"
              onClick={() => setShowSettings(!showSettings)}
              prefix={<SettingsIcon size={16} />}
            >
              Podešavanje
            </Button>

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
            className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none"
          >
            <option value="all">Svi nivoi</option>
            <option value="high">Visoko</option>
            <option value="medium">Srednje</option>
            <option value="low">Nisko</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-9 px-3 pr-8 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none"
          >
            <option value="all">Svi tipovi</option>
            <option value="performance">Performanse</option>
            <option value="quality">Kvalitet</option>
            <option value="capacity">Kapacitet</option>
            <option value="resource">Resursi</option>
            <option value="customer">Kupci</option>
            <option value="system">Sistem</option>
            <option value="trend">Trend</option>
          </select>

          <label className="flex items-center space-x-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={alertSettings.highPriorityOnly}
              onChange={(e) => setAlertSettings(prev => ({
                ...prev,
                highPriorityOnly: e.target.checked
              }))}
              className="rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            <span>Samo visoki prioritet</span>
          </label>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Podešavanje alarma</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Settings */}
            <div>
              <h5 className="font-medium text-slate-900 mb-3">Opšte podešavanje</h5>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Automatsko osvežavanje</span>
                  <input
                    type="checkbox"
                    checked={alertSettings.autoRefresh}
                    onChange={(e) => setAlertSettings(prev => ({
                      ...prev,
                      autoRefresh: e.target.checked
                    }))}
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                </label>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Interval osvežavanja (sekunde)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={alertSettings.refreshInterval / 1000}
                    onChange={(e) => setAlertSettings(prev => ({
                      ...prev,
                      refreshInterval: parseInt(e.target.value) * 1000
                    }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Threshold Settings */}
            <div>
              <h5 className="font-medium text-slate-900 mb-3">Pragovi upozorenja</h5>
              <div className="space-y-3">
                {Object.entries(alertSettings.thresholds).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm text-slate-600 mb-1">
                      {key === 'responseTime' ? 'Vreme odgovora (min)' :
                       key === 'failureRate' ? 'Stopa neuspešnosti (%)' :
                       key === 'urgentOrders' ? 'Hitni nalozi (broj)' :
                       key === 'technicianLoad' ? 'Opterećenje tehničara' :
                       key === 'customerWaitTime' ? 'Čekanje kupca (min)' :
                       key === 'systemLoad' ? 'Sistemsko opterećenje (%)' : key}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={value}
                      onChange={(e) => setAlertSettings(prev => ({
                        ...prev,
                        thresholds: {
                          ...prev.thresholds,
                          [key]: parseInt(e.target.value)
                        }
                      }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Content */}
      <div className="p-6">
        {!alertSettings.enabled ? (
          <div className="text-center py-8">
            <BellIcon size={48} className="text-slate-400 mb-4 mx-auto" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Alarmi su isključeni</h4>
            <p className="text-slate-600">Uključite alarme da biste primali obaveštenja o kritičnim događajima.</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon size={48} className="text-green-400 mb-4 mx-auto" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Nema aktivnih alarma</h4>
            <p className="text-slate-600">Svi parametri su u normalnim granicama.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "rounded-xl p-4 border transition-all duration-200",
                  getSeverityColor(alert.severity),
                  alert.dismissed && "opacity-50"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getSeverityIcon(alert.severity)}

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-slate-900">{alert.title}</h4>
                        <span className={cn("px-2 py-1 rounded text-xs font-medium", getTypeColor(alert.type))}>
                          {alert.type}
                        </span>
                        {alert.dismissed && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            Odbačen
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-700 mb-2">{alert.message}</p>

                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <div className="flex items-center space-x-1">
                          <ClockIcon size={14} />
                          <span>{new Date(alert.timestamp).toLocaleTimeString('sr-RS')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">Prioritet:</span>
                          <span className="capitalize">
                            {alert.severity === 'high' ? 'Visok' :
                             alert.severity === 'medium' ? 'Srednji' : 'Nizak'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    {alert.actions?.map((action) => (
                      <Button
                        key={action}
                        type={action === 'dismiss' ? 'secondary' : 'primary'}
                        size="small"
                        onClick={() => handleAlertClick(alert, action)}
                        disabled={alert.dismissed && action !== 'dismiss'}
                      >
                        {getActionLabel(action)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {alertSettings.enabled && filteredAlerts.length > 0 && (
          <div className="mt-8 p-4 bg-slate-50 rounded-xl">
            <h5 className="font-semibold text-slate-900 mb-3">Rezime alarma</h5>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {filteredAlerts.filter(a => a.severity === 'high' && !a.dismissed).length}
                </div>
                <div className="text-sm text-slate-600">Visok prioritet</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {filteredAlerts.filter(a => a.severity === 'medium' && !a.dismissed).length}
                </div>
                <div className="text-sm text-slate-600">Srednji prioritet</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {filteredAlerts.filter(a => a.severity === 'low' && !a.dismissed).length}
                </div>
                <div className="text-sm text-slate-600">Nizak prioritet</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeAlerts;