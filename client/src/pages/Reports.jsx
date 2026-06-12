import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import * as XLSX from 'xlsx'

const API = 'http://localhost:3000/api'

const btnStyle = {
  padding: '7px 18px', borderRadius: '6px', border: 'none',
  cursor: 'pointer', fontSize: '13px', fontWeight: '600',
}
const inputStyle = {
  width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb',
  borderRadius: '6px', fontSize: '13px', color: '#111827', outline: 'none',
  boxSizing: 'border-box',
}
const labelStyle = {
  display: 'block', fontSize: '12px', fontWeight: '600',
  color: '#374151', marginBottom: '4px',
}

export default function Reports() {
  const { token } = useAuth()
  const headers = { Authorization: `Bearer ${token}` }

  const [reports, setReports]           = useState([])
  const [selected, setSelected]         = useState(null)
  const [params, setParams]             = useState({})
  const [running, setRunning]           = useState(false)
  const [result, setResult]             = useState(null)  // { columns, rows, rowCount }
  const [error, setError]               = useState('')

  useEffect(() => {
    axios.get(`${API}/reports`, { headers })
      .then(r => setReports(r.data.data || []))
      .catch(err => console.error(err))
  }, [])

  // Group reports by CategoryName
  const grouped = useMemo(() => {
    const map = {}
    reports.forEach(r => {
      if (!map[r.CategoryName]) map[r.CategoryName] = []
      map[r.CategoryName].push(r)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [reports])

  const selectReport = (rpt) => {
    setSelected(rpt)
    setResult(null)
    setError('')
    // Pre-fill date params with today
    const today = new Date().toISOString().split('T')[0]
    const defaults = {}
    for (const p of (rpt.Parameters || [])) {
      defaults[p.name] = p.type === 'date' ? today : ''
    }
    setParams(defaults)
  }

  const requiredFilled = useMemo(() => {
    if (!selected) return false
    return (selected.Parameters || [])
      .filter(p => p.required)
      .every(p => params[p.name] !== '' && params[p.name] !== undefined && params[p.name] !== null)
  }, [selected, params])

  const handleRun = async () => {
    setRunning(true); setError(''); setResult(null)
    try {
      const r = await axios.post(`${API}/reports/run`, {
        reportId: selected.ID, parameters: params,
      }, { headers })
      setResult(r.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error running report')
    } finally { setRunning(false) }
  }

  const handleExport = () => {
    if (!result) return
    const ws = XLSX.utils.json_to_sheet(result.rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report')
    const date = new Date().toISOString().split('T')[0]
    const filename = `${selected.Name.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  return (
    <Layout title="Reports">
      <div style={{ display: 'flex', gap: '0', height: 'calc(100vh - 112px)', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>

        {/* LEFT PANEL — report list */}
        <div style={{ width: '280px', flexShrink: 0, borderRight: '1px solid #e5e7eb', overflowY: 'auto', background: '#f9fafb' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontSize: '13px', fontWeight: '700', color: '#111827' }}>
            All Reports
          </div>
          {grouped.length === 0 && (
            <div style={{ padding: '24px 16px', fontSize: '13px', color: '#9ca3af' }}>No reports available</div>
          )}
          {grouped.map(([cat, items]) => (
            <div key={cat}>
              <div style={{ padding: '8px 16px 4px', fontSize: '10px', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
                {cat}
              </div>
              {items.map(rpt => {
                const isActive = selected?.ID === rpt.ID
                return (
                  <div
                    key={rpt.ID}
                    onClick={() => selectReport(rpt)}
                    style={{
                      padding: '10px 16px', cursor: 'pointer',
                      background: isActive ? '#e6faf5' : 'transparent',
                      borderLeft: isActive ? '3px solid #00c896' : '3px solid transparent',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f0fdf4' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '600', color: isActive ? '#059669' : '#111827', lineHeight: 1.3 }}>
                      {rpt.Name}
                    </div>
                    {rpt.Description && (
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', lineHeight: 1.4 }}>
                        {rpt.Description}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* RIGHT PANEL — run + results */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '14px', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '28px' }}>📈</span>
              <span>Select a report to run</span>
            </div>
          ) : (
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Report header */}
              <div>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#111827' }}>{selected.Name}</div>
                {selected.Description && (
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '3px' }}>{selected.Description}</div>
                )}
              </div>

              {/* Parameters */}
              {(selected.Parameters || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px 16px' }}>
                  {(selected.Parameters || []).map(p => (
                    <div key={p.name} style={{ minWidth: '160px', flex: '1 1 160px', maxWidth: '240px' }}>
                      <label style={labelStyle}>
                        {p.label}
                        {p.required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
                      </label>
                      {p.type === 'date' ? (
                        <input
                          type="date"
                          value={params[p.name] || ''}
                          onChange={e => setParams({ ...params, [p.name]: e.target.value })}
                          style={inputStyle}
                        />
                      ) : p.type === 'select' ? (
                        <select
                          value={params[p.name] || ''}
                          onChange={e => setParams({ ...params, [p.name]: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="">— Select —</option>
                          {(p.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={params[p.name] || ''}
                          onChange={e => setParams({ ...params, [p.name]: e.target.value })}
                          placeholder={p.placeholder || ''}
                          style={inputStyle}
                        />
                      )}
                    </div>
                  ))}
                  <div style={{ flexShrink: 0 }}>
                    <button
                      onClick={handleRun}
                      disabled={!requiredFilled || running}
                      style={{ ...btnStyle, background: requiredFilled && !running ? '#00c896' : '#d1fae5', color: requiredFilled && !running ? '#fff' : '#9ca3af', cursor: requiredFilled && !running ? 'pointer' : 'not-allowed', marginTop: '20px' }}
                    >
                      {running ? 'Running…' : 'Run Report'}
                    </button>
                  </div>
                </div>
              )}

              {/* No params — just a run button */}
              {(selected.Parameters || []).length === 0 && (
                <button
                  onClick={handleRun}
                  disabled={running}
                  style={{ ...btnStyle, background: running ? '#d1fae5' : '#00c896', color: running ? '#9ca3af' : '#fff', alignSelf: 'flex-start' }}
                >
                  {running ? 'Running…' : 'Run Report'}
                </button>
              )}

              {/* Error */}
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#ef4444' }}>
                  {error}
                </div>
              )}

              {/* Results */}
              {result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                      <strong style={{ color: '#111827' }}>{result.rowCount}</strong> result{result.rowCount !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={handleExport}
                      style={{ ...btnStyle, background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0', padding: '5px 14px', fontSize: '12px' }}
                    >
                      Export to Excel
                    </button>
                  </div>

                  {result.rowCount === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                      No results for the selected parameters
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr>
                            {result.columns.map(col => (
                              <th key={col} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.rows.map((row, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                              {result.columns.map(col => (
                                <td key={col} style={{ padding: '7px 12px', borderBottom: '1px solid #f3f4f6', color: '#111827', whiteSpace: 'nowrap', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {formatCell(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

function formatCell(val) {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  // ISO date strings → local date only
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return val.split('T')[0]
  }
  return String(val)
}
