import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDownIcon,
  CheckIcon,
  FilterIcon,
  CloseIcon,
  SearchIcon
} from '../icons/SvgIcons';
import { Button } from './button-1';
import { cn } from '../../utils/cn';

const AdvancedFilterDropdown = ({
  label,
  value,
  options = [],
  multiSelect = false,
  searchable = false,
  icon: Icon = FilterIcon,
  placeholder = 'Odaberite opciju',
  onChange,
  className = ''
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = searchable && searchTerm
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const getDisplayText = () => {
    if (multiSelect && Array.isArray(value)) {
      if (value.length === 0) return placeholder;
      if (value.length === 1) {
        const selectedOption = options.find(opt => opt.value === value[0]);
        return selectedOption?.label || value[0];
      }
      return `${value.length} odabrano`;
    } else {
      const selectedOption = options.find(opt => opt.value === value);
      return selectedOption?.label || placeholder;
    }
  };

  const handleOptionClick = (optionValue) => {
    if (multiSelect) {
      const currentValue = Array.isArray(value) ? value : [];
      const newValue = currentValue.includes(optionValue)
        ? currentValue.filter(v => v !== optionValue)
        : [...currentValue, optionValue];
      onChange(newValue);
    } else {
      onChange(optionValue);
      setShowDropdown(false);
      setSearchTerm('');
    }
  };

  const isSelected = (optionValue) => {
    if (multiSelect && Array.isArray(value)) {
      return value.includes(optionValue);
    }
    return value === optionValue;
  };

  const hasSelection = multiSelect
    ? (Array.isArray(value) && value.length > 0)
    : (value !== 'all' && value !== '' && value !== null && value !== undefined);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <Button
        type={hasSelection ? "primary" : "secondary"}
        size="medium"
        onClick={() => setShowDropdown(!showDropdown)}
        prefix={<Icon size={16} />}
        suffix={<ChevronDownIcon size={16} />}
      >
        {label}: {getDisplayText()}
        {multiSelect && Array.isArray(value) && value.length > 0 && (
          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
            {value.length}
          </span>
        )}
      </Button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999] max-h-96 overflow-hidden">
          {searchable && (
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pretraži opcije..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto p-2">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                Nema rezultata pretrage
              </div>
            ) : (
              <div className="space-y-1">
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleOptionClick(option.value)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 flex items-center justify-between",
                      isSelected(option.value)
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      {multiSelect && (
                        <input
                          type="checkbox"
                          checked={isSelected(option.value)}
                          onChange={() => {}} // Handled by button click
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <span>{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-slate-500">({option.description})</span>
                      )}
                    </div>
                    {!multiSelect && isSelected(option.value) && (
                      <CheckIcon size={16} className="text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {multiSelect && Array.isArray(value) && value.length > 0 && (
            <div className="p-3 border-t border-slate-100">
              <Button
                type="secondary"
                size="small"
                prefix={<CloseIcon size={14} />}
                onClick={() => onChange([])}
                className="w-full"
              >
                Očisti sve ({value.length})
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedFilterDropdown;