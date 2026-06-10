import { useState, useEffect, useRef } from 'react'

export default function SearchSelect({
  value,          // current selected id
  onChange,       // (id, item) => void
  options,        // [{id, label, sub}]
  placeholder,    // "Search MPIs..."
  clearable = true
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const ref = useRef()

  const selected = options.find(o => o.id === value)

  const filtered = options.filter(o =>
    o.label?.toLowerCase().includes(query.toLowerCase()) ||
    o.sub?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 50)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (item) => {
    onChange(item.id, item)
    setQuery('')
    setOpen(false)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange(null, null)
    setQuery('')
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Input */}
      <div
        onClick={() => { setOpen(true); setFocused(true) }}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px',
          border: `1px solid ${focused ? '#00c896' : '#e5e7eb'}`,
          borderRadius: '6px',
          background: '#f9fafb',
          cursor: 'text',
          minHeight: '38px'
        }}
      >
        {selected && !open ? (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', color: '#111827', fontWeight: '500' }}>{selected.label}</div>
              {selected.sub && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{selected.sub}</div>}
            </div>
            {clearable && (
              <span onClick={handleClear} style={{ color: '#9ca3af', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</span>
            )}
          </>
        ) : (
          <input
            autoFocus={open}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => { setOpen(true); setFocused(true) }}
            onBlur={() => setFocused(false)}
            placeholder={selected ? selected.label : placeholder || 'Search...'}
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent', fontSize: '13px', color: '#111827'
            }}
          />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          maxHeight: '240px', overflowY: 'auto',
          marginTop: '2px'
        }}>
          {/* None option */}
          {clearable && (
            <div
              onClick={() => { onChange(null, null); setQuery(''); setOpen(false) }}
              style={{ padding: '10px 14px', fontSize: '13px', color: '#9ca3af', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              — None
            </div>
          )}

          {filtered.map(item => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                background: value === item.id ? '#f0fdf9' : 'transparent',
                borderBottom: '1px solid #f3f4f6'
              }}
              onMouseEnter={e => { if (value !== item.id) e.currentTarget.style.background = '#f9fafb' }}
              onMouseLeave={e => { if (value !== item.id) e.currentTarget.style.background = value === item.id ? '#f0fdf9' : 'transparent' }}
            >
              <div style={{ fontSize: '13px', color: '#111827', fontWeight: value === item.id ? '600' : '400' }}>{item.label}</div>
              {item.sub && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px' }}>{item.sub}</div>}
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
              No results for "{query}"
            </div>
          )}

          {options.length > 50 && filtered.length === 50 && (
            <div style={{ padding: '8px 14px', fontSize: '11px', color: '#9ca3af', textAlign: 'center', borderTop: '1px solid #f3f4f6' }}>
              Showing first 50 — type to filter
            </div>
          )}
        </div>
      )}
    </div>
  )
}