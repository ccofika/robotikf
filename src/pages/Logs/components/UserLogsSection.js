import React, { useState, useMemo } from 'react';
import {
  User, ChevronRight, MapPin, Clock, CheckCircle2, Phone, Table2, MessageSquare, Image as ImageIcon,
  Download, Rows3, LayoutList, ChevronsDown, ChevronsUp, ArrowUpRight
} from 'lucide-react';
import { cx, Btn } from '../../../security/sx/ui';
import { Panel, Stat } from '../../../security/sx/layout';
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

// Opis usluge: kompaktni prikaz i kartice su i ranije imali različit tekst
const serviceText = (info, card) => (card
  ? [
    info.type && `Tip: ${info.type}`,
    info.speed && info.speed,
    info.package && info.package
  ].filter(Boolean).join(' | ')
  : <>{info.type && `Tip: ${info.type}`}{info.speed && ` | ${info.speed}`}</>);

// Aktivnosti jednog korisnika
const Entries = ({ logs, getActionIcon, getActionColor, card }) => (
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
            <span>{log.userName}</span>
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
            {log.address && (
              <span>
                <MapPin size={12} strokeWidth={1.9} aria-hidden="true" />
                {log.address}
              </span>
            )}
            {log.phone && (
              <span>
                <Phone size={12} strokeWidth={1.9} aria-hidden="true" />
                {log.phone}
              </span>
            )}
          </div>

          {log.serviceInfo && (
            <div className="mx-logs-entry__chips">
              <span className="sx-tag mx-logs-chip">
                <Table2 aria-hidden="true" strokeWidth={1.9} />
                {serviceText(log.serviceInfo, card)}
              </span>
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
      <Panel pad={false}>
        <Loading text="Učitavanje logova korisnika..." />
      </Panel>
    );
  }

  // Early return AFTER all hooks
  if (!logs || logs.length === 0) {
    return (
      <Panel pad={false}>
        <div className="sx-empty-block">
          <b>Nema logova korisnika</b>
          <span>Trenutno nema aktivnosti korisnika za prikazivanje.</span>
        </div>
      </Panel>
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
    toast.info(`Eksportovanje ${selectedItems.size} selektovanih stavki...`);
  };

  // Prvi radni nalog u grupi (dugme WO)
  const openFirstWorkOrder = (e, group) => {
    e.stopPropagation();
    const firstLogWithWO = group.logs.find(log => log.workOrderId);
    if (firstLogWithWO) {
      const workOrderId = typeof firstLogWithWO.workOrderId === 'object'
        ? firstLogWithWO.workOrderId._id
        : firstLogWithWO.workOrderId;
      window.open(`/work-orders/${workOrderId}`, '_blank');
    }
  };

  return (
    <div className="mx-logs-sec" data-testid="logs-users">
      {/* Brojke */}
      <div className="sx-stats">
        <Stat label="Aktivnosti" value={quickStats.totalActivities} sub="ukupno logova" />
        <Stat label="Korisnici" value={quickStats.activeUsers} sub="aktivnih" />
        <Stat label="Radni nalozi" value={quickStats.withWorkOrders} sub="sa WO" />
        <Stat label="Usluge" value={quickStats.withServiceInfo} sub="sa info" />
        <Stat label="Slike" value={quickStats.withImages} sub="sa slikama" />
      </div>

      {/* Prikaz i grupne radnje (kartica, kao ranije) */}
      <Panel className="mx-logs-bar" testId="logs-view-bar">
        <div className="mx-logs-bar__row">
          <span className="sx-label">Prikaz:</span>
          <Choice
            size="sm"
            label="Prikaz"
            layoutId="mx-logs-view-users"
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
            const hasWorkOrders = group.logs.some(log => log.workOrderId);
            const hasServiceInfo = group.logs.some(log => log.serviceInfo);
            const isExpanded = expandedGroups?.has(groupKey);

            return (
              <article key={groupKey} className={cx('sx-card mx-logs-card', selectedItems.has(groupKey) && 'is-selected')} style={{ '--i': i }} data-testid="logs-group">
                <div className="mx-logs-row">
                  <Pick checked={selectedItems.has(groupKey)} onToggle={() => handleSelectItem(groupKey)} />
                  <span className="sx-item__icon"><User size={16} strokeWidth={1.9} aria-hidden="true" /></span>
                  <div className="sx-cell">
                    <b>{group.user}</b>
                  </div>
                  <div className="mx-logs-tags">
                    {hasWorkOrders && (
                      <span className="sx-tag"><CheckCircle2 aria-hidden="true" strokeWidth={1.9} />WO</span>
                    )}
                    {hasServiceInfo && (
                      <span className="sx-tag"><Table2 aria-hidden="true" strokeWidth={1.9} />Usluga</span>
                    )}
                  </div>
                  <span className="sx-count">{totalLogs}</span>
                  <div className="mx-logs-row__end">
                    <span className="mx-logs-date">
                      <Clock size={13} strokeWidth={1.9} aria-hidden="true" />
                      {latestLogDate.toLocaleDateString('sr-RS')}
                    </span>
                    <div className="sx-rowacts">
                      {hasWorkOrders && (
                        <Btn size="sm" variant="ghost" iconRight={ArrowUpRight} onClick={(e) => openFirstWorkOrder(e, group)}>
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
            const hasWorkOrders = group.logs.some(log => log.workOrderId);
            const hasServiceInfo = group.logs.some(log => log.serviceInfo);
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
                  <span className="sx-item__icon"><User size={18} strokeWidth={1.9} aria-hidden="true" /></span>
                  <div className="sx-item__main">
                    <h3 className="mx-logs-card__title">{group.user}</h3>
                    <span className="mx-logs-card__meta">
                      <span className="mx-logs-date">
                        <Clock size={12} strokeWidth={1.9} aria-hidden="true" />
                        {latestLogDate.toLocaleDateString('sr-RS')}
                      </span>
                      <span>• {totalLogs} {totalLogs === 1 ? 'aktivnost' : 'aktivnosti'}</span>
                    </span>
                  </div>
                  <div className="mx-logs-card__end">
                    <div className="mx-logs-tags">
                      {hasServiceInfo && (
                        <span className="sx-tag"><Table2 aria-hidden="true" strokeWidth={1.9} />Usluga</span>
                      )}
                      {hasImages && (
                        <span className="sx-tag"><ImageIcon aria-hidden="true" strokeWidth={1.9} />Slike</span>
                      )}
                    </div>
                    {hasWorkOrders && (
                      <Btn size="sm" className="mx-logs-card__wo" iconRight={ArrowUpRight} onClick={(e) => openFirstWorkOrder(e, group)}>
                        WO
                      </Btn>
                    )}
                  </div>
                  <span className={cx('mx-logs-chev', isOpen && 'is-open')} aria-hidden="true">
                    <ChevronRight size={18} strokeWidth={1.9} />
                  </span>
                </div>
                {isOpen && <Entries logs={group.logs} getActionIcon={getActionIcon} getActionColor={getActionColor} card />}
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
            label={<>korisnika{performance.queryTime ? <span className="sx-faint"> ({performance.queryTime}ms)</span> : null}</>}
            testId="logs-pager"
          />
        </Panel>
      )}
    </div>
  );
};

export default UserLogsSection;
