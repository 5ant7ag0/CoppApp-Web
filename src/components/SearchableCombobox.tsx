import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface SearchableComboboxProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
  error?: string;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  label,
  placeholder = "Seleccione...",
  value,
  onChange,
  options,
  disabled = false,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search query
  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  // Keep search in sync with value when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setSearch(value);
    }
  }, [value, isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        selectOption(filteredOptions[highlightedIndex]);
      } else if (!isOpen) {
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const selectOption = (opt: string) => {
    onChange(opt);
    setSearch(opt);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="space-y-1.5 w-full relative">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
        {label}
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={isOpen ? search : value}
          disabled={disabled}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              setSearch(''); // Clear search on focus to show all options
            }
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border rounded-xl pl-4 pr-10 py-3 text-xs font-semibold text-slate-700 outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
            error 
              ? 'border-rose-350 focus:border-rose-500' 
              : isOpen 
                ? 'border-[#0054A6] shadow-sm' 
                : 'border-slate-100 focus:border-blue-500'
          }`}
        />
        
        <div className="absolute right-3 top-3 flex items-center gap-1.5 text-slate-400">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange('');
                setSearch('');
              }}
              className="hover:text-rose-500 cursor-pointer p-0.5 rounded-md hover:bg-slate-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 pointer-events-none ${isOpen ? 'rotate-180 text-[#0054A6]' : ''}`} />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <span className="text-[10px] text-rose-500 font-bold block animate-fade-in">{error}</span>
      )}

      {/* Options Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-[4.5rem] max-h-60 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-y-auto z-50 p-2 space-y-1 animate-fade-in scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {filteredOptions.length === 0 ? (
            <div className="text-xs text-slate-400 py-4 text-center font-medium">No se encontraron coincidencias.</div>
          ) : (
            filteredOptions.map((opt, idx) => (
              <button
                key={opt}
                type="button"
                onClick={() => selectOption(opt)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  highlightedIndex === idx || value === opt
                    ? 'bg-blue-50 text-[#0054A6]' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
