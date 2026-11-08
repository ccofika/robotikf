import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ClipboardList, Package, Cable, HardHat, MapPin, ChevronRight } from 'lucide-react';
import { searchAPI } from '../services/api';
import { getTimRowStyle } from '../utils/tim';
import { cx } from '../security/sx/ui';
import './GlobalSearch.mx.css';

// Naslov grupe rezultata: ikonica, naziv, broj
const Group = ({ icon: Icon, label, count, children }) => (
  <div className="mx-gsearch__group">
    <div className="mx-gsearch__head">
      <Icon size={13} strokeWidth={1.9} aria-hidden="true" />
      <span>{label}</span>
      <span className="mx-gsearch__count">{count}</span>
    </div>
    {children}
  </div>
);

const GlobalSearch = ({ onFocusChange, expanded }) => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const handleNavigate = (path, opts) => {
    handleBlurClose();
    setQuery('');
    setResults(null);
    navigate(path, opts);
  };

  const totalResults = results
    ? (results.workOrders?.length || 0) +
      (results.equipment?.length || 0) +
      (results.materials?.length || 0) +
      (results.technicians?.length || 0)
    : 0;

  const hasResults = results && totalResults > 0;
  const hasQuery = query.trim().length >= 2;

  // Tonovi kao u ostatku Montaže: nalog zavrsen ok, nezavrsen warn, odlozen info, otkazan bad
  const statusLabels = {
    zavrsen: { label: 'Završen', tone: 'ok' },
    nezavrsen: { label: 'U toku', tone: 'warn' },
    odlozen: { label: 'Odložen', tone: 'info' },
    otkazan: { label: 'Otkazan', tone: 'bad' }
  };

  // Oprema: u magacinu bez tona, kod tehničara info, kod korisnika ok, neispravna bad
  const equipmentLocationTones = {
    warehouse: '',
    technician: 'info',
    user: 'ok',
    defective: 'bad'
  };

  return (
    <div ref={containerRef} className={cx('mx-gsearch', expanded && 'is-expanded')}>
      <div className="sx-search">
        <Search size={16} strokeWidth={1.9} aria-hidden="true" className="sx-search__icon" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={isFocused ? "Pretraži radne naloge, opremu, materijale, tehničare..." : "Pretraži..."}
          data-testid="global-search"
        />
        {loading && <span className="mx-gsearch__spin" aria-hidden="true" />}
      </div>

      {isOpen && hasQuery && (
        <div className="sx-popover mx-gsearch__pop" data-testid="global-search-results">

          {!hasResults && !loading && (
            <div className="sx-empty mx-gsearch__empty">
              <b>Nema rezultata za "{query}"</b>
              <span>Probajte sa drugim pojmom</span>
            </div>
          )}

          {loading && !results && (
            <div className="mx-gsearch__wait" role="status">
              <span className="mx-gsearch__spin" aria-hidden="true" />
              <span>Pretraživanje...</span>
            </div>
          )}

          {results?.workOrders?.length > 0 && (
            <Group icon={ClipboardList} label="Radni nalozi" count={results.workOrders.length}>
              {results.workOrders.map((wo) => {
                const st = statusLabels[wo.status] || { label: wo.status, tone: '' };
                return (
                  <button
                    key={wo._id}
                    type="button"
                    className="mx-gsearch__item"
                    style={getTimRowStyle(wo.tim)}
                    onClick={() => handleNavigate(`/work-orders/${wo._id}`, { state: { backgroundLocation: location } })}
                  >
                    <span className="mx-gsearch__main">
                      <span className="mx-gsearch__line">
                        <b className="sx-mono">{wo.tisJobId || wo.tisId || '-'}</b>
                        <span className={cx('sx-tag', st.tone && `is-${st.tone}`)}>{st.label}</span>
                        {wo.type && <small>{wo.type}</small>}
                      </span>
                      <span className="mx-gsearch__sub">
                        {wo.address}{wo.municipality ? `, ${wo.municipality}` : ''}
                      </span>
                    </span>
                    {wo.userName && <span className="mx-gsearch__aside">{wo.userName}</span>}
                    <ChevronRight size={14} strokeWidth={1.9} aria-hidden="true" className="mx-gsearch__chev" />
                  </button>
                );
              })}
            </Group>
          )}

          {results?.equipment?.length > 0 && (
            <Group icon={Package} label="Oprema" count={results.equipment.length}>
              {results.equipment.map((eq) => {
                const tone = equipmentLocationTones[eq.locationtype] || '';
                const handleClick = () => {
                  if (eq.locationtype === 'defective') {
                    handleNavigate(`/defective-equipment?search=${encodeURIComponent(eq.serialNumber)}`);
                  } else if (eq.locationtype === 'user') {
                    handleNavigate(`/users?search=${encodeURIComponent(eq.searchParam)}`);
                  } else {
                    handleNavigate(`/equipment?search=${encodeURIComponent(eq.serialNumber)}`);
                  }
                };
                return (
                  <button key={eq._id} type="button" className="mx-gsearch__item" onClick={handleClick}>
                    <span className="mx-gsearch__main">
                      <span className="mx-gsearch__line">
                        <b className="sx-mono">{eq.serialNumber}</b>
                        <small>{eq.category}</small>
                      </span>
                      <span className="mx-gsearch__sub">{eq.description}</span>
                    </span>
                    <span className={cx('sx-tag', tone && `is-${tone}`)}>
                      <MapPin aria-hidden="true" strokeWidth={2} />
                      {eq.locationLabel}
                    </span>
                    <ChevronRight size={14} strokeWidth={1.9} aria-hidden="true" className="mx-gsearch__chev" />
                  </button>
                );
              })}
            </Group>
          )}

          {results?.materials?.length > 0 && (
            <Group icon={Cable} label="Materijali" count={results.materials.length}>
              {results.materials.map((mat) => (
                <button key={mat._id} type="button" className="mx-gsearch__item" onClick={() => handleNavigate('/materials')}>
                  <span className="mx-gsearch__main">
                    <b className="mx-gsearch__name">{mat.type}</b>
                  </span>
                  <span className="mx-gsearch__aside is-mono">Qty: {mat.quantity}</span>
                  <ChevronRight size={14} strokeWidth={1.9} aria-hidden="true" className="mx-gsearch__chev" />
                </button>
              ))}
            </Group>
          )}

          {results?.technicians?.length > 0 && (
            <Group icon={HardHat} label="Tehničari" count={results.technicians.length}>
              {results.technicians.map((tech) => (
                <button key={tech._id} type="button" className="mx-gsearch__item" onClick={() => handleNavigate(`/technicians/${tech._id}`)}>
                  <span className="mx-gsearch__main">
                    <span className="mx-gsearch__line">
                      <b className="mx-gsearch__name">{tech.name}</b>
                      {tech.phoneNumber && <small className="sx-mono">{tech.phoneNumber}</small>}
                    </span>
                  </span>
                  <span className={cx('sx-tag', tech.isActive && 'is-ok')}>
                    {tech.deletedAt ? 'Obrisan' : tech.isActive ? 'Aktivan' : 'Neaktivan'}
                  </span>
                  <ChevronRight size={14} strokeWidth={1.9} aria-hidden="true" className="mx-gsearch__chev" />
                </button>
              ))}
            </Group>
          )}

          {hasResults && (
            <div className="mx-gsearch__foot">
              {totalResults} rezultat{totalResults === 1 ? '' : 'a'} za "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
