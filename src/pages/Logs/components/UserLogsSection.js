import React, { useState, useMemo } from 'react';
import {
  UserIcon,
  ChevronRightIcon,
  MapPinIcon,
  ClockIcon,
  CheckIcon,
  PhoneIcon,
  TableIcon,
  CommentIcon,
  ImageIcon,
  FilterIcon,
  DownloadIcon,
  CalendarIcon,
  ChartIcon,
  ChevronDownIcon,
  SearchIcon,
  CloseIcon,
  FileIcon,
  AlertIcon
} from '../../../components/icons/SvgIcons';
import { Button } from '../../../components/ui/button-1';
import { cn } from '../../../utils/cn';

const UserLogsSection = ({
  logs,
  expandedGroups,
  toggleGroup,
  getActionIcon,
  getActionColor,
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
  const [viewMode, setViewMode] = useState('card'); // 'card', 'compact'

  // Selected items for bulk operations
  const [selectedItems, setSelectedItems] = useState(new Set());

  // Expand/collapse all
  const [expandAll, setExpandAll] = useState(false);

  // Collect all individual logs with their user info first - BEFORE early return
  const allLogs = useMemo(() => {
    const logs_array = [];
    if (!logs || logs.length === 0) return logs_array;

    logs.forEach((userGroup) => {
      (userGroup.logs || []).forEach((log) => {
        logs_array.push({
          ...log,
          userName: userGroup.userName || userGroup.user || 'Nepoznat korisnik',
          userId: userGroup.userId
        });
      });
    });
    return logs_array;
  }, [logs]);

  // Group by user ID
  const groupedLogs = useMemo(() => {
    const grouped = {};
    logs.forEach((userGroup, index) => {
      const key = userGroup.userId || `user-${index}`;
      grouped[key] = {
        user: userGroup.userName || userGroup.user || 'Nepoznat korisnik',
        userId: userGroup.userId,
        logs: userGroup.logs || []
      };
    });
    return grouped;
  }, [logs]);

  // Calculate quick stats
  const quickStats = useMemo(() => {
    const totalActivities = allLogs.length;
    const activeUsers = Object.keys(groupedLogs).length;
    const withWorkOrders = allLogs.filter(log => log.workOrderId).length;
    const withServiceInfo = allLogs.filter(log => log.serviceInfo).length;
    const withImages = allLogs.filter(log => log.images && log.images.length > 0).length;

    return {
      totalActivities,
      activeUsers,
      withWorkOrders,
      withServiceInfo,
      withImages
    };
  }, [allLogs, groupedLogs]);

  // Loading state
  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-12">
        <div className="flex flex-col items-center text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Učitavanje logova korisnika...</p>
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
            <UserIcon size={64} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Nema logova korisnika</h3>
          <p className="text-slate-600">Trenutno nema aktivnosti korisnika za prikazivanje.</p>
        </div>
      </div>
    );
  }

  // Data is already paginated and sorted from server
  const groupedLogsArray = Object.entries(groupedLogs);
  const currentGroups = groupedLogsArray;

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

        {/* Active Users */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Korisnici</p>
              <h3 className="text-2xl font-bold text-green-900">{quickStats.activeUsers}</h3>
              <p className="text-xs text-green-600 mt-1">aktivnih</p>
            </div>
            <div className="p-3 bg-green-200 rounded-lg">
              <UserIcon size={24} className="text-green-700" />
            </div>
          </div>
        </div>

        {/* With Work Orders */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">Radni nalozi</p>
              <h3 className="text-2xl font-bold text-purple-900">{quickStats.withWorkOrders}</h3>
              <p className="text-xs text-purple-600 mt-1">sa WO</p>
            </div>
            <div className="p-3 bg-purple-200 rounded-lg">
              <CheckIcon size={24} className="text-purple-700" />
            </div>
          </div>
        </div>

        {/* With Service Info */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-600 uppercase tracking-wider mb-1">Usluge</p>
              <h3 className="text-2xl font-bold text-orange-900">{quickStats.withServiceInfo}</h3>
              <p className="text-xs text-orange-600 mt-1">sa info</p>
            </div>
            <div className="p-3 bg-orange-200 rounded-lg">
              <TableIcon size={24} className="text-orange-700" />
            </div>
          </div>
        </div>

        {/* With Images */}
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-pink-600 uppercase tracking-wider mb-1">Slike</p>
              <h3 className="text-2xl font-bold text-pink-900">{quickStats.withImages}</h3>
              <p className="text-xs text-pink-600 mt-1">sa slikama</p>
            </div>
            <div className="p-3 bg-pink-200 rounded-lg">
              <ImageIcon size={24} className="text-pink-700" />
            </div>
          </div>
        </div>
      </div>

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
            const hasWorkOrders = group.logs.some(log => log.workOrderId);
            const hasServiceInfo = group.logs.some(log => log.serviceInfo);
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

                  {/* User */}
                  <div className="col-span-4">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <UserIcon size={16} className="text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {group.user}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <div className="flex flex-wrap gap-1">
                      {hasWorkOrders && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <CheckIcon size={10} className="mr-1" />
                          WO
                        </span>
                      )}
                      {hasServiceInfo && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <TableIcon size={10} className="mr-1" />
                          Usluga
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Activities */}
                  <div className="col-span-1 text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-800">
                      {totalLogs}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="col-span-2">
                    <div className="flex items-center text-sm text-slate-600">
                      <ClockIcon size={14} className="mr-1" />
                      {latestLogDate.toLocaleDateString('sr-RS')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end space-x-2">
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
                                <span className="text-xs text-slate-600">{log.userName}</span>
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
                              {log.address && (
                                <span className="flex items-center truncate">
                                  <MapPinIcon size={10} className="mr-1" />
                                  {log.address}
                                </span>
                              )}
                              {log.phone && (
                                <span className="flex items-center">
                                  <PhoneIcon size={10} className="mr-1" />
                                  {log.phone}
                                </span>
                              )}
                            </div>

                            {/* Service Info - INLINE Compact */}
                            {log.serviceInfo && (
                              <div className="flex items-center flex-wrap gap-2 mt-1">
                                <div className="flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                                  <TableIcon size={10} className="text-orange-600" />
                                  <span className="text-xs text-orange-800 font-medium">
                                    {log.serviceInfo.type && `Tip: ${log.serviceInfo.type}`}
                                    {log.serviceInfo.speed && ` | ${log.serviceInfo.speed}`}
                                  </span>
                                </div>
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
            const hasWorkOrders = group.logs.some(log => log.workOrderId);
            const hasServiceInfo = group.logs.some(log => log.serviceInfo);
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
                        <UserIcon size={20} className="text-blue-700" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-lg truncate">
                          {group.user}
                        </h3>
                        <div className="flex items-center flex-wrap gap-3 mt-1">
                          <span className="flex items-center text-sm text-slate-600">
                            <ClockIcon size={12} className="mr-1" />
                            {latestLogDate.toLocaleDateString('sr-RS')}
                          </span>
                          <span className="text-sm text-slate-600">
                            • {totalLogs} {totalLogs === 1 ? 'aktivnost' : 'aktivnosti'}
                          </span>
                        </div>
                      </div>

                      {/* Status badges */}
                      <div className="flex flex-wrap gap-2">
                        {hasWorkOrders && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                            <CheckIcon size={12} className="mr-1" />
                            WO
                          </span>
                        )}
                        {hasServiceInfo && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                            <TableIcon size={12} className="mr-1" />
                            Usluga
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

                    {/* Right side - expand icon */}
                    <div className={cn(
                      "p-2 bg-slate-100 rounded-lg transition-all duration-200 ml-4",
                      expandedGroups?.has(groupKey) ? "rotate-90 bg-slate-200" : ""
                    )}>
                      <ChevronRightIcon size={20} className="text-slate-600" />
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
                                <span className="text-xs text-slate-600">{log.userName}</span>
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
                              {log.address && (
                                <span className="flex items-center truncate">
                                  <MapPinIcon size={10} className="mr-1" />
                                  {log.address}
                                </span>
                              )}
                              {log.phone && (
                                <span className="flex items-center">
                                  <PhoneIcon size={10} className="mr-1" />
                                  {log.phone}
                                </span>
                              )}
                            </div>

                            {/* Service Info - INLINE Compact */}
                            {log.serviceInfo && (
                              <div className="flex items-center flex-wrap gap-2 mt-1">
                                <div className="flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                                  <TableIcon size={10} className="text-orange-600" />
                                  <span className="text-xs text-orange-800 font-medium">
                                    {[
                                      log.serviceInfo.type && `Tip: ${log.serviceInfo.type}`,
                                      log.serviceInfo.speed && log.serviceInfo.speed,
                                      log.serviceInfo.package && log.serviceInfo.package
                                    ].filter(Boolean).join(' | ')}
                                  </span>
                                </div>
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
                Prikazano <span className="font-semibold text-slate-900">{((pagination.currentPage - 1) * pagination.limit) + 1}</span> - <span className="font-semibold text-slate-900">{Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}</span> od <span className="font-semibold text-slate-900">{pagination.totalCount}</span> korisnika
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

export default UserLogsSection;
