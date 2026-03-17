import { useState, useEffect, useRef } from 'react';
import api from '../api';

export default function GuestSearch({ value, onChange, onSelectGuest, disabled, placeholder }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef();
  const debounceRef = useRef();

  useEffect(() => { setQuery(value || ''); }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = (term) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!term || term.length < 1) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/guests', { params: { search: term } });
        setResults(res.data.slice(0, 8));
        setShowDropdown(true);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 250);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    search(val);
  };

  const selectGuest = (guest) => {
    const name = `${guest.first_name} ${guest.last_name}`;
    setQuery(name);
    onChange(name);
    setShowDropdown(false);
    if (onSelectGuest) onSelectGuest(guest);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
        placeholder={placeholder || 'វាយឈ្មោះដើម្បីស្វែងរក...'}
        disabled={disabled}
        required
        autoComplete="off"
      />

      {showDropdown && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1px solid #ddd', borderRadius: '0 0 8px 8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)', maxHeight: 240, overflowY: 'auto'
        }}>
          <div style={{ padding: '6px 12px', fontSize: 11, color: '#999', borderBottom: '1px solid #f0f0f0' }}>
            ភ្ញៀវដែលមានស្រាប់ — ចុចដើម្បីជ្រើសរើស
          </div>
          {results.map(g => (
            <div
              key={g.id}
              onClick={() => selectGuest(g)}
              style={{
                padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{g.first_name} {g.last_name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {[g.phone, g.nationality, g.id_number].filter(Boolean).join(' · ') || 'គ្មានព័ត៌មានបន្ថែម'}
                </div>
              </div>
              <span style={{ fontSize: 11, color: '#4fc3f7' }}>ជ្រើសរើស</span>
            </div>
          ))}
        </div>
      )}

      {showDropdown && results.length === 0 && query.length >= 2 && !loading && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1px solid #ddd', borderRadius: '0 0 8px 8px',
          padding: '12px', fontSize: 13, color: '#999', textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
        }}>
          រកមិនឃើញភ្ញៀវ — នឹងបង្កើតថ្មី
        </div>
      )}
    </div>
  );
}
