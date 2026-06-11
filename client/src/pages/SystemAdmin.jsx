import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const ROLES = ['sysadmin', 'trainingadmin', 'trainer', 'operator']
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Santiago',
  'America/Sao_Paulo', 'Europe/London', 'Europe/Madrid', 'Asia/Tokyo', 'UTC'
]
const emptyUser = { Name: '', Email: '', EmployeeID: '', Role: 'operator', Password: '', Status: true }

export default function SystemAdmin() {
  const { token } = useAuth()
  const [tab, setTab] = useState('users')

  return (
    <Layout title="System Admin" subtitle="System Configuration & User Management">
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '24px', gap: '4px' }}>
        {[
          { key: 'users', label: 'Users' },
          { key: 'sites', label: 'Sites' },
          { key: 'buildings', label: 'Buildings' },
          { key: 'shifts', label: 'Shift Schedules' },
          { key: 'system', label: 'System' },
        ].map(t => (
          <div
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              color: tab === t.key ? '#00c896' : '#6b7280',
              borderBottom: tab === t.key ? '2px solid #00c896' : '2px solid transparent',
              marginBottom: '-2px',
              transition: 'all 0.15s'
            }}
          >
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'users' && <UsersTab token={token} />}
      {tab === 'sites' && <SitesTab token={token} />}
      {tab === 'buildings' && <BuildingsTab token={token} />}
      {tab === 'shifts' && <ShiftsTab token={token} />}
      {tab === 'system' && <SystemTab />}
    </Layout>
  )
}

// ── USERS TAB ──────────────────────────────────────────────
function UsersTab({ token }) {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState(emptyUser)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(res.data)
    } catch (err) { console.error(err) }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (
      u.Name?.toLowerCase().includes(q) ||
      u.Email?.toLowerCase().includes(q) ||
      String(u.EmployeeID ?? '').toLowerCase().includes(q)
    )
  })

  const selectUser = (u) => { setSelected(u); setIsNew(false); setForm({ ...u, Password: '' }); setError('') }
  const openNew = () => { setSelected(null); setIsNew(true); setForm(emptyUser); setError('') }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (isNew) {
        await axios.post('http://localhost:3000/api/users', form, { headers: { Authorization: `Bearer ${token}` } })
      } else {
        await axios.put(`http://localhost:3000/api/users/${selected.id}`, form, { headers: { Authorization: `Bearer ${token}` } })
      }
      await fetchUsers()
      setSelected(null); setIsNew(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving user')
    } finally { setSaving(false) }
  }

  const panelOpen = selected || isNew

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 200px)' }}>
      <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', flex: 1 }}>Users <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '400' }}>({filtered.length})</span></div>
          <button onClick={openNew} style={{ padding: '8px 16px', background: '#00c896', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>+ Add User</button>
        </div>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or employee ID..." style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#f9fafb' }} />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>{['Name', 'Email', 'Employee ID', 'Role', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const active = selected?.id === u.id
                return (
                  <tr key={u.id} onClick={() => selectUser(u)} style={{ cursor: 'pointer', background: active ? '#f0fdf9' : 'transparent' }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: '500', color: '#111827' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#00c896', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>{u.Name?.charAt(0) || '?'}</div>
                        {u.Name}
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{u.Email}</td>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', color: '#6b7280', fontFamily: 'monospace' }}>{u.EmployeeID}</td>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: '#f3f4f6', color: '#374151' }}>{u.Role}</span>
                    </td>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: u.Status ? '#f0fdf9' : '#fef2f2', color: u.Status ? '#00c896' : '#ef4444' }}>{u.Status ? 'Active' : 'Inactive'}</span>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>No users found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {panelOpen && (
        <div style={{ width: '320px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', flex: 1 }}>{isNew ? 'New User' : 'Edit User'}</div>
            <button onClick={() => { setSelected(null); setIsNew(false) }} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#9ca3af', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
            {[
              { label: 'Full Name', key: 'Name', type: 'text', placeholder: 'John Smith' },
              { label: 'Email', key: 'Email', type: 'email', placeholder: 'john@company.com' },
              { label: 'Employee ID', key: 'EmployeeID', type: 'text', placeholder: 'EMP-001' },
              { label: 'Password', key: 'Password', type: 'password', placeholder: isNew ? 'Set password' : 'Leave blank to keep current' },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>{field.label}</label>
                <input type={field.type} value={form[field.key] || ''} onChange={e => setForm({ ...form, [field.key]: e.target.value })} placeholder={field.placeholder}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#f9fafb' }} />
              </div>
            ))}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>Role</label>
              <select value={form.Role || 'operator'} onChange={e => setForm({ ...form, Role: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#f9fafb' }}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>Status</label>
              <select value={form.Status ?? true} onChange={e => setForm({ ...form, Status: e.target.value === 'true' })}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#f9fafb' }}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 12px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
          </div>
          <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '9px', background: '#00c896', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : isNew ? 'Create User' : 'Save Changes'}
            </button>
            <button onClick={() => { setSelected(null); setIsNew(false) }} style={{ padding: '9px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SITES TAB ──────────────────────────────────────────────
function SitesTab({ token }) {
  const [sites, setSites] = useState([])
  const [selected, setSelected] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState({ Name: '', TimeZone: 'America/Mexico_City', Status: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchSites() }, [])

  const fetchSites = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/sites', { headers: { Authorization: `Bearer ${token}` } })
      setSites(res.data)
    } catch (err) { console.error(err) }
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (isNew) {
        await axios.post('http://localhost:3000/api/sites', form, { headers: { Authorization: `Bearer ${token}` } })
      } else {
        await axios.put(`http://localhost:3000/api/sites/${selected.id}`, form, { headers: { Authorization: `Bearer ${token}` } })
      }
      await fetchSites(); setSelected(null); setIsNew(false)
    } catch (err) { setError(err.response?.data?.error || 'Error saving') }
    finally { setSaving(false) }
  }

  const panelOpen = selected || isNew

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 200px)' }}>
      <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', flex: 1 }}>Sites</div>
          <button onClick={() => { setIsNew(true); setSelected(null); setForm({ Name: '', TimeZone: 'America/Mexico_City', Status: true }); setError('') }}
            style={{ padding: '8px 16px', background: '#00c896', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>+ Add Site</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>{['Site Name', 'Timezone', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {sites.map(s => {
                const active = selected?.id === s.id
                return (
                  <tr key={s.id} onClick={() => { setSelected(s); setIsNew(false); setForm({ ...s }); setError('') }}
                    style={{ cursor: 'pointer', background: active ? '#f0fdf9' : 'transparent' }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: '500', color: '#111827' }}>{s.Name}</td>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', color: '#6b7280', fontFamily: 'monospace' }}>{s.TimeZone}</td>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: s.Status ? '#f0fdf9' : '#fef2f2', color: s.Status ? '#00c896' : '#ef4444' }}>{s.Status ? 'Active' : 'Inactive'}</span>
                    </td>
                  </tr>
                )
              })}
              {sites.length === 0 && <tr><td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>No sites yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {panelOpen && (
        <div style={{ width: '320px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', flex: 1 }}>{isNew ? 'New Site' : 'Edit Site'}</div>
            <button onClick={() => { setSelected(null); setIsNew(false) }} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#9ca3af', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ padding: '20px', flex: 1 }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>Site Name</label>
              <input value={form.Name || ''} onChange={e => setForm({ ...form, Name: e.target.value })} placeholder="e.g. Main Plant"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#f9fafb' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>Timezone</label>
              <select value={form.TimeZone || 'UTC'} onChange={e => setForm({ ...form, TimeZone: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#f9fafb' }}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>Status</label>
              <select value={form.Status ?? true} onChange={e => setForm({ ...form, Status: e.target.value === 'true' })}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#f9fafb' }}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 12px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
          </div>
          <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '9px', background: '#00c896', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {saving ? 'Saving...' : isNew ? 'Create Site' : 'Save Changes'}
            </button>
            <button onClick={() => { setSelected(null); setIsNew(false) }} style={{ padding: '9px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── BUILDINGS TAB ──────────────────────────────────────────
function BuildingsTab({ token }) {
  const [buildings, setBuildings] = useState([])
  const [sites, setSites] = useState([])
  const [schedules, setSchedules] = useState([])
  const [selected, setSelected] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState({ Name: '', Site: '', Status: true, MultiStaffing: false, ShiftScheduleID: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchBuildings(); fetchSites(); fetchSchedules() }, [])

  const fetchBuildings = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/buildings', { headers: { Authorization: `Bearer ${token}` } })
      setBuildings(res.data)
    } catch (err) { console.error(err) }
  }

  const fetchSites = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/sites', { headers: { Authorization: `Bearer ${token}` } })
      setSites(res.data)
    } catch (err) { console.error(err) }
  }

  const fetchSchedules = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/shifts', { headers: { Authorization: `Bearer ${token}` } })
      setSchedules(res.data)
    } catch (err) { console.error(err) }
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (isNew) {
        await axios.post('http://localhost:3000/api/buildings', form, { headers: { Authorization: `Bearer ${token}` } })
      } else {
        await axios.put(`http://localhost:3000/api/buildings/${selected.id}`, form, { headers: { Authorization: `Bearer ${token}` } })
      }
      await fetchBuildings(); setSelected(null); setIsNew(false)
    } catch (err) { setError(err.response?.data?.error || 'Error saving') }
    finally { setSaving(false) }
  }

  const panelOpen = selected || isNew
  const getSiteName = (id) => sites.find(s => s.id === id)?.Name || '—'
  const getScheduleName = (id) => schedules.find(s => s.id === parseInt(id))?.Name || '—'

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 200px)' }}>
      <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', flex: 1 }}>Buildings</div>
          <button onClick={() => { setIsNew(true); setSelected(null); setForm({ Name: '', Site: sites[0]?.id || '', Status: true, MultiStaffing: false, ShiftScheduleID: '' }); setError('') }}
            style={{ padding: '8px 16px', background: '#00c896', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>+ Add Building</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>{['Building Name', 'Site', 'Shift Schedule', 'Multi-Staffing', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {buildings.map(b => {
                const active = selected?.id === b.id
                return (
                  <tr key={b.id} onClick={() => { setSelected(b); setIsNew(false); setForm({ ...b }); setError('') }}
                    style={{ cursor: 'pointer', background: active ? '#f0fdf9' : 'transparent' }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: '500', color: '#111827' }}>{b.Name}</td>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{getSiteName(b.Site)}</td>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>
                      {b.ShiftScheduleID ? getScheduleName(b.ShiftScheduleID) : <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: b.MultiStaffing ? '#eff6ff' : '#f3f4f6', color: b.MultiStaffing ? '#3b82f6' : '#6b7280' }}>{b.MultiStaffing ? 'Enabled' : 'Disabled'}</span>
                    </td>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: b.Status ? '#f0fdf9' : '#fef2f2', color: b.Status ? '#00c896' : '#ef4444' }}>{b.Status ? 'Active' : 'Inactive'}</span>
                    </td>
                  </tr>
                )
              })}
              {buildings.length === 0 && <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>No buildings yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {panelOpen && (
        <div style={{ width: '320px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', flex: 1 }}>{isNew ? 'New Building' : 'Edit Building'}</div>
            <button onClick={() => { setSelected(null); setIsNew(false) }} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#9ca3af', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ padding: '20px', flex: 1 }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>Building Name</label>
              <input value={form.Name || ''} onChange={e => setForm({ ...form, Name: e.target.value })} placeholder="e.g. Building A"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#f9fafb' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>Site</label>
              <select value={form.Site || ''} onChange={e => setForm({ ...form, Site: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#f9fafb' }}>
                <option value="">Select site...</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.Name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>Shift Schedule</label>
              <select value={form.ShiftScheduleID || ''} onChange={e => setForm({ ...form, ShiftScheduleID: e.target.value ? parseInt(e.target.value) : null })}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#f9fafb' }}>
                <option value="">No schedule assigned</option>
                {schedules.map(s => <option key={s.id} value={s.id}>{s.Name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>Multi-Staffing</label>
              <select value={form.MultiStaffing ?? false} onChange={e => setForm({ ...form, MultiStaffing: e.target.value === 'true' })}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#f9fafb' }}>
                <option value="false">Disabled — one workstation per shift</option>
                <option value="true">Enabled — multiple workstations per shift</option>
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>Status</label>
              <select value={form.Status ?? true} onChange={e => setForm({ ...form, Status: e.target.value === 'true' })}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#f9fafb' }}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 12px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
          </div>
          <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '9px', background: '#00c896', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {saving ? 'Saving...' : isNew ? 'Create Building' : 'Save Changes'}
            </button>
            <button onClick={() => { setSelected(null); setIsNew(false) }} style={{ padding: '9px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SHIFTS TAB ─────────────────────────────────────────────
function ShiftsTab({ token }) {
  const [schedules, setSchedules] = useState([])
  const [selected, setSelected] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState({ Name: '', Status: true })
  const [newShift, setNewShift] = useState({ ShiftName: '', StartTime: '', EndTime: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchSchedules() }, [])

  const fetchSchedules = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/shifts', { headers: { Authorization: `Bearer ${token}` } })
      setSchedules(res.data)
    } catch (err) { console.error(err) }
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (isNew) {
        await axios.post('http://localhost:3000/api/shifts', form, { headers: { Authorization: `Bearer ${token}` } })
      } else {
        await axios.put(`http://localhost:3000/api/shifts/${selected.id}`, form, { headers: { Authorization: `Bearer ${token}` } })
      }
      await fetchSchedules()
      setSelected(null); setIsNew(false)
    } catch (err) { setError(err.response?.data?.error || 'Error saving') }
    finally { setSaving(false) }
  }

  const handleAddShift = async () => {
    if (!newShift.ShiftName || !newShift.StartTime || !newShift.EndTime) return
    try {
      await axios.post(`http://localhost:3000/api/shifts/${selected.id}/shifts`, newShift, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNewShift({ ShiftName: '', StartTime: '', EndTime: '' })
      const res = await axios.get('http://localhost:3000/api/shifts', { headers: { Authorization: `Bearer ${token}` } })
      setSchedules(res.data)
      setSelected(res.data.find(s => s.id === selected.id))
    } catch (err) { console.error(err) }
  }

  const handleDeleteShift = async (shiftId) => {
    try {
      await axios.delete(`http://localhost:3000/api/shifts/shifts/${shiftId}`, { headers: { Authorization: `Bearer ${token}` } })
      const res = await axios.get('http://localhost:3000/api/shifts', { headers: { Authorization: `Bearer ${token}` } })
      setSchedules(res.data)
      setSelected(res.data.find(s => s.id === selected.id))
    } catch (err) { console.error(err) }
  }

  const formatTime = (t) => t ? t.slice(0, 5) : ''

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 200px)' }}>

      {/* Left — Schedule list */}
      <div style={{ width: '340px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', flex: 1 }}>Shift Schedules</div>
          <button onClick={() => { setIsNew(true); setSelected(null); setForm({ Name: '', Status: true }); setError('') }}
            style={{ padding: '8px 16px', background: '#00c896', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>+ New</button>
        </div>

        {isNew && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <input value={form.Name} onChange={e => setForm({ ...form, Name: e.target.value })}
              placeholder="Schedule name e.g. 8-Hour Schedule"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 1, padding: '8px', background: '#00c896', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Create'}
              </button>
              <button onClick={() => setIsNew(false)}
                style={{ padding: '8px 12px', background: '#f3f4f6', border: 'none', borderRadius: '6px', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
            {error && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>{error}</div>}
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {schedules.map(s => (
            <div key={s.id} onClick={() => { setSelected(s); setIsNew(false); setForm({ Name: s.Name, Status: s.Status }) }}
              style={{
                padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                background: selected?.id === s.id ? '#f0fdf9' : 'transparent',
                borderLeft: selected?.id === s.id ? '3px solid #00c896' : '3px solid transparent'
              }}
              onMouseEnter={e => { if (selected?.id !== s.id) e.currentTarget.style.background = '#f9fafb' }}
              onMouseLeave={e => { if (selected?.id !== s.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>{s.Name}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>
                {s.shifts?.length || 0} shift{s.shifts?.length !== 1 ? 's' : ''}
                <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '600', padding: '1px 6px', borderRadius: '10px', background: s.Status ? '#f0fdf9' : '#fef2f2', color: s.Status ? '#00c896' : '#ef4444' }}>
                  {s.Status ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
          {schedules.length === 0 && !isNew && (
            <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>No schedules yet</div>
          )}
        </div>
      </div>

      {/* Right — Schedule detail */}
      {selected && (
        <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input value={form.Name} onChange={e => setForm({ ...form, Name: e.target.value })}
              style={{ flex: 1, padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '15px', fontWeight: '600', outline: 'none', background: '#f9fafb' }} />
            <select value={form.Status} onChange={e => setForm({ ...form, Status: e.target.value === 'true' })}
              style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#f9fafb' }}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <button onClick={handleSave} style={{ padding: '8px 16px', background: '#00c896', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>Save</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '12px' }}>Shifts in this schedule</div>

            {selected.shifts?.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', background: '#f9fafb', borderRadius: '8px', marginBottom: '16px' }}>No shifts yet — add one below</div>
            )}

            {selected.shifts?.map(shift => (
              <div key={shift.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>{shift.shiftname}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', fontFamily: 'monospace' }}>
                    {formatTime(shift.starttime)} — {formatTime(shift.endtime)}
                  </div>
                </div>
                <button onClick={() => handleDeleteShift(shift.id)}
                  style={{ padding: '5px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
                  Remove
                </button>
              </div>
            ))}

            <div style={{ marginTop: '16px', padding: '16px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '12px' }}>Add Shift</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Shift Name</label>
                  <input value={newShift.ShiftName} onChange={e => setNewShift({ ...newShift, ShiftName: e.target.value })}
                    placeholder="e.g. Morning"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Start Time</label>
                  <input type="time" value={newShift.StartTime} onChange={e => setNewShift({ ...newShift, StartTime: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>End Time</label>
                  <input type="time" value={newShift.EndTime} onChange={e => setNewShift({ ...newShift, EndTime: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <button onClick={handleAddShift}
                  style={{ padding: '8px 16px', background: '#00c896', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  + Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SYSTEM TAB ─────────────────────────────────────────────
function SystemTab() {
  const [form, setForm] = useState({
    systemName: 'OJT Tracker',
    defaultTimezone: 'America/Mexico_City',
    sessionTimeout: '30',
    systemEmail: '',
    maintenanceMode: false
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>System Settings</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Global configuration for the application</div>
        </div>
        <div style={{ padding: '24px' }}>
          {[
            { label: 'System Name', key: 'systemName', type: 'text', hint: 'Displayed in the app header' },
            { label: 'System Email', key: 'systemEmail', type: 'email', hint: 'Used as sender for future notifications' },
            { label: 'Session Timeout (minutes)', key: 'sessionTimeout', type: 'number', hint: 'Auto-logout after inactivity' },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>{field.label}</label>
              <input type={field.type} value={form[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#f9fafb' }} />
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{field.hint}</div>
            </div>
          ))}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>Default Timezone</label>
            <select value={form.defaultTimezone} onChange={e => setForm({ ...form, defaultTimezone: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#f9fafb' }}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>Maintenance Mode</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Locks out all non-admin users</div>
            </div>
            <div onClick={() => setForm({ ...form, maintenanceMode: !form.maintenanceMode })}
              style={{ width: '44px', height: '24px', borderRadius: '12px', background: form.maintenanceMode ? '#ef4444' : '#e5e7eb', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: '2px', left: form.maintenanceMode ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </div>

          <button onClick={handleSave} style={{ padding: '10px 24px', background: '#00c896', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
            {saved ? '✓ Saved' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
