import { useState, useEffect, useRef, useCallback } from 'react'
import Layout from '../components/Layout'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const emptyEmp = { Number: '', Name: '', Department: '', Shift: '', StartDate: '', Status: true }
const LIMIT = 50

export default function Employees() {
  const { token } = useAuth()
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState(emptyEmp)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState(null)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const fileRef = useRef()
  const photoRef = useRef()
  const tableRef = useRef()
  const searchTimer = useRef()

  useEffect(() => {
    setEmployees([])
    setOffset(0)
    setHasMore(true)
    fetchEmployees(0, search, true)
  }, [search, filterStatus])

  const fetchEmployees = async (currentOffset, currentSearch, reset = false) => {
    if (loadingMore && !reset) return
    setLoadingMore(true)
    try {
      const res = await axios.get(`${API_BASE}/api/employees`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: LIMIT, offset: currentOffset, search: currentSearch }
      })
      const newData = res.data.data
      setTotal(res.data.total)
      setEmployees(prev => reset ? newData : [...prev, ...newData])
      setOffset(currentOffset + newData.length)
      setHasMore(currentOffset + newData.length < res.data.total)
    } catch (err) { console.error(err) }
    finally { setLoadingMore(false) }
  }

  // Infinite scroll
  const handleScroll = useCallback(() => {
    if (!tableRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = tableRef.current
    if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !loadingMore) {
      fetchEmployees(offset, search)
    }
  }, [offset, hasMore, loadingMore, search])

  useEffect(() => {
    const el = tableRef.current
    if (el) el.addEventListener('scroll', handleScroll)
    return () => { if (el) el.removeEventListener('scroll', handleScroll) }
  }, [handleScroll])

  // Load photo when an employee is selected
  useEffect(() => {
    if (!selected || isNew) { setPhotoUrl(null); return }
    axios.get(`${API_BASE}/api/employees/${selected.id}/photo`, { responseType: 'blob' })
      .then(r => setPhotoUrl(URL.createObjectURL(r.data)))
      .catch(() => setPhotoUrl(null))
  }, [selected?.id, isNew])

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be under 2MB')
      photoRef.current.value = ''
      return
    }
    setPhotoUploading(true)
    const formData = new FormData()
    formData.append('photo', file)
    try {
      await axios.post(`${API_BASE}/api/employees/${selected.id}/photo`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      })
      const r = await axios.get(`${API_BASE}/api/employees/${selected.id}/photo`, { responseType: 'blob' })
      setPhotoUrl(URL.createObjectURL(r.data))
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to upload photo')
    } finally {
      setPhotoUploading(false)
      photoRef.current.value = ''
    }
  }

  // Debounced search
  const handleSearch = (val) => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearch(val), 300)
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (isNew) {
        await axios.post(`${API_BASE}/api/employees`, form, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.put(`${API_BASE}/api/employees/${selected.id}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      setEmployees([])
      setOffset(0)
      setHasMore(true)
      await fetchEmployees(0, search, true)
      setSelected(null); setIsNew(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving')
    } finally { setSaving(false) }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/employees/template`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'employees_template.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) { console.error(err) }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    setUploadProgress(0)

    // Animate progress bar
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 8
      if (progress > 90) progress = 90
      setUploadProgress(Math.round(progress))
    }, 400)

    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await axios.post(`${API_BASE}/api/employees/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      })
      clearInterval(interval)
      setUploadProgress(100)
      setTimeout(() => {
        setUploading(false)
        setUploadProgress(0)
        setUploadResult(res.data.summary)
        setEmployees([])
        setOffset(0)
        setHasMore(true)
        fetchEmployees(0, search, true)
      }, 600)
    } catch (err) {
      clearInterval(interval)
      setUploading(false)
      setUploadProgress(0)
      setUploadResult({ error: err.response?.data?.error || 'Upload failed' })
    } finally {
      fileRef.current.value = ''
    }
  }

  const panelOpen = selected || isNew

  return (
    <Layout title="Employees" subtitle="Headcount Management">
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>

        {/* Left — Employee list */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', flex: 1 }}>
                Employees
                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '400', marginLeft: '8px' }}>
                  {total.toLocaleString()} total
                </span>
              </div>
              <button onClick={handleDownloadTemplate}
                style={{ padding: '7px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', color: '#374151', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
                ↓ Template
              </button>
              <button onClick={() => fileRef.current.click()} disabled={uploading}
                style={{ padding: '7px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', color: '#3b82f6', fontWeight: '600', fontSize: '12px', cursor: uploading ? 'not-allowed' : 'pointer' }}>
                {uploading ? 'Uploading...' : '↑ Upload Excel'}
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleUpload} style={{ display: 'none' }} />
              <button onClick={() => { setIsNew(true); setSelected(null); setForm(emptyEmp); setError('') }}
                style={{ padding: '7px 12px', background: '#00c896', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
                + Add
              </button>
            </div>

            {/* Progress bar */}
            {uploading && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  <span>Processing employee file...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '3px',
                    background: 'linear-gradient(90deg, #00c896, #00a578)',
                    width: `${uploadProgress}%`,
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>
            )}

            {/* Upload result */}
            {uploadResult && !uploading && (
              <div style={{
                padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '10px',
                background: uploadResult.error ? '#fef2f2' : '#f0fdf9',
                border: `1px solid ${uploadResult.error ? '#fecaca' : '#bbf7d0'}`,
                color: uploadResult.error ? '#ef4444' : '#111827',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                {uploadResult.error ? uploadResult.error : (
                  <span>
                    ✓ <strong>{uploadResult.inserted}</strong> added · <strong>{uploadResult.updated}</strong> updated · <strong>{uploadResult.deactivated}</strong> deactivated · <strong>{uploadResult.total}</strong> total processed
                  </span>
                )}
                <span onClick={() => setUploadResult(null)} style={{ cursor: 'pointer', color: '#9ca3af', fontSize: '16px' }}>×</span>
              </div>
            )}

            {/* Search + filter */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search by name, number or department..."
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#f9fafb' }} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#f9fafb' }}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div ref={tableRef} style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                <tr>{['Number', 'Name', 'Department', 'Shift', 'Start Date', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {employees.map(e => {
                  const active = selected?.id === e.id
                  return (
                    <tr key={e.id}
                      onClick={() => { setSelected(e); setIsNew(false); setForm({ ...e, StartDate: e.StartDate?.slice(0, 10) || '' }); setError('') }}
                      style={{ cursor: 'pointer', background: active ? '#f0fdf9' : 'transparent' }}
                      onMouseEnter={ev => { if (!active) ev.currentTarget.style.background = '#f9fafb' }}
                      onMouseLeave={ev => { if (!active) ev.currentTarget.style.background = 'transparent' }}>
                      <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', fontFamily: 'monospace', fontSize: '12px', color: '#6b7280' }}>{e.Number}</td>
                      <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: '500', color: '#111827' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: e.Status ? '#00c896' : '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                            {e.Name?.charAt(0) || '?'}
                          </div>
                          {e.Name}
                        </div>
                      </td>
                      <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{e.Department || '—'}</td>
                      <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{e.Shift || '—'}</td>
                      <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6', color: '#6b7280', fontFamily: 'monospace', fontSize: '12px' }}>{e.StartDate?.slice(0, 10) || '—'}</td>
                      <td style={{ padding: '11px 20px', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: e.Status ? '#f0fdf9' : '#fef2f2', color: e.Status ? '#00c896' : '#ef4444' }}>
                          {e.Status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  )
                })}

                {/* Loading more indicator */}
                {loadingMore && (
                  <tr>
                    <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                      Loading more employees...
                    </td>
                  </tr>
                )}

                {/* End of list */}
                {!hasMore && employees.length > 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#d1d5db', fontSize: '12px' }}>
                      — {employees.length.toLocaleString()} of {total.toLocaleString()} employees loaded —
                    </td>
                  </tr>
                )}

                {employees.length === 0 && !loadingMore && (
                  <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                    No employees found
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right — Edit panel */}
        {panelOpen && (
          <div style={{ width: '300px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', flex: 1 }}>{isNew ? 'New Employee' : 'Edit Employee'}</div>
              <button onClick={() => { setSelected(null); setIsNew(false) }} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#9ca3af', cursor: 'pointer' }}>×</button>
            </div>
            {/* Photo section — edit mode only */}
            {!isNew && (
              <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '100px', height: '100px', borderRadius: '50%',
                  background: '#e5e7eb', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {photoUrl
                    ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '34px', fontWeight: '700', color: '#9ca3af' }}>{selected?.Name?.charAt(0) || '?'}</span>
                  }
                </div>
                <button
                  onClick={() => photoRef.current.click()}
                  disabled={photoUploading}
                  style={{
                    padding: '6px 14px', background: '#f3f4f6', border: '1px solid #e5e7eb',
                    borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#374151',
                    cursor: photoUploading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {photoUploading ? 'Uploading…' : '📷 Change Photo'}
                </button>
                <input ref={photoRef} type="file" accept="image/jpeg,image/png" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </div>
            )}

            <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
              {[
                { label: 'Employee Number', key: 'Number', type: 'text', placeholder: 'EMP-001' },
                { label: 'Full Name', key: 'Name', type: 'text', placeholder: 'John Smith' },
                { label: 'Department', key: 'Department', type: 'text', placeholder: 'Manufacturing' },
                { label: 'Shift', key: 'Shift', type: 'text', placeholder: 'Morning' },
                { label: 'Start Date', key: 'StartDate', type: 'date', placeholder: '' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '5px' }}>{field.label}</label>
                  <input type={field.type} value={form[field.key] || ''} onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#f9fafb' }} />
                </div>
              ))}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '5px' }}>Status</label>
                <select value={form.Status ?? true} onChange={e => setForm({ ...form, Status: e.target.value === 'true' })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#f9fafb' }}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 12px', color: '#ef4444', fontSize: '13px', marginBottom: '14px' }}>{error}</div>}
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 1, padding: '9px', background: '#00c896', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : isNew ? 'Create' : 'Save Changes'}
              </button>
              <button onClick={() => { setSelected(null); setIsNew(false) }}
                style={{ padding: '9px 14px', background: '#f3f4f6', border: 'none', borderRadius: '6px', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}