import React, { useState, useEffect } from 'react';
import { Filter, Download, Eye } from 'lucide-react';
import Dialog from '../../security/sx/Dialog';
import { cx, Btn, Sign } from '../../security/sx/ui';
import { Panel } from '../../security/sx/layout';
import { SearchField, Select } from '../../security/sx/forms';
import { Loading } from '../../montaza/ui';
import './DrilldownModal.mx.css';

// Detaljni pregled segmenta grafikona u izgledu Security dela (sx Dialog).
// Isti delovi istim redom kao ranije: zaglavlje, primenjeni filteri, pretraga i sortiranje, tabela, strane.

// Tonovi umesto starih boja (tekst akcije i statusa ostaje kakav jeste)
const ACTION_TONE = { installation: 'ok', removal: 'bad', service: 'info', maintenance: 'warn', repair: 'warn', material_validation: 'info' };
const STATUS_TONE = { completed: 'ok', in_progress: 'info', pending: 'warn', cancelled: 'bad', delayed: 'warn' };

const DrilldownModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  data = [],
  loading = false,
  error = null,
  filterCriteria = {},
  onViewDetails,
  onExportData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (!isOpen) return null;

  // Filter and search data
  const filteredData = data.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.technician?.toLowerCase().includes(searchLower) ||
      item.action?.toLowerCase().includes(searchLower) ||
      item.municipality?.toLowerCase().includes(searchLower) ||
      item.workOrderId?.toString().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower)
    );
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog
      onClose={onClose}
      title={title}
      description={subtitle}
      size="xl"
      className="mx-drill"
      testId="drilldown-modal"
      footer={totalPages > 1 && (
        <div className="mx-drill__pager">
          <span className="mx-drill__muted">
            Prikazano {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)} od {filteredData.length} rezultata
          </span>
          <div className="mx-drill__pagebtns">
            <Btn size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prethodna</Btn>
            <span className="mx-drill__page">{currentPage} / {totalPages}</span>
            <Btn size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Sledeća</Btn>
          </div>
        </div>
      )}
    >
      {/* Primenjeni filteri */}
      {Object.keys(filterCriteria).length > 0 && (
        <div className="mx-drill__filters">
          <h3 className="mx-drill__h"><Filter size={16} strokeWidth={1.9} aria-hidden="true" />Primenjeni filteri</h3>
          <div className="mx-drill__chips">
            {Object.entries(filterCriteria).map(([key, value]) => (
              <span key={key} className="sx-tag is-info">
                {key}: {Array.isArray(value) ? value.join(', ') : value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pretraga, sortiranje, broj rezultata i Export */}
      <div className="mx-drill__tools">
        <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Pretraži logove..." />
        <Select
          size="sm"
          value={`${sortField}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split('-');
            setSortField(field);
            setSortOrder(order);
          }}
        >
          <option value="timestamp-desc">Datum (najnoviji)</option>
          <option value="timestamp-asc">Datum (najstariji)</option>
          <option value="technician-asc">Tehničar (A-Z)</option>
          <option value="technician-desc">Tehničar (Z-A)</option>
          <option value="action-asc">Akcija (A-Z)</option>
          <option value="municipality-asc">Opština (A-Z)</option>
        </Select>
        <div className="mx-drill__end">
          <span className="mx-drill__muted">{filteredData.length} rezultata</span>
          {onExportData && (
            <Btn size="sm" icon={Download} onClick={() => onExportData(filteredData)}>Export</Btn>
          )}
        </div>
      </div>

      {/* Sadržaj */}
      {loading ? (
        <Loading text="Učitava detalje..." />
      ) : error ? (
        <div className="sx-empty-block">
          <b>Greška</b>
          <span>{error}</span>
        </div>
      ) : paginatedData.length === 0 ? (
        <div className="sx-empty-block">
          <b>Nema rezultata</b>
          <span>{searchTerm ? 'Nema logova koji odgovaraju vašoj pretrazi.' : 'Nema dostupnih logova za ovaj segment.'}</span>
        </div>
      ) : (
        <Panel pad={false}>
          <div className="sx-tablewrap">
            <table className="sx-table">
              <thead>
                <tr>
                  <th>Vreme</th>
                  <th>Tehničar</th>
                  <th>Akcija</th>
                  <th>Lokacija</th>
                  <th>Status</th>
                  <th>Radni nalog</th>
                  <th className="is-end">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, index) => (
                  <tr key={item.id || index} style={{ '--i': index }}>
                    <td className="is-head"><span className="sx-mono">{formatDate(item.timestamp)}</span></td>
                    <td data-label="Tehničar">{item.technician}</td>
                    <td data-label="Akcija">
                      <span className={cx('sx-tag', ACTION_TONE[item.action] && `is-${ACTION_TONE[item.action]}`)}>{item.action}</span>
                    </td>
                    <td data-label="Lokacija">{item.municipality}</td>
                    <td data-label="Status"><Sign tone={STATUS_TONE[item.status] || 'idle'}>{item.status}</Sign></td>
                    <td data-label="Radni nalog">
                      {item.workOrderId && <span className="sx-mono">#{item.workOrderId}</span>}
                    </td>
                    <td className="is-actions is-end">
                      {onViewDetails && (
                        <div className="sx-rowacts">
                          <Btn size="sm" variant="ghost" icon={Eye} onClick={() => onViewDetails(item)}>Detalji</Btn>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </Dialog>
  );
};

export default DrilldownModal;
