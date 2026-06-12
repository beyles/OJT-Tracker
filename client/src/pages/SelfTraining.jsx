import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = 'http://localhost:3000/api'

const thStyle = {
  textAlign: 'left', padding: '11px 18px',
  fontSize: '10px', fontWeight: '700', color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '1px solid #e5e7eb', background: '#f9fafb',
  whiteSpace: 'nowrap',
}

// ── Acknowledge sidebar panel ─────────────────────────────────────
function AcknowledgeSidebar({ user, employeeId, selected, onSuccess, onCancel, headers }) {
  const [photoErr, setPhotoErr]     = useState(false)
  const [password, setPassword]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)

  const handleConfirm = async () => {
    if (!password || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const r = await axios.post(`${API}/mpi-records/acknowledge`,
        { mpiId: selected.ID, password },
        { headers }
      )
      // Both success and alreadyAcknowledged count as done
      onSuccess(selected.ID, selected.Revision)
    } catch (err) {
      setPassword('')
      if (err.response?.status === 401) {
        setError('Incorrect password. Please try again.')
      } else {
        setError(err.response?.data?.error || 'Error submitting acknowledgement.')
      }
    } finally { setSubmitting(false) }
  }

  const initials = (user?.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const photoUrl = employeeId ? `${API}/employees/${employeeId}/photo` : null

  return (
    <div style={{ width: '300px', minWidth: '300px', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>

      {/* Employee identity */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', paddingBottom: '18px', borderBottom: '1px solid #e5e7eb' }}>
        {photoUrl && !photoErr ? (
          <img
            src={photoUrl}
            onError={() => setPhotoErr(true)}
            alt={user?.name}
            style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }}
          />
        ) : (
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e6faf5', border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: '#059669' }}>
            {initials}
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '700', fontSize: '13px', color: '#111827' }}>{user?.name}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'capitalize' }}>{user?.role}</div>
        </div>
      </div>

      {/* Document info */}
      <div style={{ paddingBottom: '18px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Document</div>
        <div style={{ fontWeight: '700', color: '#111827', fontSize: '13px', fontFamily: 'monospace' }}>{selected.Code}</div>
        <div style={{ color: '#374151', fontSize: '12px', marginTop: '4px', lineHeight: 1.4 }}>{selected.Name}</div>
        <span style={{ display: 'inline-block', marginTop: '7px', fontSize: '11px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px', background: '#f3f4f6', color: '#374151', fontFamily: 'monospace' }}>
          Rev {selected.Revision}
        </span>
      </div>

      {/* Password + buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Confirm your identity
        </div>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && password && !submitting) handleConfirm() }}
          placeholder="Your password"
          autoFocus
          style={{ width: '100%', padding: '9px 11px', border: `1px solid ${error ? '#fca5a5' : '#e5e7eb'}`, borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
        />
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', lineHeight: 1.4 }}>
            {error}
          </div>
        )}
        <button
          onClick={handleConfirm}
          disabled={!password || submitting}
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', background: password && !submitting ? '#00c896' : '#d1fae5', color: password && !submitting ? '#fff' : '#9ca3af', fontWeight: '700', fontSize: '13px', cursor: password && !submitting ? 'pointer' : 'not-allowed', transition: 'background 0.15s' }}
        >
          {submitting ? 'Submitting…' : 'Confirm'}
        </button>
        <button
          onClick={onCancel}
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb', background: 'transparent', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function SelfTraining() {
  const { token, user, employeeId } = useAuth()
  const headers = { Authorization: `Bearer ${token}` }

  const [mpis, setMpis]                       = useState([])
  const [search, setSearch]                   = useState('')
  const [selected, setSelected]               = useState(null)
  const [acknowledgedSet, setAcknowledgedSet] = useState(new Set())
  const [sidebarOpen, setSidebarOpen]         = useState(false)
  const [sidebarKey, setSidebarKey]           = useState(0)   // increment to reset sidebar state

  // Load MPIs
  useEffect(() => {
    axios.get(`${API}/mpi-records/available`, { headers })
      .then(r => setMpis(r.data.data || []))
      .catch(console.error)
  }, [])

  // Load user's existing acknowledgements for checkmarks
  useEffect(() => {
    if (!employeeId) return
    axios.get(`${API}/mpi-records?employeeId=${employeeId}&limit=200`, { headers })
      .then(r => {
        const s = new Set((r.data.data || []).map(rec => `${rec.MpiID}_${rec.Version}`))
        setAcknowledgedSet(s)
      })
      .catch(console.error)
  }, [employeeId])

  // Close sidebar when navigating to a different document
  useEffect(() => {
    setSidebarOpen(false)
    setSidebarKey(k => k + 1)
  }, [selected?.ID])

  const isAcked   = (m) => acknowledgedSet.has(`${m.ID}_${m.Revision}`)
  const backToList = () => setSelected(null)

  const openSidebar  = () => setSidebarOpen(true)
  const closeSidebar = () => {
    setSidebarOpen(false)
    setSidebarKey(k => k + 1)   // fresh state next open
  }

  // Called by sidebar on successful acknowledgement
  const handleAcknowledged = (mpiId, version) => {
    setAcknowledgedSet(prev => new Set([...prev, `${mpiId}_${version}`]))
    closeSidebar()
  }

  const filtered = mpis.filter(m => {
    const q = search.toLowerCase()
    return m.Code.toLowerCase().includes(q) || m.Name.toLowerCase().includes(q)
  })

  // ── MODE 2 — READING ──────────────────────────────────────────────
  if (selected) {
    const alreadyAcked = isAcked(selected)

    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#fff', zIndex: 1000 }}>

        {/* Top bar */}
        <div style={{ height: '50px', display: 'flex', alignItems: 'center', gap: '14px', padding: '0 20px', borderBottom: '1px solid #e5e7eb', flexShrink: 0, background: '#fff' }}>
          <button
            onClick={backToList}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', color: '#374151', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            ← Back to Documents
          </button>

          <div style={{ flex: 1, fontWeight: '700', fontSize: '15px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selected.Code} — {selected.Name}
          </div>

          <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: '#f3f4f6', color: '#374151', fontFamily: 'monospace' }}>
            Rev {selected.Revision}
          </span>

          {/* Acknowledge button */}
          <button
            onClick={() => !alreadyAcked && !sidebarOpen && openSidebar()}
            disabled={alreadyAcked || sidebarOpen}
            style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 16px', borderRadius: '6px', border: 'none',
              background: alreadyAcked ? '#f3f4f6' : '#00c896',
              color: alreadyAcked ? '#9ca3af' : '#fff',
              fontWeight: '700', fontSize: '13px',
              cursor: alreadyAcked || sidebarOpen ? 'default' : 'pointer',
              transition: 'background 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            ✓ {alreadyAcked ? 'Acknowledged' : 'Acknowledge'}
          </button>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* PDF viewer — flex:1 grows/shrinks automatically */}
          <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
            <iframe
              key={selected.ID}
              src={`${API}/training/mpis/${selected.ID}/file#toolbar=0`}
              title={`${selected.Code} — ${selected.Name}`}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          </div>

          {/* Sliding sidebar — width transitions between 0 and 300px */}
          <div style={{
            width: sidebarOpen ? '300px' : '0',
            flexShrink: 0,
            overflow: 'hidden',
            transition: 'width 0.25s ease',
            background: '#f9fafb',
          }}>
            {/* Inner div holds the fixed 300px layout; outer clips it during animation */}
            <div style={{ width: '300px', height: '100%', borderLeft: '2px solid #e5e7eb' }}>
              <AcknowledgeSidebar
                key={sidebarKey}
                user={user}
                employeeId={employeeId}
                selected={selected}
                onSuccess={handleAcknowledged}
                onCancel={closeSidebar}
                headers={headers}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── MODE 1 — BROWSE ───────────────────────────────────────────────
  return (
    <Layout title="Self Training" subtitle="Read and acknowledge procedure documents">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by code or name…"
            style={{ width: '320px', padding: '9px 13px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#fff' }}
          />
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>
            {filtered.length} document{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Revision</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Already Read</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                    No documents found
                  </td>
                </tr>
              )}
              {filtered.map(m => {
                const acked  = isAcked(m)
                const noFile = !m.hasFile
                return (
                  <tr
                    key={m.ID}
                    onClick={() => !noFile && setSelected(m)}
                    style={{ cursor: noFile ? 'default' : 'pointer', borderBottom: '1px solid #f3f4f6' }}
                    onMouseEnter={e => { if (!noFile) e.currentTarget.style.background = '#fafafa' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '14px 18px', fontWeight: '700', color: '#111827', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'nowrap' }}>
                      {m.Code}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#374151', fontSize: '13px' }}>
                      {m.Name}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#6b7280', fontSize: '13px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {m.Revision}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {noFile
                        ? <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 9px', borderRadius: '4px', background: '#f3f4f6', color: '#9ca3af' }}>No File</span>
                        : <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 9px', borderRadius: '4px', background: '#e6faf5', color: '#059669' }}>PDF Available</span>
                      }
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      {acked
                        ? <span style={{ color: '#059669', fontSize: '17px', fontWeight: '700', lineHeight: 1 }}>✓</span>
                        : <span style={{ color: '#d1d5db', fontSize: '13px' }}>—</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
