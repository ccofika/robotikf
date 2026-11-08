import React, { useState, useMemo } from 'react';
import {
  HardHat, ChevronRight, ChevronDown, User, MapPin, Clock, Package, Router, MessageSquare, Image as ImageIcon,
  AlertTriangle, BarChart3, Download, Rows3, LayoutList, ChevronsDown, ChevronsUp, ArrowUpRight
} from 'lucide-react';
import { cx, Btn, Led, Sign } from '../../../security/sx/ui';
import { Panel, Stat, KV } from '../../../security/sx/layout';
import { Checkbox, Choice } from '../../../security/sx/forms';
import { Pager, Loading } from '../../../montaza/ui';
import { toast } from '../../../utils/toast';

// Boja akcije (getActionColor) -> ton znaka
const TONE = { success: 'ok', warning: 'warn', danger: 'bad', info: 'info', neutral: 'idle' };

// Štikliranje grupe; klik ne otvara karticu ispod
const Pick = ({ checked, onToggle }) => (
  <span className="mx-logs-pick" onClick={(e) => e.stopPropagation()}>
    <Checkbox checked={checked} onChange={onToggle} />
  </span>
);

// Aktivnosti jedne grupe (isti prikaz u kompaktnom i u prikazu kartica)
const Entries = ({ logs, getActionIcon, getActionColor }) => (
  <div className="mx-logs-entries">
    {logs.map((log, index) => (
      <div key={index} className="mx-logs-entry">
        <span className="mx-logs-entry__icon" data-tone={TONE[getActionColor(log.action)]}>
          {getActionIcon(log.action)}
        </span>
        <div className="mx-logs-entry__body">
          <div className="mx-logs-entry__top">
            <b>{log.description || 'Aktivnost'}</b>
            <span aria-hidden="true">•</span>
            <span>{log.technicianName}</span>
            <span className="mx-logs-entry__time">
              <Clock size={12} strokeWidth={1.9} aria-hidden="true" />
              {new Date(log.timestamp).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="mx-logs-entry__meta">
            {log.userInfo && (
              <span>
                <User size={12} strokeWidth={1.9} aria-hidden="true" />
                {typeof log.userInfo === 'object' ? (log.userInfo.name || 'N/A') : log.userInfo}
              </span>
            )}
            {(log.address || (log.workOrderId && typeof log.workOrderId === 'object' && log.workOrderId.address)) && (
              <span>
                <MapPin size={12} strokeWidth={1.9} aria-hidden="true" />
                {log.address || log.workOrderId.address}
              </span>
            )}
          </div>

          {(log.materials || log.equipment) && (
            <div className="mx-logs-entry__chips">
              {log.materials && log.materials.length > 0 && (
                <span className="sx-tag mx-logs-chip">
                  <Package aria-hidden="true" strokeWidth={1.9} />
                  {log.materials.map(m => `${m.description}: ${m.quantity}`).join(', ')}
                </span>
              )}
              {log.equipment && log.equipment.length > 0 && (
                <span className="sx-tag mx-logs-chip">
                  <Router aria-hidden="true" strokeWidth={1.9} />
                  {log.equipment.map(e => e.description).join(', ')}
                </span>
              )}
            </div>
          )}

          {(log.comment || (log.images && log.images.length > 0)) && (
            <div className="mx-logs-entry__chips">
              {log.comment && (
                <span className="sx-tag is-info mx-logs-chip is-clip">
                  <MessageSquare aria-hidden="true" strokeWidth={1.9} />
                  <span>{log.comment}</span>
                </span>
              )}
              {log.images && log.images.length > 0 && (
                <span className="sx-tag mx-logs-chip">
                  <ImageIcon aria-hidden="true" strokeWidth={1.9} />
                  {log.images.length} slika
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

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
      <Panel pad={false}>
        <Loading text="Učitavanje logova tehničara..." />
      </Panel>
    );
  }

  // Early return AFTER all hooks
  if (!logs || logs.length === 0) {
    return (
      <Panel pad={false}>
        <div className="sx-empty-block">
          <b>Nema logova tehničara</b>
          <span>Trenutno nema aktivnosti tehničara za prikazivanje.</span>
        </div>
      </Panel>
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
    toast.info(`Eksportovanje ${selectedItems.size} selektovanih stavki...`);
  };

  const openWorkOrder = (e, woId) => {
    e.stopPropagation();
    window.open(`/work-orders/${woId}`, '_blank');
  };

  return (
    <div className="mx-logs-sec" data-testid="logs-technicians">
      {/* Brojke */}
      <div className="sx-stats">
        <Stat label="Aktivnosti" value={quickStats.totalActivities} sub="ukupno logova" />
        <Stat label="Radni nalozi" value={quickStats.activeWorkOrders} sub="aktivnih WO" />
        <Stat label="Materijal" value={quickStats.totalMaterials} sub="ukupno korišćeno" />
        <Stat
          label="Anomalije"
          value={quickStats.anomalyCount}
          sub={quickStats.anomalyCount > 0 ? 'detektovano' : 'nema problema'}
          tone={quickStats.anomalyCount > 0 ? 'bad' : null}
        />
        <Stat label="Tehničari" value={quickStats.uniqueTechnicians} sub="aktivnih" />
      </div>

      {/* Anomalije u materijalu */}
      {materialValidationData && quickStats.anomalyCount > 0 && (
        <Panel
          tone="bad"
          testId="logs-anomalies"
          title={
            <span className="sx-panel__title-row">
              <AlertTriangle size={18} strokeWidth={1.9} aria-hidden="true" />
              Upozorenje: Detektovane anomalije u materijalu
              <span className="sx-tag is-bad">{quickStats.anomalyCount}</span>
            </span>
          }
          sub="Pregled neobičnih korišćenja materijala koja zahtevaju pažnju"
          actions={
            <Btn
              size="sm"
              variant={showMaterialValidation ? 'primary' : 'secondary'}
              icon={showMaterialValidation ? ChevronDown : BarChart3}
              onClick={() => setShowMaterialValidation(!showMaterialValidation)}
              data-testid="logs-anomalies-toggle"
            >
              {showMaterialValidation ? 'Sakrij detalje' : 'Prikaži detalje'}
            </Btn>
          }
        >
          {showMaterialValidation && (
            <div className="mx-logs-mv">
              <section>
                <div className="mx-logs-mv__head">
                  <h3 className="sx-label mx-logs-mv__title"><Led tone="ok" />Prosečna potrošnja</h3>
                </div>
                <div className="mx-logs-scroll is-sm">
                  <KV
                    items={Object.entries(materialValidationData.averages || {}).map(([key, value]) => ({
                      k: key,
                      v: <b className="sx-mono">{typeof value === 'object' ? Math.round(value.average || 0) : value}</b>
                    }))}
                  />
                </div>
              </section>

              <section>
                <div className="mx-logs-mv__head">
                  <h3 className="sx-label mx-logs-mv__title"><Led tone="bad" live />Detektovane anomalije</h3>
                  <span className="sx-tag is-bad">{materialValidationData.anomalies?.length || 0} pronađeno</span>
                </div>
                <div className="mx-logs-scroll sx-list">
                  {materialValidationData.anomalies?.map((anomaly, index) => (
                    <div key={index} className="sx-item">
                      <span className={cx('sx-item__icon', anomaly.severity === 'high' ? 'is-bad' : 'is-warn')}>
                        <Package size={16} strokeWidth={1.9} aria-hidden="true" />
                      </span>
                      <div className="sx-item__main">
                        <div className="mx-logs-anom__top">
                          <b>{anomaly.materialDetails?.materialType || 'N/A'}</b>
                          <Sign tone={anomaly.severity === 'high' ? 'bad' : 'warn'}>
                            {anomaly.severity === 'high' ? 'VISOK' : 'UMEREN'}
                          </Sign>
                        </div>
                        <span className="mx-logs-anom__meta">
                          <span><HardHat size={12} strokeWidth={1.9} aria-hidden="true" />{anomaly.performedByName || 'Nepoznat'}</span>
                          <span><Clock size={12} strokeWidth={1.9} aria-hidden="true" />{new Date(anomaly.timestamp).toLocaleDateString('sr-RS')}</span>
                        </span>
                        <span className="mx-logs-anom__meta">
                          <span>Korišćeno: <b>{anomaly.materialDetails?.quantity || 0}</b></span>
                          <span>Očekivano: {anomaly.expectedRange || 'N/A'}</span>
                        </span>
                      </div>
                      {anomaly.workOrderId && (
                        <div className="sx-item__side">
                          <Btn
                            size="sm"
                            iconRight={ArrowUpRight}
                            onClick={(e) => openWorkOrder(e, typeof anomaly.workOrderId === 'object'
                              ? anomaly.workOrderId._id
                              : anomaly.workOrderId)}
                          >
                            Otvori WO
                          </Btn>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </Panel>
      )}

      {/* Prikaz i grupne radnje (kartica, kao ranije) */}
      <Panel className="mx-logs-bar" testId="logs-view-bar">
        <div className="mx-logs-bar__row">
          <span className="sx-label">Prikaz:</span>
          <Choice
            size="sm"
            label="Prikaz"
            layoutId="mx-logs-view-tech"
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: 'compact', label: 'Kompaktno', icon: Rows3, testId: 'logs-view-compact' },
              { value: 'card', label: 'Kartice', icon: LayoutList, testId: 'logs-view-card' }
            ]}
          />
          {selectedItems.size > 0 && (
            <span className="mx-logs-sel" data-testid="logs-selected">
              Selektovano: <b>{selectedItems.size}</b>
              <Btn size="sm" variant="ghost" onClick={() => setSelectedItems(new Set())}>
                Poništi
              </Btn>
            </span>
          )}
          <div className="mx-logs-bar__end">
            <Btn size="sm" icon={expandAll ? ChevronsUp : ChevronsDown} onClick={handleExpandAll} data-testid="logs-expand-all">
              {expandAll ? 'Zatvori sve' : 'Otvori sve'}
            </Btn>
            {selectedItems.size > 0 && (
              <Btn size="sm" variant="primary" icon={Download} onClick={handleExportSelected} data-testid="logs-export-selected">
                Eksportuj ({selectedItems.size})
              </Btn>
            )}
          </div>
        </div>
      </Panel>

      {/* Kompaktno: jedan red po grupi, svaka grupa je kartica (kao ranije) */}
      {viewMode === 'compact' && (
        <div className="mx-logs-cards is-compact" data-testid="logs-compact">
          {currentGroups.map(([groupKey, group], i) => {
            const totalLogs = group.logs.length;
            const latestLogDate = group.logs.length > 0
              ? new Date(Math.max(...group.logs.map(log => new Date(log.timestamp))))
              : new Date();
            const hasMaterials = group.logs.some(log => log.materialDetails);
            const hasEquipment = group.logs.some(log => log.equipmentDetails);
            const isExpanded = expandedGroups?.has(groupKey);

            return (
              <article key={groupKey} className={cx('sx-card mx-logs-card', selectedItems.has(groupKey) && 'is-selected')} style={{ '--i': i }} data-testid="logs-group">
                <div className="mx-logs-row">
                  <Pick checked={selectedItems.has(groupKey)} onToggle={() => handleSelectItem(groupKey)} />
                  <span className="sx-item__icon"><HardHat size={16} strokeWidth={1.9} aria-hidden="true" /></span>
                  <div className="sx-cell">
                    <b>{group.technician}</b>
                    {group.workOrderInfo && (
                      <span>WO: {group.workOrderInfo.tisJobId || group.workOrderId}</span>
                    )}
                  </div>
                  <div className="mx-logs-tags">
                    {hasMaterials && (
                      <span className="sx-tag"><Package aria-hidden="true" strokeWidth={1.9} />Materijal</span>
                    )}
                    {hasEquipment && (
                      <span className="sx-tag"><Router aria-hidden="true" strokeWidth={1.9} />Oprema</span>
                    )}
                  </div>
                  <span className="sx-count">{totalLogs}</span>
                  <div className="mx-logs-row__end">
                    <span className="mx-logs-date">
                      <Clock size={13} strokeWidth={1.9} aria-hidden="true" />
                      {latestLogDate.toLocaleDateString('sr-RS')}
                    </span>
                    <div className="sx-rowacts">
                      {group.workOrderId && group.workOrderId !== 'general' && (
                        <Btn size="sm" variant="ghost" iconRight={ArrowUpRight} onClick={(e) => openWorkOrder(e, group.workOrderInfo?._id || group.workOrderId)}>
                          WO
                        </Btn>
                      )}
                      <Btn size="sm" variant="ghost" onClick={() => toggleGroup(groupKey)} aria-expanded={!!isExpanded}>
                        {isExpanded ? 'Zatvori' : 'Detalji'}
                      </Btn>
                    </div>
                  </div>
                </div>
                {isExpanded && <Entries logs={group.logs} getActionIcon={getActionIcon} getActionColor={getActionColor} />}
              </article>
            );
          })}
        </div>
      )}

      {/* Kartice: zaglavlje otvara aktivnosti */}
      {viewMode === 'card' && (
        <div className="mx-logs-cards" data-testid="logs-cards">
          {currentGroups.map(([groupKey, group], i) => {
            const totalLogs = group.logs.length;
            const latestLogDate = group.logs.length > 0
              ? new Date(Math.max(...group.logs.map(log => new Date(log.timestamp))))
              : new Date();
            const hasMaterials = group.logs.some(log => log.materialDetails);
            const hasEquipment = group.logs.some(log => log.equipmentDetails);
            const hasImages = group.logs.some(log => log.images && log.images.length > 0);
            const isOpen = expandedGroups?.has(groupKey);

            return (
              <article
                key={groupKey}
                className={cx('sx-card mx-logs-card', selectedItems.has(groupKey) && 'is-selected')}
                style={{ '--i': i }}
                data-testid="logs-group"
              >
                <div
                  className="mx-logs-card__head"
                  tabIndex={0}
                  onClick={() => toggleGroup(groupKey)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) toggleGroup(groupKey); }}
                >
                  <Pick checked={selectedItems.has(groupKey)} onToggle={() => handleSelectItem(groupKey)} />
                  <span className="sx-item__icon"><HardHat size={18} strokeWidth={1.9} aria-hidden="true" /></span>
                  <div className="sx-item__main">
                    <h3 className="mx-logs-card__title">
                      {group.workOrderInfo
                        ? `${group.technician}${group.workOrderInfo.tisJobId ? ` (${group.workOrderInfo.tisJobId})` : ''}`
                        : `${group.technician} - Opšte aktivnosti`}
                    </h3>
                    <span className="mx-logs-card__meta">
                      <span className="mx-logs-date">
                        <Clock size={12} strokeWidth={1.9} aria-hidden="true" />
                        {latestLogDate.toLocaleDateString('sr-RS')}
                      </span>
                      <span>• {totalLogs} {totalLogs === 1 ? 'aktivnost' : 'aktivnosti'}</span>
                      {group.workOrderInfo?.userName && (
                        <span>• {group.workOrderInfo.userName}</span>
                      )}
                    </span>
                  </div>
                  <div className="mx-logs-card__end">
                    <div className="mx-logs-tags">
                      {hasMaterials && (
                        <span className="sx-tag"><Package aria-hidden="true" strokeWidth={1.9} />Materijal</span>
                      )}
                      {hasEquipment && (
                        <span className="sx-tag"><Router aria-hidden="true" strokeWidth={1.9} />Oprema</span>
                      )}
                      {hasImages && (
                        <span className="sx-tag"><ImageIcon aria-hidden="true" strokeWidth={1.9} />Slike</span>
                      )}
                    </div>
                    {group.workOrderId && group.workOrderId !== 'general' && (
                      <Btn size="sm" className="mx-logs-card__wo" iconRight={ArrowUpRight} onClick={(e) => openWorkOrder(e, group.workOrderInfo?._id || group.workOrderId)}>
                        WO
                      </Btn>
                    )}
                  </div>
                  <span className={cx('mx-logs-chev', isOpen && 'is-open')} aria-hidden="true">
                    <ChevronRight size={18} strokeWidth={1.9} />
                  </span>
                </div>
                {isOpen && <Entries logs={group.logs} getActionIcon={getActionIcon} getActionColor={getActionColor} />}
              </article>
            );
          })}
        </div>
      )}

      {/* Paginacija (server) */}
      {pagination.totalPages > 1 && onPageChange && (
        <Panel pad={false} className="mx-logs-pager">
          <Pager
            page={pagination.currentPage}
            total={pagination.totalCount}
            perPage={pagination.limit}
            onPage={onPageChange}
            label={<>radnih naloga{performance.queryTime ? <span className="sx-faint"> ({performance.queryTime}ms)</span> : null}</>}
            testId="logs-pager"
          />
        </Panel>
      )}
    </div>
  );
};

export default TechnicianLogsSection;
