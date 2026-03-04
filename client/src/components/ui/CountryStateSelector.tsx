import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { Country, State } from 'country-state-city';

interface SearchableSelectProps {
  label: string;
  placeholder: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

function SearchableSelect({ label, placeholder, options, value, onChange, disabled, required }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  console.log(`[${label}] Rendering - isOpen:`, isOpen, 'value:', value, 'options count:', options.length);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        console.log(`[${label}] Click outside - closing dropdown`);
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [label]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleButtonClick = () => {
    console.log(`[${label}] Button clicked - disabled:`, disabled, 'current isOpen:', isOpen);
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue: string, optionLabel: string) => {
    console.log(`[${label}] Selected:`, optionLabel, optionValue);
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log(`[${label}] Cleared`);
    onChange('');
    setSearch('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
        {label} {required && <span className="text-[var(--text-secondary)]">*</span>}
      </label>
      <button
        type="button"
        className={`w-full px-4 py-3 bg-[var(--bg-tertiary)] border flex items-center justify-between transition-all text-left ${
          isOpen ? 'border-[var(--accent)] ring-2 ring-[var(--glow-color)]' : 'border-[var(--border-color)]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={handleButtonClick}
        disabled={disabled}
      >
        <span className={selectedOption ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
          {selectedOption?.label || placeholder}
        </span>
        <div className="flex items-center gap-2">
          {value && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              className="p-1 hover:bg-[var(--bg-tertiary)]"
            >
              <X size={14} className="text-[var(--text-muted)]" />
            </span>
          )}
          <ChevronDown size={18} className={`text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      
      {isOpen && !disabled && (
        <div 
          className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-md overflow-hidden"
          style={{ zIndex: 9999 }}
        >
          <div className="p-2 border-b border-[var(--border-color)]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="w-full pl-9 pr-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`px-4 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                    option.value === value
                      ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                      : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                  }`}
                  onClick={() => handleSelect(option.value, option.label)}
                >
                  <span className="text-sm">{option.label}</span>
                  {option.value === value && <Check size={16} />}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-[var(--text-muted)] text-center">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface CountryStateSelectorProps {
  country: string;
  state: string;
  onCountryChange: (country: string) => void;
  onStateChange: (state: string) => void;
  required?: boolean;
}

export function CountryStateSelector({ country, state, onCountryChange, onStateChange, required }: CountryStateSelectorProps) {
  const allCountries = Country.getAllCountries();
  const countryOptions = allCountries
    .map(c => ({ label: c.name, value: c.isoCode }))
    .sort((a, b) => a.label.localeCompare(b.label));

  console.log('[CountryStateSelector] country:', country, 'state:', state, 'countryOptions:', countryOptions.length);

  const statesOfCountry = country ? State.getStatesOfCountry(country) : [];
  const stateOptions = statesOfCountry
    .map(s => ({ label: s.name, value: s.isoCode }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const handleCountryChange = (newCountry: string) => {
    console.log('[CountryStateSelector] handleCountryChange:', newCountry);
    onCountryChange(newCountry);
    onStateChange('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SearchableSelect
        label="Country"
        placeholder="Select country"
        options={countryOptions}
        value={country}
        onChange={handleCountryChange}
        required={required}
      />
      <SearchableSelect
        label="State / Province"
        placeholder={country ? "Select state" : "Select country first"}
        options={stateOptions}
        value={state}
        onChange={onStateChange}
        disabled={!country}
      />
    </div>
  );
}

export function getCountryName(isoCode: string): string {
  const country = Country.getCountryByCode(isoCode);
  return country?.name || isoCode;
}

export function getStateName(countryCode: string, stateCode: string): string {
  const state = State.getStateByCodeAndCountry(stateCode, countryCode);
  return state?.name || stateCode;
}

export function formatLocation(countryCode: string, stateCode?: string): string {
  const countryName = getCountryName(countryCode);
  if (stateCode) {
    const stateName = getStateName(countryCode, stateCode);
    return `${stateName}, ${countryName}`;
  }
  return countryName;
}

export default CountryStateSelector;
