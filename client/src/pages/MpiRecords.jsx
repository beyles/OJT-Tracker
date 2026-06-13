import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import SearchSelect from '../components/SearchSelect'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import useBreakpoint from '../hooks/useBreakpoint'

const today = new Date().toISOString().split('T')[0]
const LIMIT = 50
const EMPTY_FORM = { employeeId: null, mpiId: null, version: '', date: today }

const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb',
  borderRadius: '6px', fontSize: '14px', color: '#111827',
  outline: 'none', boxSizing: 'border-box', background: '#f9fafb'
}
const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px'
}

function formatDate(raw) {
  if (!raw) return '—'
  return new Date(raw + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

export default function MpiRecords() {
  const { user } = useAuth()
  const [records, setRecords]           = useState([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(1)
  const [searchInput, setSearchInput]   = useState('')
  const [search, setSearch]             = useState('')
  const [employees, setEmployees]       = useState([])
  const [mpis, setMpis]                 = useState([])
  const [panelOpen, setPanelOpen]       = useState(false)
  const [saving, setSaving]             = useState(false)
  const [form, setForm]                 = useState(EMPTY_FORM)

  const canCreate = ['sysadmin', 'trainingadmin'].includes(user?.role)
  const totalPages = Math.ceil(total / LIMIT) || 1
  const { isMobileOrTablet } = useBreakpoint()

  // Load reference data once
  useEffect(() => {
    axios.get('http://localhost:3000/api/employees?limit=2000&active=true')
      .then(r => setEmployees((r.data.data || []).map(e => ({ id: e.id, label: e.Name, sub: e.Number }))))
      .catch(() => {})
    axios.get('http://localhost:3000/api/mpi-records/mpis')
      .then(r => setMpis((r.data.data || []).map(m => ({
        id: m.id,
        label: `${m.Code} — ${m.Name}`,
        sub: `Rev. ${m.CurrentRevision}`,
        revision: m.CurrentRevision
      }))))
      .catch(() => {})
  }, [])

  const loadRecords = () => {
    const params = new URLSearchParams({ page, limit: LIMIT })
    if (search) params.set('search', search)
    axios.get(`http://localhost:3000/api/mpi-records?${params}`)
      .then(r => { setRecords(r.data.data || []); setTotal(r.data.total || 0) })
      .catch(() => {})
  }

  useEffect(() => { loadRecords() }, [page, search])

  // Debounce search → reset to page 1
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // Auto-fill version when MPI is selected
  const handleMpiChange = (id) => {
    const mpi = mpis.find(m => m.id === id)
    setForm(f => ({ ...f, mpiId: id, version: mpi ? mpi.revision : '' }))
  }

  const openNew  = () => { setForm(EMPTY_FORM); setPanelOpen(true) }
  const closePanel = () => { setPanelOpen(false); setForm(EMPTY_FORM) }

  const canSave = form.employeeId && form.mpiId && form.date && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await axios.post('http://localhost:3000/api/mpi-records', {
        employeeId: form.employeeId,
        mpiId:      form.mpiId,
        version:    form.version,
        date:       form.date,
        createdBy:  user.id,
      })
      closePanel()
      loadRecords()
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to save record')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this MPI record?')) return
    try {
      await axios.delete(`http://localhost:3000/api/mpi-records/${id}`)
      loadRecords()
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete')
    }
  }

  return (
    <Layout title="MPI Records" subtitle="MPI read acknowledgment log">
      <div style={{ display: 'flex', flexDirection: isMobileOrTablet ? 'column' : 'row', gap: '24px', height: isMobileOrTablet ? 'auto' : 'calc(100vh - 56px - 56px)', minHeight: 0 }}>

        {/* ── LEFT PANEL ─────────────────────────────────────── */}
        <div style={{
          width: isMobileOrTablet ? '100%' : (panelOpen ? '340px' : '100%'),
          flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: '14px', minHeight: 0,
          transition: 'width 0.2s'
        }}>

          {/* Search + New button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by employee or MPI…"
              style={{ ...inputStyle, flex: 1, fontSize: '13px' }}
            />
            {canCreate && (
              <button
                onClick={openNew}
                style={{
                  padding: '9px 16px', background: '#00c896', color: '#fff',
                  border: 'none', borderRadius: '8px', fontWeight: '700',
                  fontSize: '13px', cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: '5px'
                }}
              >
                <span style={{ fontSize: '17px', lineHeight: 1 }}>+</span> New MPI Record
              </button>
            )}
          </div>

          {/* Count */}
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '-6px' }}>
            {total > 0
              ? `${total.toLocaleString()} record${total !== 1 ? 's' : ''}${search ? ` matching "${search}"` : ''}`
              : search ? `No records matching "${search}"` : 'No MPI records logged yet.'
            }
          </div>

          {/* Record cards */}
          <div style={{ flex: isMobileOrTablet ? 'none' : 1, maxHeight: isMobileOrTablet ? '50vh' : undefined, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {records.map(rec => (
              <div key={rec.id} style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
                padding: '12px 14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{rec.EmployeeName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px',
                      background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe'
                    }}>
                      Rev. {rec.Version}
                    </span>
                    {canCreate && (
                      <button
                        onClick={() => handleDelete(rec.id)}
                        title="Delete record"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#d1d5db', fontSize: '14px', padding: '2px 4px',
                          borderRadius: '4px', lineHeight: 1
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
                      >✕</button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '3px' }}>
                  <span style={{ fontFamily: 'monospace', color: '#6b7280', marginRight: '6px' }}>{rec.MpiCode}</span>
                  {rec.MpiName}
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                  {formatDate(rec.Date)}
                  {rec.CreatedByName && <><span style={{ color: '#e5e7eb' }}> · </span>by {rec.CreatedByName}</>}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', flexShrink: 0, paddingTop: '4px'
            }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '5px 14px', border: '1px solid #e5e7eb', borderRadius: '6px',
                  background: '#fff', fontSize: '13px', fontWeight: '600',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  color: page === 1 ? '#d1d5db' : '#374151'
                }}
              >←</button>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '5px 14px', border: '1px solid #e5e7eb', borderRadius: '6px',
                  background: '#fff', fontSize: '13px', fontWeight: '600',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  color: page === totalPages ? '#d1d5db' : '#374151'
                }}
              >→</button>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL (form) ─────────────────────────────── */}
        {panelOpen && (
          <div style={{
            flex: 1, background: '#fff', border: '1px solid #e5e7eb',
            borderRadius: '10px', padding: isMobileOrTablet ? '20px 16px' : '28px', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>New MPI Record</div>
              <button
                onClick={closePanel}
                style={{
                  background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px',
                  padding: '4px 12px', fontSize: '13px', color: '#6b7280',
                  cursor: 'pointer', fontWeight: '500'
                }}
              >Cancel</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '500px' }}>

              {/* Employee */}
              <div>
                <label style={labelStyle}>Employee</label>
                <SearchSelect
                  value={form.employeeId}
                  onChange={id => setForm(f => ({ ...f, employeeId: id }))}
                  options={employees}
                  placeholder="Search employees…"
                />
              </div>

              {/* MPI */}
              <div>
                <label style={labelStyle}>MPI</label>
                <SearchSelect
                  value={form.mpiId}
                  onChange={handleMpiChange}
                  options={mpis}
                  placeholder="Search MPIs…"
                />
              </div>

              {/* Version — read-only, auto-filled */}
              <div>
                <label style={labelStyle}>
                  Version&nbsp;
                  <span style={{ fontWeight: '400', color: '#9ca3af' }}>(auto-filled from MPI)</span>
                </label>
                <input
                  readOnly
                  value={form.version ? `Rev. ${form.version}` : '—'}
                  style={{
                    ...inputStyle, width: '160px',
                    background: '#f3f4f6', color: form.version ? '#111827' : '#9ca3af',
                    cursor: 'default'
                  }}
                />
              </div>

              {/* Date */}
              <div>
                <label style={labelStyle}>Date</label>
                <input
                  type="date"
                  value={form.date}
                  max={today}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={{ ...inputStyle, width: '200px' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  style={{
                    padding: '10px 28px',
                    background: canSave ? '#00c896' : '#e5e7eb',
                    color: canSave ? '#fff' : '#9ca3af',
                    border: 'none', borderRadius: '6px',
                    fontWeight: '600', fontSize: '14px',
                    cursor: canSave ? 'pointer' : 'not-allowed',
                    transition: 'background 0.15s'
                  }}
                >
                  {saving ? 'Saving…' : 'Save Record'}
                </button>
                <button
                  onClick={closePanel}
                  style={{
                    padding: '10px 20px', background: 'none',
                    border: '1px solid #e5e7eb', borderRadius: '6px',
                    fontWeight: '600', fontSize: '14px', color: '#6b7280', cursor: 'pointer'
                  }}
                >Cancel</button>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
