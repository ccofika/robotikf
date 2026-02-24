import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SearchIcon,
  ClipboardIcon,
  BoxIcon,
  ToolsIcon,
  UsersIcon,
  MapPinIcon,
  ChevronRightIcon
} from './icons/SvgIcons';
import { searchAPI } from '../services/api';

const GlobalSearch = ({ onFocusChange, expanded }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const search = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const res = await searchAPI.globalSearch(searchTerm);
      setResults(res.data);
    } catch (error) {
      console.error('Search error:', error);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocusChange?.(true);
    if (query.trim().length >= 2) setIsOpen(true);
  };

  const handleBlurClose = () => {
    setIsFocused(false);
    setIsOpen(false);
    onFocusChange?.(false);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        handleBlurClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleBlurClose();
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (path) => {
    handleBlurClose();
    setQuery('');
    setResults(null);
    navigate(path);
  };

  const totalResults = results
    ? (results.workOrders?.length || 0) +
      (results.equipment?.length || 0) +
      (results.materials?.length || 0) +
      (results.technicians?.length || 0)
    : 0;

  const hasResults = results && totalResults > 0;
  const hasQuery = query.trim().length >= 2;

  const statusLabels = {
    zavrsen: { label: 'Završen', color: 'text-emerald-700 bg-emerald-50' },
    nezavrsen: { label: 'U toku', color: 'text-blue-700 bg-blue-50' },
    odlozen: { label: 'Odložen', color: 'text-amber-700 bg-amber-50' },
    otkazan: { label: 'Otkazan', color: 'text-red-700 bg-red-50' }
  };

  const equipmentLocationColors = {
    warehouse: 'text-slate-600 bg-slate-100',
    technician: 'text-violet-700 bg-violet-50',
    user: 'text-blue-700 bg-blue-50'
  };

  return (
    <div ref={containerRef} className={`relative transition-all duration-300 ease-in-out ${expanded ? 'flex-1' : 'w-72'}`}>
      {/* Search Input */}
      <div className="relative">
        <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={isFocused ? "Pretraži radne naloge, opremu, materijale, tehničare..." : "Pretraži..."}
          className={`
            pl-9 pr-4 py-2 text-sm rounded-xl w-full
            transition-all duration-300
            ${isFocused
              ? 'bg-white border-2 border-slate-900 shadow-sm focus:outline-none'
              : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100 focus:outline-none'
            }
          `}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && hasQuery && (
        <div className={`absolute top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 max-h-[70vh] overflow-y-auto ${expanded ? 'left-0 right-0' : 'right-0 w-[420px]'}`}>

          {!hasResults && !loading && (
            <div className="px-4 py-8 text-center">
              <SearchIcon size={20} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Nema rezultata za "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">Probajte sa drugim pojmom</p>
            </div>
          )}

          {loading && !results && (
            <div className="px-4 py-6 text-center">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-slate-500">Pretraživanje...</p>
            </div>
          )}

          {/* Work Orders */}
          {results?.workOrders?.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <ClipboardIcon size={12} className="text-slate-500" />
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Radni nalozi</span>
                <span className="text-[10px] text-slate-400 ml-auto">{results.workOrders.length}</span>
              </div>
              <div className="grid grid-cols-1">
                {results.workOrders.map((wo) => {
                  const st = statusLabels[wo.status] || { label: wo.status, color: 'text-slate-600 bg-slate-100' };
                  return (
                    <div
                      key={wo._id}
                      onClick={() => handleNavigate(`/work-orders/${wo._id}`)}
                      className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-3 border-b border-slate-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-slate-900">
                            {wo.tisJobId || wo.tisId || '—'}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${st.color}`}>
                            {st.label}
                          </span>
                          {wo.type && (
                            <span className="text-[10px] text-slate-400">{wo.type}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {wo.address}{wo.municipality ? `, ${wo.municipality}` : ''}
                        </p>
                      </div>
                      {wo.userName && (
                        <span className="text-[11px] text-slate-400 flex-shrink-0 hidden sm:inline">{wo.userName}</span>
                      )}
                      <ChevronRightIcon size={14} className="text-slate-300 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Equipment */}
          {results?.equipment?.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <BoxIcon size={12} className="text-slate-500" />
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Oprema</span>
                <span className="text-[10px] text-slate-400 ml-auto">{results.equipment.length}</span>
              </div>
              {results.equipment.map((eq) => {
                const locColor = equipmentLocationColors[eq.locationtype] || 'text-slate-600 bg-slate-100';
                const handleClick = () => {
                  if (eq.locationtype === 'user') {
                    handleNavigate(`/users?search=${encodeURIComponent(eq.searchParam)}`);
                  } else {
                    handleNavigate(`/equipment?search=${encodeURIComponent(eq.serialNumber)}`);
                  }
                };
                return (
                  <div
                    key={eq._id}
                    onClick={handleClick}
                    className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-3 border-b border-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-slate-900">
                          {eq.serialNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">{eq.category}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{eq.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <MapPinIcon size={10} className="text-slate-400" />
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${locColor}`}>
                        {eq.locationLabel}
                      </span>
                    </div>
                    <ChevronRightIcon size={14} className="text-slate-300 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Materials */}
          {results?.materials?.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <ToolsIcon size={12} className="text-slate-500" />
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Materijali</span>
                <span className="text-[10px] text-slate-400 ml-auto">{results.materials.length}</span>
              </div>
              {results.materials.map((mat) => (
                <div
                  key={mat._id}
                  onClick={() => handleNavigate('/materials')}
                  className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-3 border-b border-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-slate-900">{mat.type}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex-shrink-0">Qty: {mat.quantity}</span>
                  <ChevronRightIcon size={14} className="text-slate-300 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Technicians */}
          {results?.technicians?.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <UsersIcon size={12} className="text-slate-500" />
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Tehničari</span>
                <span className="text-[10px] text-slate-400 ml-auto">{results.technicians.length}</span>
              </div>
              {results.technicians.map((tech) => (
                <div
                  key={tech._id}
                  onClick={() => handleNavigate(`/technicians/${tech._id}`)}
                  className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-3 border-b border-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-slate-900">{tech.name}</span>
                    {tech.phoneNumber && (
                      <span className="text-[11px] text-slate-400 ml-2">{tech.phoneNumber}</span>
                    )}
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${tech.isActive ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                    {tech.isActive ? 'Aktivan' : 'Neaktivan'}
                  </span>
                  <ChevronRightIcon size={14} className="text-slate-300 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {hasResults && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-center">
              <span className="text-[11px] text-slate-400">
                {totalResults} rezultat{totalResults === 1 ? '' : 'a'} za "{query}"
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
