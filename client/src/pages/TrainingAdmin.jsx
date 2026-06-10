import { useState, useEffect, useRef, useCallback } from 'react'
import Layout from '../components/Layout'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import SearchSelect from '../components/SearchSelect'

const API = 'http://localhost:3000/api/training'
const LIMIT = 50

export default function TrainingAdmin() {
  const { token } = useAuth()
  const [tab, setTab] = useState('mpis')

  return (
    <Layout title="Training Admin" subtitle="Training Configuration">
      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '24px', gap: '4px' }}>
        {[
          { key: 'mpis', label: 'Documents (MPIs)' },
          { key: 'lines', label: 'Production Lines' },
          { key: 'workstations', label: 'Workstations' },
          { key: 'linebuilder', label: 'Line Builder' },
          { key: 'competences', label: 'Competences' },
        ].map(t => (
          <div key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            color: tab === t.key ? '#00c896' : '#6b7280',
            borderBottom: tab === t.key ? '2px solid #00c896' : '2px solid transparent',
            marginBottom: '-2px', transition: 'all 0.15s'
          }}>{t.label}</div>
        ))}
      </div>
      {tab === 'mpis' && <MpisTab token={token} />}
      {tab === 'lines' && <LinesTab token={token} />}
      {tab === 'workstations' && <WorkstationsTab token={token} />}
      {tab === 'linebuilder' && <LineBuilderTab token={token} />}
      {tab === 'competences' && <CompetencesTab token={token} />}
    </Layout>
  )
}

// ── SHARED STYLES ──────────────────────────────────────────
const thStyle = { textAlign: 'left', padding: '10px 20px', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap', background: '#fff' }
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#f9fafb' }
const btnPrimary = { padding: '8px 16px', background: '#00c896', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }
const btnGhost = { padding: '8px 14px', background: '#f3f4f6', border: 'none', borderRadius: '6px', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }

function StatusBadge({ value }) {
  return <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: value ? '#f0fdf9' : '#fef2f2', color: value ? '#00c896' : '#ef4444' }}>{value ? 'Active' : 'Inactive'}</span>
}

function Panel({ title, onClose, onSave, saving, error, children }) {
  return (
    <div style={{ width: '340px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', flex: 1 }}>{title}</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#9ca3af', cursor: 'pointer' }}>×</button>
      </div>
      <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>{children}</div>
      {error && <div style={{ margin: '0 20px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 12px', color: '#ef4444', fontSize: '13px' }}>{error}</div>}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
        <button onClick={onSave} disabled={saving} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>{saving ? 'Saving...' : 'Save'}</button>
        <button onClick={onClose} style={btnGhost}>Cancel</button>
      </div>
    </div>
  )
}

// ── INFINITE SCROLL HOOK ───────────────────────────────────
function useInfiniteList(fetchFn, search) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const tableRef = useRef()
  const searchTimer = useRef()

  const load = useCallback(async (currentOffset, currentSearch, reset = false) => {
    if (loading && !reset) return
    setLoading(true)
    try {
      const { data, total: t } = await fetchFn(LIMIT, currentOffset, currentSearch)
      setTotal(t)
      setItems(prev => reset ? data : [...prev, ...data])
      setOffset(currentOffset + data.length)
      setHasMore(currentOffset + data.length < t)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  const reload = useCallback((s) => {
    setItems([]); setOffset(0); setHasMore(true)
    load(0, s, true)
  }, [load])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => reload(search), 300)
  }, [search])

  const handleScroll = useCallback(() => {
    if (!tableRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = tableRef.current
    if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !loading) {
      load(offset, search)
    }
  }, [offset, hasMore, loading, search])

  useEffect(() => {
    const el = tableRef.current
    if (el) el.addEventListener('scroll', handleScroll)
    return () => { if (el) el.removeEventListener('scroll', handleScroll) }
  }, [handleScroll])

  return { items, total, loading, hasMore, tableRef, reload }
}

// ── MPIs TAB ──────────────────────────────────────────────
function MpisTab({ token }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState({ Code: '', Name: '', URL: '', Status: true, VersioningType: 'Numeric', FirstVersion: '1' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const [requiresRecert, setRequiresRecert] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileInfo, setFileInfo] = useState(null)
  const fileRef = useRef()

  const fetchMpis = useCallback(async (limit, offset, search) => {
    const res = await axios.get(`${API}/mpis`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit, offset, search }
    })
    return { data: res.data.data, total: res.data.total }
  }, [token])

  const { items: mpis, total, loading, hasMore, tableRef, reload } = useInfiniteList(fetchMpis, search)

  const fetchFileInfo = async (id) => {
    try {
      const res = await axios.get(`${API}/mpis/${id}/file`, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' })
      setFileInfo({ exists: true, size: res.data.size })
    } catch { setFileInfo({ exists: false }) }
  }

  const selectMpi = (m) => {
    setSelected(m); setIsNew(false)
    setForm({ Code: m.Code, Name: m.Name, URL: m.URL || '', Status: m.Status, VersioningType: m.VersioningType || 'Numeric', FirstVersion: m.FirstVersion || '1' })
    setError(''); fetchFileInfo(m.id)
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (isNew) {
        await axios.post(`${API}/mpis`, form, { headers: { Authorization: `Bearer ${token}` } })
      } else {
        await axios.put(`${API}/mpis/${selected.id}`, form, { headers: { Authorization: `Bearer ${token}` } })
      }
      reload(search); setSelected(null); setIsNew(false)
    } catch (err) { setError(err.response?.data?.error || 'Error saving') }
    finally { setSaving(false) }
  }

  const handleAddRevision = () => { setRequiresRecert(false); setShowRevisionModal(true) }

  const handleRevisionConfirm = async () => {
    if (requiresRecert) { setShowRevisionModal(false); setShowConfirm(true); return }
    await submitRevision()
  }

  const submitRevision = async () => {
    try {
      const res = await axios.post(`${API}/mpis/${selected.id}/revision`,
        { requiresRecertification: requiresRecert },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setShowConfirm(false); setShowRevisionModal(false)
      reload(search)
      setSelected(prev => ({ ...prev, Revision: res.data.revision }))
    } catch { setError('Error adding revision') }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('File exceeds 10MB limit'); return }
    setUploading(true)
    const formData = new FormData(); formData.append('file', file)
    try {
      await axios.post(`${API}/mpis/${selected.id}/file`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      })
      await fetchFileInfo(selected.id)
    } catch { setError('Error uploading file') }
    finally { setUploading(false); fileRef.current.value = '' }
  }

  const handleReadMpi = () => {
    if (fileInfo?.exists) window.open(`${API}/mpis/${selected.id}/file`, '_blank')
    else if (form.URL) window.open(form.URL, '_blank')
  }

  const canRead = fileInfo?.exists || form.URL
  const panelOpen = selected || isNew

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 200px)' }}>
      <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', flex: 1 }}>
              Documents (MPIs) <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '400' }}>({total} total)</span>
            </div>
            <button onClick={() => { setIsNew(true); setSelected(null); setForm({ Code: '', Name: '', URL: '', Status: true, VersioningType: 'Numeric', FirstVersion: '1' }); setError(''); setFileInfo(null) }} style={btnPrimary}>+ Add MPI</button>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by code or name..."
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#f9fafb' }} />
        </div>
        <div ref={tableRef} style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>{['Code', 'Name', 'Revision', 'Versioning', 'Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {mpis.map(m => {
                const active = selected?.id === m.id
                return (
                  <tr key={m.id} onClick={() => selectMpi(m)} style={{ cursor: 'pointer', background: active ? '#f0fdf9' : 'transparent' }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? '#f0fdf9' : 'transparent' }}>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', fontFamily: 'monospace', fontWeight: '600', color: '#111827' }}>{m.Code}</td>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', color: '#111827' }}>{m.Name}</td>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', color: '#6b7280', fontFamily: 'monospace' }}>{m.Revision}</td>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{m.VersioningType}</td>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6' }}><StatusBadge value={m.Status} /></td>
                  </tr>
                )
              })}
              {loading && <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>Loading...</td></tr>}
              {!hasMore && mpis.length > 0 && <tr><td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: '#d1d5db', fontSize: '12px' }}>— {mpis.length} of {total} loaded —</td></tr>}
              {mpis.length === 0 && !loading && <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>No MPIs found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {panelOpen && (
        <Panel title={isNew ? 'New MPI' : `Edit — ${selected?.Code}`} onClose={() => { setSelected(null); setIsNew(false) }} onSave={handleSave} saving={saving} error={error}>
          {[
            { label: 'Code', key: 'Code', placeholder: 'MPI-001' },
            { label: 'Name', key: 'Name', placeholder: 'Assembly Process' },
            { label: 'External URL', key: 'URL', placeholder: 'https://...' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>{f.label}</label>
              <input value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} style={inputStyle} />
            </div>
          ))}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Versioning Type</label>
            <select value={form.VersioningType} onChange={e => setForm({ ...form, VersioningType: e.target.value, FirstVersion: e.target.value === 'Numeric' ? '1' : 'A' })} style={inputStyle}>
              <option value="Numeric">Numeric (1, 2, 3...)</option>
              <option value="Alphabetical">Alphabetical (A, B, C...)</option>
            </select>
          </div>
          {isNew && (
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>First Version</label>
              {form.VersioningType === 'Numeric' ? (
                <select value={form.FirstVersion} onChange={e => setForm({ ...form, FirstVersion: e.target.value })} style={inputStyle}>
                  <option value="0">0</option>
                  <option value="1">1</option>
                </select>
              ) : (
                <input value={form.FirstVersion} onChange={e => setForm({ ...form, FirstVersion: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} placeholder="A" maxLength={2} style={inputStyle} />
              )}
            </div>
          )}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Status</label>
            <select value={form.Status} onChange={e => setForm({ ...form, Status: e.target.value === 'true' })} style={inputStyle}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          {!isNew && (
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px', marginTop: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '10px' }}>
                Current Revision: <span style={{ color: '#111827', fontFamily: 'monospace' }}>{selected?.Revision}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                {canRead && (
                  <button onClick={handleReadMpi} style={{ ...btnPrimary, background: '#3b82f6', width: '100%', justifyContent: 'center' }}>📄 Read MPI</button>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => fileRef.current.click()} disabled={uploading} style={{ ...btnGhost, flex: 1, fontSize: '12px' }}>
                    {uploading ? 'Uploading...' : fileInfo?.exists ? '↑ Replace File' : '↑ Upload PDF'}
                  </button>
                  <button onClick={handleAddRevision} style={{ ...btnPrimary, flex: 1, fontSize: '12px', background: '#f59e0b' }}>+ New Revision</button>
                </div>
                <input ref={fileRef} type="file" accept=".pdf" onChange={handleUpload} style={{ display: 'none' }} />
                {fileInfo?.exists && <div style={{ fontSize: '11px', color: '#00c896' }}>✓ File attached ({Math.round(fileInfo.size / 1024)}KB)</div>}
              </div>
            </div>
          )}
        </Panel>
      )}

      {showRevisionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '10px', width: '400px', padding: '28px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>Add New Revision</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Current revision: <strong>{selected?.Revision}</strong></div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Does this revision require recertification?</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setRequiresRecert(false)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `2px solid ${!requiresRecert ? '#00c896' : '#e5e7eb'}`, background: !requiresRecert ? '#f0fdf9' : '#fff', color: !requiresRecert ? '#00c896' : '#374151', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>No</button>
                <button onClick={() => setRequiresRecert(true)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `2px solid ${requiresRecert ? '#ef4444' : '#e5e7eb'}`, background: requiresRecert ? '#fef2f2' : '#fff', color: requiresRecert ? '#ef4444' : '#374151', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Yes</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleRevisionConfirm} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>Continue</button>
              <button onClick={() => setShowRevisionModal(false)} style={btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '10px', width: '420px', padding: '28px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#ef4444', marginBottom: '8px' }}>⚠ Warning</div>
            <div style={{ fontSize: '13px', color: '#374151', marginBottom: '20px', lineHeight: '1.6' }}>
              All certifications associated with this MPI will be invalidated when employees are assigned to workstations that use this document. Are you sure?
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={submitRevision} style={{ ...btnPrimary, flex: 1, background: '#ef4444', justifyContent: 'center' }}>Confirm</button>
              <button onClick={() => setShowConfirm(false)} style={btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── PRODUCTION LINES TAB ──────────────────────────────────
function LinesTab({ token }) {
  const [search, setSearch] = useState('')
  const [buildings, setBuildings] = useState([])
  const [selected, setSelected] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState({ Name: '', Building: '', Status: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchLines = useCallback(async (limit, offset, search) => {
    const res = await axios.get(`${API}/lines`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit, offset, search }
    })
    return { data: res.data.data, total: res.data.total }
  }, [token])

  const { items: lines, total, loading, hasMore, tableRef, reload } = useInfiniteList(fetchLines, search)

  useEffect(() => {
    axios.get('http://localhost:3000/api/buildings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setBuildings(r.data)).catch(console.error)
  }, [token])

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (isNew) {
        await axios.post(`${API}/lines`, form, { headers: { Authorization: `Bearer ${token}` } })
      } else {
        await axios.put(`${API}/lines/${selected.id}`, form, { headers: { Authorization: `Bearer ${token}` } })
      }
      reload(search); setSelected(null); setIsNew(false)
    } catch (err) { setError(err.response?.data?.error || 'Error saving') }
    finally { setSaving(false) }
  }

  const panelOpen = selected || isNew

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 200px)' }}>
      <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', flex: 1 }}>
              Production Lines <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '400' }}>({total} total)</span>
            </div>
            <button onClick={() => { setIsNew(true); setSelected(null); setForm({ Name: '', Building: '', Status: true }); setError('') }} style={btnPrimary}>+ Add Line</button>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by line name or building..."
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#f9fafb' }} />
        </div>
        <div ref={tableRef} style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>{['Line Name', 'Building', 'Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {lines.map(l => {
                const active = selected?.id === l.id
                return (
                  <tr key={l.id} onClick={() => { setSelected(l); setIsNew(false); setForm({ Name: l.Name, Building: l.Building, Status: l.Status }); setError('') }}
                    style={{ cursor: 'pointer', background: active ? '#f0fdf9' : 'transparent' }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? '#f0fdf9' : 'transparent' }}>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: '500', color: '#111827' }}>{l.Name}</td>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{l.BuildingName}</td>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6' }}><StatusBadge value={l.Status} /></td>
                  </tr>
                )
              })}
              {loading && <tr><td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>Loading...</td></tr>}
              {!hasMore && lines.length > 0 && <tr><td colSpan={3} style={{ padding: '12px', textAlign: 'center', color: '#d1d5db', fontSize: '12px' }}>— {lines.length} of {total} loaded —</td></tr>}
              {lines.length === 0 && !loading && <tr><td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>No production lines found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {panelOpen && (
        <Panel title={isNew ? 'New Production Line' : 'Edit Line'} onClose={() => { setSelected(null); setIsNew(false) }} onSave={handleSave} saving={saving} error={error}>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Line Name</label>
            <input value={form.Name || ''} onChange={e => setForm({ ...form, Name: e.target.value })} placeholder="e.g. Line 1 — Medical" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Building</label>
            <SearchSelect
              value={form.Building || null}
              onChange={(id) => setForm({ ...form, Building: id })}
              options={buildings.map(b => ({ id: b.id, label: b.Name }))}
              placeholder="Search buildings..."
              clearable={false}
            />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Status</label>
            <select value={form.Status} onChange={e => setForm({ ...form, Status: e.target.value === 'true' })} style={inputStyle}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </Panel>
      )}
    </div>
  )
}

// ── WORKSTATIONS TAB ──────────────────────────────────────
function WorkstationsTab({ token }) {
  const [search, setSearch] = useState('')
  const [competences, setCompetences] = useState([])
  const [mpis, setMpis] = useState([])
  const [selected, setSelected] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState({ Name: '', Status: true, TrainingHours: 0, FlightHours: 0, WCI_Level: 1, Competence: '', MpiID: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchWorkstations = useCallback(async (limit, offset, search) => {
    const res = await axios.get(`${API}/workstations`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit, offset, search }
    })
    return { data: res.data.data, total: res.data.total }
  }, [token])

  const { items: workstations, total, loading, hasMore, tableRef, reload } = useInfiniteList(fetchWorkstations, search)

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/competences`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API}/mpis/all`, { headers: { Authorization: `Bearer ${token}` } })
    ]).then(([comp, mpi]) => {
      setCompetences(comp.data.data || comp.data)
      setMpis(mpi.data.data || mpi.data)
    }).catch(console.error)
  }, [token])

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (isNew) {
        await axios.post(`${API}/workstations`, form, { headers: { Authorization: `Bearer ${token}` } })
      } else {
        await axios.put(`${API}/workstations/${selected.id}`, form, { headers: { Authorization: `Bearer ${token}` } })
      }
      reload(search); setSelected(null); setIsNew(false)
    } catch (err) { setError(err.response?.data?.error || 'Error saving') }
    finally { setSaving(false) }
  }

  const wciColors = { 1: '#00c896', 2: '#3b82f6', 3: '#f59e0b', 4: '#ef4444' }
  const panelOpen = selected || isNew

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 200px)' }}>
      <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', flex: 1 }}>
              Workstations <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '400' }}>({total} total)</span>
            </div>
            <button onClick={() => { setIsNew(true); setSelected(null); setForm({ Name: '', Status: true, TrainingHours: 0, FlightHours: 0, WCI_Level: 1, Competence: '', MpiID: '' }); setError('') }} style={btnPrimary}>+ Add Workstation</button>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workstations..."
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#f9fafb' }} />
        </div>
        <div ref={tableRef} style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>{['Name', 'WCI Level', 'Training Hrs', 'Competence', 'MPI', 'Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {workstations.map(w => {
                const active = selected?.id === w.id
                return (
                  <tr key={w.id} onClick={() => { setSelected(w); setIsNew(false); setForm({ Name: w.Name, Status: w.Status, TrainingHours: w.TrainingHours, FlightHours: w.FlightHours, WCI_Level: w.WCI_Level, Competence: w.Competence || '', MpiID: w.MpiID || '' }); setError('') }}
                    style={{ cursor: 'pointer', background: active ? '#f0fdf9' : 'transparent' }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? '#f0fdf9' : 'transparent' }}>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: '500', color: '#111827' }}>{w.Name}</td>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: `${wciColors[w.WCI_Level]}20`, color: wciColors[w.WCI_Level] }}>L{w.WCI_Level}</span>
                    </td>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', color: '#6b7280', fontFamily: 'monospace' }}>{w.TrainingHours}h</td>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{w.CompetenceName || '—'}</td>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', color: '#6b7280', fontFamily: 'monospace', fontSize: '12px' }}>{w.MpiCode || '—'}</td>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6' }}><StatusBadge value={w.Status} /></td>
                  </tr>
                )
              })}
              {loading && <tr><td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>Loading...</td></tr>}
              {!hasMore && workstations.length > 0 && <tr><td colSpan={6} style={{ padding: '12px', textAlign: 'center', color: '#d1d5db', fontSize: '12px' }}>— {workstations.length} of {total} loaded —</td></tr>}
              {workstations.length === 0 && !loading && <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>No workstations found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {panelOpen && (
        <Panel title={isNew ? 'New Workstation' : 'Edit Workstation'} onClose={() => { setSelected(null); setIsNew(false) }} onSave={handleSave} saving={saving} error={error}>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Name</label>
            <input value={form.Name || ''} onChange={e => setForm({ ...form, Name: e.target.value })} placeholder="e.g. Assembly WS-01" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>WCI Level</label>
            <select value={form.WCI_Level} onChange={e => setForm({ ...form, WCI_Level: parseInt(e.target.value) })} style={inputStyle}>
              <option value={1}>Level 1 — Basic</option>
              <option value={2}>Level 2 — Intermediate</option>
              <option value={3}>Level 3 — Advanced</option>
              <option value={4}>Level 4 — Expert</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Training Hours</label>
              <input type="number" value={form.TrainingHours || 0} onChange={e => setForm({ ...form, TrainingHours: parseInt(e.target.value) })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Flight Hours</label>
              <input type="number" value={form.FlightHours || 0} onChange={e => setForm({ ...form, FlightHours: parseInt(e.target.value) })} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Competence</label>
            <SearchSelect
              value={form.Competence || null}
              onChange={(id) => setForm({ ...form, Competence: id })}
              options={competences.map(c => ({ id: c.id, label: c.Name }))}
              placeholder="Search competences..."
            />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Associated MPI</label>
            <SearchSelect
              value={form.MpiID || null}
              onChange={(id) => setForm({ ...form, MpiID: id })}
              options={mpis.map(m => ({ id: m.id, label: m.Code, sub: m.Name }))}
              placeholder="Search by code or name..."
            />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Status</label>
            <select value={form.Status} onChange={e => setForm({ ...form, Status: e.target.value === 'true' })} style={inputStyle}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </Panel>
      )}
    </div>
  )
}

// ── LINE BUILDER TAB ──────────────────────────────────────
function LineBuilderTab({ token }) {
  const [lines, setLines] = useState([])
  const [selectedLine, setSelectedLine] = useState(null)
  const [available, setAvailable] = useState([])
  const [assigned, setAssigned] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [wsFilter, setWsFilter] = useState('')
  const [sortField, setSortField] = useState('Name')
  const [sortDir, setSortDir] = useState('asc')

  useEffect(() => {
    axios.get(`${API}/lines/all`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setLines(r.data.data || r.data)).catch(console.error)
  }, [token])

  const fetchLineBuilder = async (lineId) => {
    try {
      const res = await axios.get(`${API}/linebuilder/${lineId}`, { headers: { Authorization: `Bearer ${token}` } })
      const assignedIds = res.data.assigned.map(a => a.workstationid)
      setAssigned(res.data.assigned.map(a => ({ id: a.workstationid, Name: a.WorkstationName, WCI_Level: a.WCI_Level, order: a.Order })))
      setAvailable(res.data.all.filter(w => !assignedIds.includes(w.id)))
    } catch (err) { console.error(err) }
  }

  const handleLineChange = (id) => {
    setSelectedLine(id)
    if (id) fetchLineBuilder(id)
    else { setAvailable([]); setAssigned([]) }
  }

  const addWorkstation = (ws) => {
    setAvailable(prev => prev.filter(w => w.id !== ws.id))
    setAssigned(prev => [...prev, { ...ws, order: prev.length + 1 }])
  }

  const removeWorkstation = (ws) => {
    setAssigned(prev => prev.filter(w => w.id !== ws.id).map((w, i) => ({ ...w, order: i + 1 })))
    setAvailable(prev => [...prev, ws].sort((a, b) => a.Name.localeCompare(b.Name)))
  }

  const moveUp = (index) => {
    if (index === 0) return
    const n = [...assigned]
    ;[n[index - 1], n[index]] = [n[index], n[index - 1]]
    setAssigned(n.map((w, i) => ({ ...w, order: i + 1 })))
  }

  const moveDown = (index) => {
    if (index === assigned.length - 1) return
    const n = [...assigned]
    ;[n[index], n[index + 1]] = [n[index + 1], n[index]]
    setAssigned(n.map((w, i) => ({ ...w, order: i + 1 })))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await axios.post(`${API}/linebuilder/${selectedLine}`,
        { workstations: assigned.map(w => ({ workstationId: w.id, order: w.order })) },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const filteredAvailable = available
    .filter(ws => ws.Name?.toLowerCase().includes(wsFilter.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortField]; const bv = b[sortField]
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const wciColors = { 1: '#00c896', 2: '#3b82f6', 3: '#f59e0b', 4: '#ef4444' }

  return (
    <div style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ minWidth: '320px' }}>
          <SearchSelect
            value={selectedLine}
            onChange={(id) => handleLineChange(id)}
            options={lines.map(l => ({ id: l.id, label: l.Name, sub: l.BuildingName }))}
            placeholder="Search production lines..."
            clearable={false}
          />
        </div>
        {selectedLine && (
          <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, background: saved ? '#00a578' : '#00c896' }}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Line'}
          </button>
        )}
      </div>

      {selectedLine && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                Available Workstations <span style={{ color: '#9ca3af', fontWeight: '400' }}>({filteredAvailable.length})</span>
              </div>
              <input value={wsFilter} onChange={e => setWsFilter(e.target.value)} placeholder="Filter workstations..."
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#f9fafb' }} />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ position: 'sticky', top: 0 }}>
                  <tr>
                    <th onClick={() => toggleSort('Name')} style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}>Name {sortField === 'Name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => toggleSort('WCI_Level')} style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}>WCI {sortField === 'WCI_Level' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th style={{ ...thStyle, width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAvailable.map(ws => (
                    <tr key={ws.id} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '9px 16px', borderBottom: '1px solid #f3f4f6', color: '#111827' }}>{ws.Name}</td>
                      <td style={{ padding: '9px 16px', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '10px', background: `${wciColors[ws.WCI_Level]}20`, color: wciColors[ws.WCI_Level] }}>L{ws.WCI_Level}</span>
                      </td>
                      <td style={{ padding: '9px 16px', borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>
                        <button onClick={() => addWorkstation(ws)} style={{ padding: '4px 10px', background: '#f0fdf9', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#00c896', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>+</button>
                      </td>
                    </tr>
                  ))}
                  {filteredAvailable.length === 0 && <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>{available.length === 0 ? 'All workstations assigned' : 'No workstations match filter'}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', fontSize: '13px', fontWeight: '600', color: '#111827' }}>
              Line Order <span style={{ color: '#9ca3af', fontWeight: '400' }}>({assigned.length} stations)</span>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {assigned.map((ws, index) => (
                <div key={ws.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#374151', flexShrink: 0 }}>{index + 1}</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '10px', background: `${wciColors[ws.WCI_Level]}20`, color: wciColors[ws.WCI_Level] }}>L{ws.WCI_Level}</span>
                  <span style={{ flex: 1, fontSize: '13px', color: '#111827' }}>{ws.Name}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => moveUp(index)} disabled={index === 0} style={{ padding: '3px 7px', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: index === 0 ? 'not-allowed' : 'pointer', color: index === 0 ? '#d1d5db' : '#374151', fontSize: '12px' }}>↑</button>
                    <button onClick={() => moveDown(index)} disabled={index === assigned.length - 1} style={{ padding: '3px 7px', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: index === assigned.length - 1 ? 'not-allowed' : 'pointer', color: index === assigned.length - 1 ? '#d1d5db' : '#374151', fontSize: '12px' }}>↓</button>
                    <button onClick={() => removeWorkstation(ws)} style={{ padding: '3px 7px', background: '#fef2f2', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#ef4444', fontSize: '12px' }}>×</button>
                  </div>
                </div>
              ))}
              {assigned.length === 0 && <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Add workstations from the left</div>}
            </div>
          </div>
        </div>
      )}

      {!selectedLine && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '14px' }}>
          Select a production line to start building
        </div>
      )}
    </div>
  )
}

// ── COMPETENCES TAB ──────────────────────────────────────
function CompetencesTab({ token }) {
  const [competences, setCompetences] = useState([])
  const [selected, setSelected] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState({ Name: '', Order: 0, Status: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchCompetences() }, [])

  const fetchCompetences = async () => {
    try {
      const res = await axios.get(`${API}/competences`, { headers: { Authorization: `Bearer ${token}` } })
      setCompetences(res.data.data || res.data)
    } catch (err) { console.error(err) }
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (isNew) {
        await axios.post(`${API}/competences`, form, { headers: { Authorization: `Bearer ${token}` } })
      } else {
        await axios.put(`${API}/competences/${selected.id}`, form, { headers: { Authorization: `Bearer ${token}` } })
      }
      await fetchCompetences(); setSelected(null); setIsNew(false)
    } catch (err) { setError(err.response?.data?.error || 'Error saving') }
    finally { setSaving(false) }
  }

  const panelOpen = selected || isNew

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 200px)' }}>
      <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', flex: 1 }}>Competences</div>
          <button onClick={() => { setIsNew(true); setSelected(null); setForm({ Name: '', Order: competences.length + 1, Status: true }); setError('') }} style={btnPrimary}>+ Add</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr>{['Order', 'Name', 'Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {competences.map(c => {
                const active = selected?.id === c.id
                return (
                  <tr key={c.id} onClick={() => { setSelected(c); setIsNew(false); setForm({ Name: c.Name, Order: c.Order, Status: c.Status }); setError('') }}
                    style={{ cursor: 'pointer', background: active ? '#f0fdf9' : 'transparent' }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', color: '#6b7280', fontFamily: 'monospace' }}>{c.Order}</td>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: '500', color: '#111827' }}>{c.Name}</td>
                    <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6' }}><StatusBadge value={c.Status} /></td>
                  </tr>
                )
              })}
              {competences.length === 0 && <tr><td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>No competences yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {panelOpen && (
        <Panel title={isNew ? 'New Competence' : 'Edit Competence'} onClose={() => { setSelected(null); setIsNew(false) }} onSave={handleSave} saving={saving} error={error}>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Name</label>
            <input value={form.Name || ''} onChange={e => setForm({ ...form, Name: e.target.value })} placeholder="e.g. SMT Soldering" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Order</label>
            <input type="number" value={form.Order || 0} onChange={e => setForm({ ...form, Order: parseInt(e.target.value) })} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Status</label>
            <select value={form.Status} onChange={e => setForm({ ...form, Status: e.target.value === 'true' })} style={inputStyle}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </Panel>
      )}
    </div>
  )
}
