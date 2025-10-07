import React, { useState, useMemo } from 'react';
import {
  HardHatIcon,
  ChevronRightIcon,
  UserIcon,
  MapPinIcon,
  ClockIcon,
  CheckIcon,
  MaterialIcon,
  EquipmentIcon,
  CommentIcon,
  ImageIcon,
  FilterIcon,
  DownloadIcon,
  TableIcon,
  CalendarIcon,
  AlertIcon,
  ChartIcon,
  ChevronDownIcon,
  SearchIcon,
  CloseIcon,
  TrendingUpIcon,
  FileIcon
} from '../../../components/icons/SvgIcons';
import { Button } from '../../../components/ui/button-1';
import { cn } from '../../../utils/cn';

const TechnicianLogsSection = ({
  logs,
  expandedGroups,
  toggleGroup,
  getActionIcon,
  getActionColor,
  materialValidationData,
  showMaterialValidation,
  setShowMaterialValidation,
  pagination = {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 50,
    hasNextPage: false,
    hasPreviousPage: false
  },
  performance = { queryTime: 0, resultsPerPage: 0 },
  loading = false,
  onPageChange
}) => {
  // View mode state
  const [viewMode, setViewMode] = useState('card'); // 'card', 'table', 'compact'

  // Advanced filter states
  const [localFilters, setLocalFilters] = useState({
    technicianFilter: 'all',
    actionTypeFilter: 'all',
    hasAnomalies: false,
    dateRange: 'all' // 'today', 'week', 'month', 'all'
  });

  // Selected items for bulk operations
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Expand/collapse all
  const [expandAll, setExpandAll] = useState(false);

  // Collect all individual logs with their technician info first - BEFORE early return
  const allLogs = useMemo(() => {
    const logs_array = [];
    if (!logs || logs.length === 0) return logs_array;

    logs.forEach((technicianGroup) => {
      technicianGroup.logs.forEach((log) => {
        logs_array.push({
          ...log,
          technicianName: technicianGroup.technicianName
        });
      });
    });
    return logs_array;
  }, [logs]);

  // Now group by work order ID
  const groupedLogs = useMemo(() => {
    const grouped = {};
    allLogs.forEach((log) => {
      const workOrderId = log.workOrderId && typeof log.workOrderId === 'object'
        ? log.workOrderId._id
        : log.workOrderId || 'general';

      if (!grouped[workOrderId]) {
        grouped[workOrderId] = {
          workOrderId: workOrderId,
          workOrderInfo: log.workOrderId && typeof log.workOrderId === 'object' ? log.workOrderId : null,
          technician: log.technicianName,
          date: new Date(log.timestamp).toDateString(),
          logs: []
        };
      }

      grouped[workOrderId].logs.push(log);
    });
    return grouped;
  }, [allLogs]);

  // Calculate quick stats
  const quickStats = useMemo(() => {
    const totalActivities = allLogs.length;
    const activeWorkOrders = Object.keys(groupedLogs).length;
    const totalMaterials = allLogs.filter(log => log.materialDetails).reduce((sum, log) =>
      sum + (log.materialDetails?.quantity || 0), 0
    );
    const anomalyCount = materialValidationData?.anomalies?.length || 0;
    const uniqueTechnicians = new Set(allLogs.map(log => log.technicianName)).size;

    return {
      totalActivities,
      activeWorkOrders,
      totalMaterials,
      anomalyCount,
      uniqueTechnicians
    };
  }, [allLogs, groupedLogs, materialValidationData]);

  // Loading state
  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-12">
        <div className="flex flex-col items-center text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Učitavanje logova tehničara...</p>
        </div>
      </div>
    );
  }

  // Early return AFTER all hooks
  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-12">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-slate-50 rounded-xl mb-4">
            <HardHatIcon size={64} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Nema logova tehničara</h3>
          <p className="text-slate-600">Trenutno nema aktivnosti tehničara za prikazivanje.</p>
        </div>
      </div>
    );
  }

  // Data is already paginated and sorted from server - just display it
  const groupedLogsArray = Object.entries(groupedLogs);
  const currentGroups = groupedLogsArray; // No slicing needed - server handles pagination

  // Bulk action handlers
  const handleSelectAll = () => {
    if (selectedItems.size === currentGroups.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(currentGroups.map(([key]) => key)));
    }
  };

  const handleSelectItem = (groupKey) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(groupKey)) {
      newSelected.delete(groupKey);
    } else {
      newSelected.add(groupKey);
    }
    setSelectedItems(newSelected);
  };

  const handleExpandAll = () => {
    const newExpanded = new Set(expandedGroups);

    if (expandAll) {
      // Collapse all - remove all current groups from expanded set
      currentGroups.forEach(([groupKey]) => {
        newExpanded.delete(groupKey);
      });
    } else {
      // Expand all - add all current groups to expanded set
      currentGroups.forEach(([groupKey]) => {
        newExpanded.add(groupKey);
      });
    }

    // Update parent's expandedGroups via toggleGroup for each item
    currentGroups.forEach(([groupKey]) => {
      const shouldBeExpanded = !expandAll;
      const isCurrentlyExpanded = expandedGroups?.has(groupKey);

      if (shouldBeExpanded !== isCurrentlyExpanded) {
        toggleGroup(groupKey);
      }
    });

    setExpandAll(!expandAll);
  };

  const handleExportSelected = () => {
    // Export functionality - placeholder
    console.log('Exporting selected items:', Array.from(selectedItems));
    alert(`Eksportovanje ${selectedItems.size} selektovanih stavki...`);
  };

  return (
    <div className="space-y-6">
      {/* QUICK STATS DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Total Activities */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Aktivnosti</p>
              <h3 className="text-2xl font-bold text-blue-900">{quickStats.totalActivities}</h3>
              <p className="text-xs text-blue-600 mt-1">ukupno logova</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-lg">
              <ClockIcon size={24} className="text-blue-700" />
            </div>
          </div>
        </div>

        {/* Active Work Orders */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Radni nalozi</p>
              <h3 className="text-2xl font-bold text-green-900">{quickStats.activeWorkOrders}</h3>
              <p className="text-xs text-green-600 mt-1">aktivnih WO</p>
            </div>
            <div className="p-3 bg-green-200 rounded-lg">
              <CheckIcon size={24} className="text-green-700" />
            </div>
          </div>
        </div>

        {/* Total Materials */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">Materijal</p>
              <h3 className="text-2xl font-bold text-purple-900">{quickStats.totalMaterials}</h3>
              <p className="text-xs text-purple-600 mt-1">ukupno korišćeno</p>
            </div>
            <div className="p-3 bg-purple-200 rounded-lg">
              <MaterialIcon size={24} className="text-purple-700" />
            </div>
          </div>
        </div>

        {/* Anomalies */}
        <div className={cn(
          "border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow",
          quickStats.anomalyCount > 0
            ? "bg-gradient-to-br from-red-50 to-red-100 border-red-200"
            : "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className={cn(
                "text-xs font-medium uppercase tracking-wider mb-1",
                quickStats.anomalyCount > 0 ? "text-red-600" : "text-slate-600"
              )}>
                Anomalije
              </p>
              <h3 className={cn(
                "text-2xl font-bold",
                quickStats.anomalyCount > 0 ? "text-red-900" : "text-slate-900"
              )}>
                {quickStats.anomalyCount}
              </h3>
              <p className={cn(
                "text-xs mt-1",
                quickStats.anomalyCount > 0 ? "text-red-600" : "text-slate-600"
              )}>
                {quickStats.anomalyCount > 0 ? 'detektovano' : 'nema problema'}
              </p>
            </div>
            <div className={cn(
              "p-3 rounded-lg",
              quickStats.anomalyCount > 0 ? "bg-red-200" : "bg-slate-200"
            )}>
              {quickStats.anomalyCount > 0 ? (
                <AlertIcon size={24} className="text-red-700 animate-pulse" />
              ) : (
                <CheckIcon size={24} className="text-slate-700" />
              )}
            </div>
          </div>
        </div>

        {/* Active Technicians */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-600 uppercase tracking-wider mb-1">Tehničari</p>
              <h3 className="text-2xl font-bold text-orange-900">{quickStats.uniqueTechnicians}</h3>
              <p className="text-xs text-orange-600 mt-1">aktivnih</p>
            </div>
            <div className="p-3 bg-orange-200 rounded-lg">
              <HardHatIcon size={24} className="text-orange-700" />
            </div>
          </div>
        </div>
      </div>

      {/* MATERIAL VALIDATION - PROMINENT ALERT PANEL */}
      {materialValidationData && quickStats.anomalyCount > 0 && (
        <div className="bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 border-2 border-red-300 rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 bg-white/40 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg animate-pulse">
                  <AlertIcon size={20} className="text-red-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 flex items-center">
                    ⚠️ Upozorenje: Detektovane anomalije u materijalu
                    <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                      {quickStats.anomalyCount}
                    </span>
                  </h4>
                  <p className="text-sm text-slate-600">Pregled neobičnih korišćenja materijala koja zahtevaju pažnju</p>
                </div>
              </div>
              <Button
                type={showMaterialValidation ? "primary" : "secondary"}
                size="medium"
                onClick={() => setShowMaterialValidation(!showMaterialValidation)}
                prefix={showMaterialValidation ? <ChevronDownIcon size={16} /> : <ChartIcon size={16} />}
              >
                {showMaterialValidation ? 'Sakrij detalje' : 'Prikaži detalje'}
              </Button>
            </div>
          </div>

          {showMaterialValidation && (
            <div className="border-t-2 border-red-200 p-5 bg-white/60 backdrop-blur-sm max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Averages Column */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200 shadow-sm">
                  <h5 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Prosečna potrošnja
                  </h5>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {Object.entries(materialValidationData.averages || {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2 bg-gradient-to-r from-slate-50 to-white rounded-lg border border-slate-100">
                        <span className="text-xs text-slate-700 font-medium truncate">{key}</span>
                        <span className="font-bold text-sm text-slate-900 bg-green-50 px-2 py-1 rounded-full ml-2">
                          {typeof value === 'object' ? Math.round(value.average || 0) : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Anomalies Column - Takes 2 columns */}
                <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-red-200 shadow-sm">
                  <h5 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                      Detektovane anomalije
                    </div>
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-bold">
                      {materialValidationData.anomalies?.length || 0} pronađeno
                    </span>
                  </h5>

                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {materialValidationData.anomalies?.map((anomaly, index) => (
                      <div
                        key={index}
                        className={cn(
                          "p-3 rounded-lg border-l-4 transition-all hover:shadow-md",
                          anomaly.severity === 'high'
                            ? 'border-red-500 bg-gradient-to-r from-red-50 to-white'
                            : 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-white'
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2 flex-1">
                            <MaterialIcon size={16} className="text-slate-600 flex-shrink-0" />
                            <span className="font-bold text-sm text-slate-900">
                              {anomaly.materialDetails?.materialType || 'N/A'}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-bold",
                              anomaly.severity === 'high'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            )}>
                              {anomaly.severity === 'high' ? '🔴 VISOK' : '🟡 UMEREN'}
                            </span>
                          </div>

                          {anomaly.workOrderId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const workOrderId = typeof anomaly.workOrderId === 'object'
                                  ? anomaly.workOrderId._id
                                  : anomaly.workOrderId;
                                window.open(`/work-orders/${workOrderId}`, '_blank');
                              }}
                              className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full transition-colors font-medium shadow-sm"
                            >
                              Otvori WO →
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                          <div className="flex items-center space-x-1 text-slate-600">
                            <HardHatIcon size={12} />
                            <span className="font-medium">{anomaly.performedByName || 'Nepoznat'}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-slate-600">
                            <ClockIcon size={12} />
                            <span>{new Date(anomaly.timestamp).toLocaleDateString('sr-RS')}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-white/60 rounded p-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Korišćeno:</span>
                            <span className="font-bold text-red-700">{anomaly.materialDetails?.quantity || 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Očekivano:</span>
                            <span className="text-slate-600 font-medium">{anomaly.expectedRange || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW CONTROLS & BULK ACTIONS BAR */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl shadow-md overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Left side - View mode toggles */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-slate-700 mr-2">Prikaz:</span>
              <div className="inline-flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('compact')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center space-x-1",
                    viewMode === 'compact'
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <TableIcon size={14} />
                  <span>Kompaktno</span>
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center space-x-1",
                    viewMode === 'card'
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <FileIcon size={14} />
                  <span>Kartice</span>
                </button>
              </div>
            </div>

            {/* Middle - Bulk selection info */}
            {selectedItems.size > 0 && (
              <div className="flex items-center space-x-3 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                <span className="text-sm font-medium text-blue-900">
                  Selektovano: <span className="font-bold">{selectedItems.size}</span>
                </span>
                <button
                  onClick={() => setSelectedItems(new Set())}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Poništi
                </button>
              </div>
            )}

            {/* Right side - Actions */}
            <div className="flex items-center space-x-2">
              <Button
                type="secondary"
                size="small"
                onClick={handleExpandAll}
                prefix={expandAll ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
              >
                {expandAll ? 'Zatvori sve' : 'Otvori sve'}
              </Button>

              {selectedItems.size > 0 && (
                <Button
                  type="primary"
                  size="small"
                  onClick={handleExportSelected}
                  prefix={<DownloadIcon size={14} />}
                >
                  Eksportuj ({selectedItems.size})
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LOGS DISPLAY - COMPACT VIEW */}
      {viewMode === 'compact' && (
        <div className="space-y-4">
          {currentGroups.map(([groupKey, group]) => {
            const totalLogs = group.logs.length;
            const latestLogDate = group.logs.length > 0
              ? new Date(Math.max(...group.logs.map(log => new Date(log.timestamp))))
              : new Date();
            const hasMaterials = group.logs.some(log => log.materialDetails);
            const hasEquipment = group.logs.some(log => log.equipmentDetails);
            const isExpanded = expandedGroups?.has(groupKey);

            return (
              <div key={groupKey} className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl shadow-md overflow-hidden">
                {/* Table Row */}
                <div className={cn(
                  "grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors",
                  selectedItems.has(groupKey) && "bg-blue-50"
                )}>
                  {/* Checkbox */}
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(groupKey)}
                      onChange={() => handleSelectItem(groupKey)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  {/* Tehničar / WO */}
                  <div className="col-span-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <HardHatIcon size={16} className="text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {group.technician}
                        </p>
                        {group.workOrderInfo && (
                          <p className="text-xs text-slate-500">
                            WO: {group.workOrderInfo.tisJobId || group.workOrderId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <div className="flex flex-wrap gap-1">
                      {hasMaterials && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <MaterialIcon size={10} className="mr-1" />
                          Materijal
                        </span>
                      )}
                      {hasEquipment && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <EquipmentIcon size={10} className="mr-1" />
                          Oprema
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Aktivnosti */}
                  <div className="col-span-1 text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-800">
                      {totalLogs}
                    </span>
                  </div>

                  {/* Datum */}
                  <div className="col-span-2">
                    <div className="flex items-center text-sm text-slate-600">
                      <ClockIcon size={14} className="mr-1" />
                      {latestLogDate.toLocaleDateString('sr-RS')}
                    </div>
                  </div>

                  {/* Akcije */}
                  <div className="col-span-3 flex items-center justify-end space-x-2">
                    {group.workOrderId && group.workOrderId !== 'general' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const woId = group.workOrderInfo?._id || group.workOrderId;
                          window.open(`/work-orders/${woId}`, '_blank');
                        }}
                        className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md transition-colors font-medium"
                      >
                        WO
                      </button>
                    )}
                    <button
                      onClick={() => toggleGroup(groupKey)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-md transition-colors font-medium"
                    >
                      {isExpanded ? 'Zatvori' : 'Detalji'}
                    </button>
                  </div>
                </div>

                {/* Expanded Details - COMPACT VERSION */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/50 max-h-96 overflow-y-auto">
                    {group.logs.map((log, index) => (
                      <div key={index} className="px-3 py-2 border-b border-slate-200 last:border-b-0 hover:bg-white/50 transition-colors">
                        <div className="flex items-start space-x-2">
                          {/* Action Icon - Smaller */}
                          <div className={cn(
                            "p-1.5 rounded-md flex-shrink-0",
                            getActionColor(log.action) === 'success' && "bg-green-100",
                            getActionColor(log.action) === 'info' && "bg-blue-100",
                            getActionColor(log.action) === 'warning' && "bg-yellow-100",
                            getActionColor(log.action) === 'danger' && "bg-red-100",
                            getActionColor(log.action) === 'neutral' && "bg-slate-100"
                          )}>
                            {getActionIcon(log.action)}
                          </div>

                          {/* Log Content - Single Line Layout */}
                          <div className="flex-1 min-w-0">
                            {/* Main Info - One Line */}
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="font-semibold text-sm text-slate-900 truncate">{log.description || 'Aktivnost'}</span>
                                <span className="text-xs text-slate-500">•</span>
                                <span className="text-xs text-slate-600">{log.technicianName}</span>
                                <span className="text-xs text-slate-500 flex items-center flex-shrink-0">
                                  <ClockIcon size={10} className="mr-0.5" />
                                  {new Date(log.timestamp).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {/* Secondary Info - Compact Inline */}
                            <div className="flex items-center flex-wrap gap-3 text-xs text-slate-600 mb-1">
                              {log.userInfo && (
                                <span className="flex items-center">
                                  <UserIcon size={10} className="mr-1" />
                                  {typeof log.userInfo === 'object' ? (log.userInfo.name || 'N/A') : log.userInfo}
                                </span>
                              )}
                              {(log.address || (log.workOrderId && typeof log.workOrderId === 'object' && log.workOrderId.address)) && (
                                <span className="flex items-center truncate">
                                  <MapPinIcon size={10} className="mr-1" />
                                  {log.address || log.workOrderId.address}
                                </span>
                              )}
                            </div>

                            {/* Materials & Equipment - INLINE Compact */}
                            {(log.materials || log.equipment) && (
                              <div className="flex items-center flex-wrap gap-2 mt-1">
                                {log.materials && log.materials.length > 0 && (
                                  <div className="flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                    <MaterialIcon size={10} className="text-purple-600" />
                                    <span className="text-xs text-purple-800 font-medium">
                                      {log.materials.map(m => `${m.description}: ${m.quantity}`).join(', ')}
                                    </span>
                                  </div>
                                )}
                                {log.equipment && log.equipment.length > 0 && (
                                  <div className="flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                                    <EquipmentIcon size={10} className="text-orange-600" />
                                    <span className="text-xs text-orange-800 font-medium">
                                      {log.equipment.map(e => e.description).join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Comments & Images - Inline Compact */}
                            {(log.comment || (log.images && log.images.length > 0)) && (
                              <div className="flex items-center flex-wrap gap-2 mt-1">
                                {log.comment && (
                                  <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    <CommentIcon size={10} className="text-blue-600" />
                                    <span className="text-xs text-blue-800 truncate max-w-md">{log.comment}</span>
                                  </div>
                                )}
                                {log.images && log.images.length > 0 && (
                                  <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                    <ImageIcon size={10} className="text-green-600" />
                                    <span className="text-xs text-green-800 font-medium">{log.images.length} slika</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* LOGS DISPLAY - CARD VIEW (IMPROVED) */}
      {viewMode === 'card' && (
        <div className="space-y-4">
          {currentGroups.map(([groupKey, group]) => {
            const totalLogs = group.logs.length;
            const latestLogDate = group.logs.length > 0
              ? new Date(Math.max(...group.logs.map(log => new Date(log.timestamp))))
              : new Date();
            const hasMaterials = group.logs.some(log => log.materialDetails);
            const hasEquipment = group.logs.some(log => log.equipmentDetails);
            const hasImages = group.logs.some(log => log.images && log.images.length > 0);

            return (
              <div
                key={groupKey}
                className={cn(
                  "bg-white/80 backdrop-blur-xl border rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl",
                  selectedItems.has(groupKey) ? "border-blue-400 ring-2 ring-blue-200" : "border-slate-200"
                )}
              >
                {/* Card Header */}
                <div
                  className="p-4 border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleGroup(groupKey)}
                >
                  <div className="flex items-center justify-between">
                    {/* Left side - checkbox and info */}
                    <div className="flex items-center space-x-4 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(groupKey)}
                        onChange={() => handleSelectItem(groupKey)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />

                      <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl border border-blue-300 shadow-sm">
                        <HardHatIcon size={20} className="text-blue-700" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-lg truncate">
                          {group.workOrderInfo
                            ? `${group.technician}${group.workOrderInfo.tisJobId ? ` (${group.workOrderInfo.tisJobId})` : ''}`
                            : `${group.technician} - Opšte aktivnosti`}
                        </h3>
                        <div className="flex items-center flex-wrap gap-3 mt-1">
                          <span className="flex items-center text-sm text-slate-600">
                            <ClockIcon size={12} className="mr-1" />
                            {latestLogDate.toLocaleDateString('sr-RS')}
                          </span>
                          <span className="text-sm text-slate-600">
                            • {totalLogs} {totalLogs === 1 ? 'aktivnost' : 'aktivnosti'}
                          </span>
                          {group.workOrderInfo?.userName && (
                            <span className="text-sm text-slate-600">
                              • {group.workOrderInfo.userName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status badges */}
                      <div className="flex flex-wrap gap-2">
                        {hasMaterials && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                            <MaterialIcon size={12} className="mr-1" />
                            Materijal
                          </span>
                        )}
                        {hasEquipment && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                            <EquipmentIcon size={12} className="mr-1" />
                            Oprema
                          </span>
                        )}
                        {hasImages && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            <ImageIcon size={12} className="mr-1" />
                            Slike
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side - quick actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      {group.workOrderId && group.workOrderId !== 'general' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const woId = group.workOrderInfo?._id || group.workOrderId;
                            window.open(`/work-orders/${woId}`, '_blank');
                          }}
                          className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md transition-colors font-medium"
                        >
                          WO
                        </button>
                      )}
                      <div className={cn(
                        "p-2 bg-slate-100 rounded-lg transition-all duration-200",
                        expandedGroups?.has(groupKey) ? "rotate-90 bg-slate-200" : ""
                      )}>
                        <ChevronRightIcon size={20} className="text-slate-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Content - Expanded Details - COMPACT VERSION */}
                {expandedGroups?.has(groupKey) && (
                  <div className="border-t border-slate-200 bg-slate-50/50 max-h-96 overflow-y-auto">
                    {group.logs.map((log, index) => (
                      <div key={index} className="px-3 py-2 border-b border-slate-200 last:border-b-0 hover:bg-white/50 transition-colors">
                        <div className="flex items-start space-x-2">
                          {/* Action Icon - Smaller */}
                          <div className={cn(
                            "p-1.5 rounded-md flex-shrink-0",
                            getActionColor(log.action) === 'success' && "bg-green-100",
                            getActionColor(log.action) === 'info' && "bg-blue-100",
                            getActionColor(log.action) === 'warning' && "bg-yellow-100",
                            getActionColor(log.action) === 'danger' && "bg-red-100",
                            getActionColor(log.action) === 'neutral' && "bg-slate-100"
                          )}>
                            {getActionIcon(log.action)}
                          </div>

                          {/* Log Content - Single Line Layout */}
                          <div className="flex-1 min-w-0">
                            {/* Main Info - One Line */}
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="font-semibold text-sm text-slate-900 truncate">{log.description || 'Aktivnost'}</span>
                                <span className="text-xs text-slate-500">•</span>
                                <span className="text-xs text-slate-600">{log.technicianName}</span>
                                <span className="text-xs text-slate-500 flex items-center flex-shrink-0">
                                  <ClockIcon size={10} className="mr-0.5" />
                                  {new Date(log.timestamp).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {/* Secondary Info - Compact Inline */}
                            <div className="flex items-center flex-wrap gap-3 text-xs text-slate-600 mb-1">
                              {log.userInfo && (
                                <span className="flex items-center">
                                  <UserIcon size={10} className="mr-1" />
                                  {typeof log.userInfo === 'object' ? (log.userInfo.name || 'N/A') : log.userInfo}
                                </span>
                              )}
                              {(log.address || (log.workOrderId && typeof log.workOrderId === 'object' && log.workOrderId.address)) && (
                                <span className="flex items-center truncate">
                                  <MapPinIcon size={10} className="mr-1" />
                                  {log.address || log.workOrderId.address}
                                </span>
                              )}
                            </div>

                            {/* Materials & Equipment - INLINE Compact */}
                            {(log.materials || log.equipment) && (
                              <div className="flex items-center flex-wrap gap-2 mt-1">
                                {log.materials && log.materials.length > 0 && (
                                  <div className="flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                    <MaterialIcon size={10} className="text-purple-600" />
                                    <span className="text-xs text-purple-800 font-medium">
                                      {log.materials.map(m => `${m.description}: ${m.quantity}`).join(', ')}
                                    </span>
                                  </div>
                                )}
                                {log.equipment && log.equipment.length > 0 && (
                                  <div className="flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                                    <EquipmentIcon size={10} className="text-orange-600" />
                                    <span className="text-xs text-orange-800 font-medium">
                                      {log.equipment.map(e => e.description).join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Comments & Images - Inline Compact */}
                            {(log.comment || (log.images && log.images.length > 0)) && (
                              <div className="flex items-center flex-wrap gap-2 mt-1">
                                {log.comment && (
                                  <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    <CommentIcon size={10} className="text-blue-600" />
                                    <span className="text-xs text-blue-800 truncate max-w-md">{log.comment}</span>
                                  </div>
                                )}
                                {log.images && log.images.length > 0 && (
                                  <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                    <ImageIcon size={10} className="text-green-600" />
                                    <span className="text-xs text-green-800 font-medium">{log.images.length} slika</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SERVER-SIDE PAGINATION */}
      {pagination.totalPages > 1 && onPageChange && (
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-sm text-slate-600">
                Prikazano <span className="font-semibold text-slate-900">{((pagination.currentPage - 1) * pagination.limit) + 1}</span> - <span className="font-semibold text-slate-900">{Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}</span> od <span className="font-semibold text-slate-900">{pagination.totalCount}</span> radnih naloga
                {performance.queryTime && (
                  <span className="ml-2 text-slate-400">({performance.queryTime}ms)</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onPageChange(1)}
                  disabled={!pagination.hasPreviousPage}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  title="Prva strana"
                >
                  &laquo;
                </button>
                <button
                  onClick={() => onPageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  title="Prethodna"
                >
                  &lsaquo;
                </button>

                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(number => {
                    return (
                      number === 1 ||
                      number === pagination.totalPages ||
                      Math.abs(number - pagination.currentPage) <= 1
                    );
                  })
                  .map((number, idx, arr) => (
                    <React.Fragment key={number}>
                      {idx > 0 && arr[idx - 1] !== number - 1 && (
                        <span className="px-2 text-slate-400">...</span>
                      )}
                      <button
                        onClick={() => onPageChange(number)}
                        className={cn(
                          "px-3 py-2 text-sm rounded-lg border font-medium transition-colors",
                          pagination.currentPage === number
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'border-slate-300 bg-white hover:bg-slate-50'
                        )}
                      >
                        {number}
                      </button>
                    </React.Fragment>
                  ))}

                <button
                  onClick={() => onPageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  title="Sledeća"
                >
                  &rsaquo;
                </button>
                <button
                  onClick={() => onPageChange(pagination.totalPages)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  title="Poslednja strana"
                >
                  &raquo;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianLogsSection;
