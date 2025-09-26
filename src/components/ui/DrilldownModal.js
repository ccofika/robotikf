import React, { useState, useEffect } from 'react';
import {
  CloseIcon,
  SearchIcon,
  FilterIcon,
  ExternalLinkIcon,
  UserIcon,
  CalendarIcon,
  MapPinIcon,
  SettingsIcon,
  ClockIcon,
  TrendingUpIcon,
  DownloadIcon,
  EyeIcon
} from '../icons/SvgIcons';
import { Button } from './button-1';
import { cn } from '../../utils/cn';

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

  const getActionColor = (action) => {
    const colors = {
      'installation': 'bg-green-100 text-green-800',
      'removal': 'bg-red-100 text-red-800',
      'service': 'bg-blue-100 text-blue-800',
      'maintenance': 'bg-yellow-100 text-yellow-800',
      'repair': 'bg-orange-100 text-orange-800',
      'material_validation': 'bg-purple-100 text-purple-800'
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      'completed': 'bg-green-100 text-green-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'cancelled': 'bg-red-100 text-red-800',
      'delayed': 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUpIcon size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-600">{subtitle}</p>
            </div>
          </div>
          <Button
            type="secondary"
            size="small"
            onClick={onClose}
            prefix={<CloseIcon size={16} />}
          >
            Zatvori
          </Button>
        </div>

        {/* Filter Summary */}
        {Object.keys(filterCriteria).length > 0 && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
              <FilterIcon size={16} className="mr-2" />
              Primenjeni filteri
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(filterCriteria).map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium"
                >
                  {key}: {Array.isArray(value) ? value.join(', ') : value}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center space-x-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pretraži logove..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Sort */}
              <select
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortField(field);
                  setSortOrder(order);
                }}
                className="h-10 px-3 pr-8 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="timestamp-desc">Datum (najnoviji)</option>
                <option value="timestamp-asc">Datum (najstariji)</option>
                <option value="technician-asc">Tehničar (A-Z)</option>
                <option value="technician-desc">Tehničar (Z-A)</option>
                <option value="action-asc">Akcija (A-Z)</option>
                <option value="municipality-asc">Opština (A-Z)</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">
                {filteredData.length} rezultata
              </span>

              {onExportData && (
                <Button
                  type="secondary"
                  size="small"
                  onClick={() => onExportData(filteredData)}
                  prefix={<DownloadIcon size={16} />}
                >
                  Export
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
              <p className="text-slate-600 font-medium">Učitava detalje...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="p-3 bg-red-50 rounded-xl mb-4 inline-flex">
                <CloseIcon size={48} className="text-red-400" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900 mb-2">Greška</h4>
              <p className="text-slate-600">{error}</p>
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="p-8 text-center">
              <div className="p-3 bg-slate-50 rounded-xl mb-4 inline-flex">
                <SearchIcon size={48} className="text-slate-400" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900 mb-2">Nema rezultata</h4>
              <p className="text-slate-600">
                {searchTerm ? 'Nema logova koji odgovaraju vašoj pretrazi.' : 'Nema dostupnih logova za ovaj segment.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto" style={{ maxHeight: '400px' }}>
              <table className="w-full">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Vreme</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tehničar</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Akcija</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Lokacija</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Radni nalog</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedData.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <CalendarIcon size={14} className="text-slate-400" />
                          <span className="font-mono">{formatDate(item.timestamp)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <UserIcon size={14} className="text-slate-400" />
                          <span className="font-medium">{item.technician}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          getActionColor(item.action)
                        )}>
                          {item.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <MapPinIcon size={14} className="text-slate-400" />
                          <span>{item.municipality}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          getStatusColor(item.status)
                        )}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.workOrderId && (
                          <span className="font-mono text-blue-600">#{item.workOrderId}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {onViewDetails && (
                          <Button
                            type="ghost"
                            size="small"
                            onClick={() => onViewDetails(item)}
                            prefix={<EyeIcon size={14} />}
                          >
                            Detalji
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Prikazano {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)} od {filteredData.length} rezultata
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  type="secondary"
                  size="small"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Prethodna
                </Button>

                <span className="px-3 py-1 text-sm font-medium text-slate-700">
                  {currentPage} / {totalPages}
                </span>

                <Button
                  type="secondary"
                  size="small"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Sledeća
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrilldownModal;