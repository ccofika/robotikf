import React, { useState, useEffect } from 'react';
import { Filter, X, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { cx, Btn, Sign } from '../../security/sx/ui';
import { Panel } from '../../security/sx/layout';
import { Field, Select, SearchField, DateField, Checkbox } from '../../security/sx/forms';
import { Loading } from '../../montaza/ui';
import './FancyDataTable.mx.css';

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
    <div className="mx-fancy">
      <div className={cx('mx-fancy__in', showFilters && 'has-side')}>
        {/* Filteri (levo; na uskom prostoru iznad tabele) */}
        {showFilters && (
          <aside className="mx-fancy__side">
            <Panel
              title="Filteri"
              actions={hasActiveFilters() && (
                <Btn size="sm" variant="ghost" onClick={clearAllFilters}>Obriši sve</Btn>
              )}
            >
              <Field label="Pretraga">
                <SearchField value={searchValue} onChange={(value) => onSearchChange(value)} placeholder="Pretraži..." />
              </Field>

              <div className="mx-fancy__fields">
                {filterFields.map((field) => (
                  <div key={field.id} className="mx-fancy__field">
                    <button
                      type="button"
                      onClick={() => toggleFilterExpand(field.id)}
                      className="mx-fancy__toggle"
                      aria-expanded={!!expandedFilters[field.id]}
                    >
                      <span>{field.label}</span>
                      {expandedFilters[field.id] ? (
                        <ChevronUp size={14} strokeWidth={1.9} aria-hidden="true" />
                      ) : (
                        <ChevronDown size={14} strokeWidth={1.9} aria-hidden="true" />
                      )}
                    </button>

                    {expandedFilters[field.id] && (
                      <div className="mx-fancy__body">
                        {field.type === 'select' && (
                          <Select
                            size="sm"
                            value={filters[field.id] || ''}
                            onChange={(e) => handleFilterChange(field.id, e.target.value)}
                          >
                            <option value="">Svi</option>
                            {field.options?.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                        )}

                        {field.type === 'date' && (
                          <DateField
                            compact
                            clearable
                            value={filters[field.id] || ''}
                            onChange={(value) => handleFilterChange(field.id, value)}
                          />
                        )}

                        {field.type === 'multiselect' && (
                          <div className="mx-fancy__checks">
                            {field.options?.map(option => {
                              const isSelected = filters[field.id]?.includes(option.value);
                              return (
                                <Checkbox
                                  key={option.value}
                                  checked={!!isSelected}
                                  onChange={(checked) => {
                                    const currentValues = filters[field.id] || [];
                                    const newValues = checked
                                      ? [...currentValues, option.value]
                                      : currentValues.filter(v => v !== option.value);
                                    handleFilterChange(field.id, newValues);
                                  }}
                                >
                                  {option.label}
                                  {option.count !== undefined && (
                                    <span className="mx-fancy__count">{option.count}</span>
                                  )}
                                </Checkbox>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>

            {/* Rezultati */}
            <div className="mx-fancy__res">
              <span className="sx-label">Rezultati</span>
              <b className="sx-num">{pagination?.totalCount || 0}</b>
              {hasActiveFilters() && <Sign tone="info">Aktivni filteri</Sign>}
            </div>
          </aside>
        )}

        {/* Sadržaj */}
        <div className="mx-fancy__main">
          {/* Traka (kartica kao ranije) */}
          <Panel className="mx-fancy__toolbar">
            <div className="mx-fancy__bar">
              <div className="mx-fancy__group">
                <Btn size="sm" icon={Filter} onClick={() => setShowFilters(!showFilters)}>
                  {showFilters ? 'Sakrij filtere' : 'Prikaži filtere'}
                </Btn>
                <span className="mx-fancy__total">
                  {pagination?.totalCount || 0} rezultata
                </span>
              </div>

              <div className="mx-fancy__group">
                {hasActiveFilters() && (
                  <Btn size="sm" variant="ghost" icon={X} onClick={clearAllFilters}>Resetuj</Btn>
                )}
                <Btn
                  size="sm"
                  icon={RefreshCw}
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className={isRefreshing ? 'mx-fancy__spin' : undefined}
                >
                  Osveži
                </Btn>
              </div>
            </div>
          </Panel>

          <Panel pad={false}>
            {loading ? (
              <Loading text="Učitavanje..." />
            ) : (
              <>
                <div className="mx-fancy__scroll">
                  <table className="sx-table">
                    <thead>
                      <tr>
                        {columns.map((column) => (
                          <th key={column.id} className={column.className}>
                            {column.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.length === 0 ? (
                        <tr>
                          <td colSpan={columns.length}>
                            <div className="sx-empty-block mx-fancy__empty">
                              <b>Nema rezultata</b>
                              {hasActiveFilters() && (
                                <Btn size="sm" onClick={clearAllFilters}>Obriši filtere</Btn>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        data.map((row, index) => (
                          <tr
                            key={row._id || index}
                            className="is-click"
                            style={{ '--i': index }}
                            tabIndex={0}
                            onClick={() => row.onClick?.()}
                            onKeyDown={(e) => { if (e.key === 'Enter') row.onClick?.(); }}
                          >
                            {columns.map((column) => (
                              <td
                                key={column.id}
                                className={column.cellClassName}
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

                {/* Strane */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="mx-pager">
                    <div className="mx-pager__text">
                      Prikazano {((pagination.currentPage - 1) * pagination.limit) + 1} - {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} od {pagination.totalCount}
                    </div>
                    <div className="mx-pager__btns">
                      <Btn size="sm" variant="ghost" onClick={() => onPageChange(1)} disabled={!pagination.hasPreviousPage}>
                        &laquo;
                      </Btn>
                      <Btn size="sm" variant="ghost" onClick={() => onPageChange(pagination.currentPage - 1)} disabled={!pagination.hasPreviousPage}>
                        &lsaquo;
                      </Btn>

                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter(number => {
                          return (
                            number === 1 ||
                            number === pagination.totalPages ||
                            Math.abs(number - pagination.currentPage) <= 1
                          );
                        })
                        .map(number => (
                          <Btn
                            key={number}
                            size="sm"
                            variant={pagination.currentPage === number ? 'primary' : 'ghost'}
                            className="mx-pager__num"
                            onClick={() => onPageChange(number)}
                          >
                            {number}
                          </Btn>
                        ))}

                      <Btn size="sm" variant="ghost" onClick={() => onPageChange(pagination.currentPage + 1)} disabled={!pagination.hasNextPage}>
                        &rsaquo;
                      </Btn>
                      <Btn size="sm" variant="ghost" onClick={() => onPageChange(pagination.totalPages)} disabled={!pagination.hasNextPage}>
                        &raquo;
                      </Btn>
                    </div>
                  </div>
                )}
              </>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default FancyDataTable;
