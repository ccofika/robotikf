import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { SearchIcon, RefreshIcon, FilterIcon, CloseIcon, ChevronDownIcon, ChevronUpIcon } from '../icons/SvgIcons';
import { Button } from '../ui/button-1';

const FancyDataTable = ({
  data = [],
  columns = [],
  pagination,
  onPageChange,
  loading = false,
  filterFields = [],
  onFilterChange,
  filters = {},
  searchValue = '',
  onSearchChange,
  onRefresh,
  isRefreshing = false,
  className = ''
}) => {
  const [showFilters, setShowFilters] = useState(true);
  const [expandedFilters, setExpandedFilters] = useState({});

  // Initialize all filters as expanded
  useEffect(() => {
    const initialExpanded = {};
    filterFields.forEach(field => {
      initialExpanded[field.id] = true;
    });
    setExpandedFilters(initialExpanded);
  }, [filterFields]);

  const toggleFilterExpand = (filterId) => {
    setExpandedFilters(prev => ({
      ...prev,
      [filterId]: !prev[filterId]
    }));
  };

  const handleFilterChange = (filterId, value) => {
    onFilterChange({ ...filters, [filterId]: value });
  };

  const clearAllFilters = () => {
    const clearedFilters = {};
    filterFields.forEach(field => {
      clearedFilters[field.id] = '';
    });
    onFilterChange(clearedFilters);
    onSearchChange('');
  };

  const hasActiveFilters = () => {
    return searchValue || Object.values(filters).some(value => value && value !== '');
  };

  return (
    <div className="flex w-full flex-col sm:flex-row gap-6">
      {/* Filters Sidebar */}
      {showFilters && (
        <div className="w-full sm:w-64 lg:w-72 flex-shrink-0">
          <div className="sticky top-6 space-y-4">
            {/* Filter Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Filteri</h3>
                {hasActiveFilters() && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Obriši sve
                  </button>
                )}
              </div>

              {/* Search */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Pretraga
                </label>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Pretraži..."
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchValue && (
                    <button
                      onClick={() => onSearchChange('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <CloseIcon size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Fields */}
              <div className="space-y-3">
                {filterFields.map((field) => (
                  <div key={field.id} className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
                    <button
                      onClick={() => toggleFilterExpand(field.id)}
                      className="w-full flex items-center justify-between text-xs font-medium text-slate-700 mb-2 hover:text-slate-900"
                    >
                      <span>{field.label}</span>
                      {expandedFilters[field.id] ? (
                        <ChevronUpIcon size={14} />
                      ) : (
                        <ChevronDownIcon size={14} />
                      )}
                    </button>

                    {expandedFilters[field.id] && (
                      <div className="mt-2">
                        {field.type === 'select' && (
                          <select
                            value={filters[field.id] || ''}
                            onChange={(e) => handleFilterChange(field.id, e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Svi</option>
                            {field.options?.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {field.type === 'date' && (
                          <input
                            type="date"
                            value={filters[field.id] || ''}
                            onChange={(e) => handleFilterChange(field.id, e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        )}

                        {field.type === 'multiselect' && (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {field.options?.map(option => {
                              const isSelected = filters[field.id]?.includes(option.value);
                              return (
                                <label key={option.value} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const currentValues = filters[field.id] || [];
                                      const newValues = e.target.checked
                                        ? [...currentValues, option.value]
                                        : currentValues.filter(v => v !== option.value);
                                      handleFilterChange(field.id, newValues);
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-slate-700">{option.label}</span>
                                  {option.count !== undefined && (
                                    <span className="ml-auto text-xs text-slate-500">{option.count}</span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Results Info */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <div className="text-xs text-slate-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Rezultati</span>
                  <span className="text-slate-900 font-semibold">{pagination?.totalCount || 0}</span>
                </div>
                {hasActiveFilters() && (
                  <div className="text-xs text-blue-600">
                    Aktivni filteri
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="tertiary"
                size="small"
                onClick={() => setShowFilters(!showFilters)}
                prefix={<FilterIcon size={16} />}
              >
                {showFilters ? 'Sakrij filtere' : 'Prikaži filtere'}
              </Button>
              <span className="text-sm text-slate-600">
                {pagination?.totalCount || 0} rezultata
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasActiveFilters() && (
                <Button
                  type="tertiary"
                  size="small"
                  onClick={clearAllFilters}
                  prefix={<CloseIcon size={16} />}
                >
                  Resetuj
                </Button>
              )}
              <Button
                type="secondary"
                size="small"
                onClick={onRefresh}
                disabled={isRefreshing}
                prefix={<RefreshIcon size={16} className={isRefreshing ? 'animate-spin' : ''} />}
              >
                Osveži
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Učitavanje...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column.id}
                          className={cn(
                            "px-4 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider",
                            column.className
                          )}
                        >
                          {column.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                          <div className="flex flex-col items-center space-y-2">
                            <p className="text-xs font-medium">Nema rezultata</p>
                            {hasActiveFilters() && (
                              <Button
                                type="tertiary"
                                size="small"
                                onClick={clearAllFilters}
                              >
                                Obriši filtere
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      data.map((row, index) => (
                        <tr
                          key={row._id || index}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => row.onClick?.()}
                        >
                          {columns.map((column) => (
                            <td
                              key={column.id}
                              className={cn(
                                "px-4 py-2 text-xs",
                                column.cellClassName
                              )}
                            >
                              {column.cell ? column.cell(row) : row[column.id]}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-600">
                      Prikazano {((pagination.currentPage - 1) * pagination.limit) + 1} - {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} od {pagination.totalCount}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => onPageChange(1)}
                        disabled={!pagination.hasPreviousPage}
                      >
                        &laquo;
                      </Button>
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => onPageChange(pagination.currentPage - 1)}
                        disabled={!pagination.hasPreviousPage}
                      >
                        &lsaquo;
                      </Button>

                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter(number => {
                          return (
                            number === 1 ||
                            number === pagination.totalPages ||
                            Math.abs(number - pagination.currentPage) <= 1
                          );
                        })
                        .map(number => (
                          <button
                            key={number}
                            onClick={() => onPageChange(number)}
                            className={cn(
                              "min-w-[32px] h-8 px-3 rounded-md text-xs font-medium transition-all",
                              pagination.currentPage === number
                                ? "bg-blue-600 text-white shadow-md hover:bg-blue-700"
                                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                            )}
                          >
                            {number}
                          </button>
                        ))}

                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => onPageChange(pagination.currentPage + 1)}
                        disabled={!pagination.hasNextPage}
                      >
                        &rsaquo;
                      </Button>
                      <Button
                        type="tertiary"
                        size="small"
                        onClick={() => onPageChange(pagination.totalPages)}
                        disabled={!pagination.hasNextPage}
                      >
                        &raquo;
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FancyDataTable;
