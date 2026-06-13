import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api'

const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: '600', color: '#6b7280',
  marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em',
}
const inputStyle = {
  width: '100%', padding: '9px 11px', border: '1px solid #e5e7eb',
  borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  background: '#fff',
}

const ROLE_BADGE = {
  sysadmin:      { bg: '#e0e7ff', color: '#3730a3' },
  trainingadmin: { bg: '#e6faf5', color: '#065f46' },
  trainer:       { bg: '#fffbeb', color: '#92400e' },
  operator:      { bg: '#f3f4f6', color: '#374151' },
}

export default function MyProfile() {
  const { user, token, employeeId } = useAuth()
  const headers = { Authorization: `Bearer ${token}` }

  const [employee, setEmployee]   = useState(null)
  const [photoErr, setPhotoErr]   = useState(false)
  const [photoVer, setPhotoVer]   = useState(Date.now())   // cache-bust after upload
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const [currentPw, setCurrentPw]   = useState('')
  const [newPw, setNewPw]           = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [pwLoading, setPwLoading]   = useState(false)
  const [pwMsg, setPwMsg]           = useState(null)  // { type, text }

  useEffect(() => {
    if (!employeeId) return
    axios.get(`${API}/employees/${employeeId}`, { headers })
      .then(r => setEmployee(r.data))
      .catch(() => {})
  }, [employeeId])

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be under 2MB.')
      e.target.value = ''
      return
    }
    setUploading(true)
    const fd = new FormData()
    fd.append('photo', file)
    try {
      await axios.post(`${API}/users/photo`, fd, { headers })
      setPhotoErr(false)
      setPhotoVer(Date.now())
    } catch {
      alert('Failed to upload photo. Please try again.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwMsg(null)
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' })
      return
    }
    if (newPw.length < 6) {
      setPwMsg({ type: 'error', text: 'New password must be at least 6 characters.' })
      return
    }
    setPwLoading(true)
    try {
      await axios.post(`${API}/users/change-password`, { currentPassword: currentPw, newPassword: newPw }, { headers })
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setPwMsg({ type: 'success', text: 'Password updated successfully.' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update password.' })
    } finally {
      setPwLoading(false)
    }
  }

  // Use /api/users/photo with token query param so <img src> can load it
  const photoUrl    = token ? `${API}/users/photo?token=${encodeURIComponent(token)}&v=${photoVer}` : null
  const initials    = (user?.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const roleBadge   = ROLE_BADGE[user?.role] || ROLE_BADGE.operator

  return (
    <Layout title="My Profile">
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Photo + identity card ─────────────────────────────── */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            {/* Avatar */}
            {photoUrl && !photoErr ? (
              <img
                key={photoVer}
                src={photoUrl}
                onError={() => setPhotoErr(true)}
                alt={user?.name}
                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e5e7eb' }}
              />
            ) : (
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#e6faf5', border: '3px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', fontWeight: '700', color: '#059669' }}>
                {initials}
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: '700', fontSize: '18px', color: '#111827' }}>{user?.name}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'capitalize', marginTop: '3px' }}>{user?.role}</div>
            </div>

            {/* Change photo — always visible */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ padding: '7px 18px', borderRadius: '6px', border: '1px solid #e5e7eb', background: uploading ? '#f9fafb' : '#fff', color: uploading ? '#9ca3af' : '#374151', fontSize: '13px', fontWeight: '600', cursor: uploading ? 'not-allowed' : 'pointer' }}
            >
              {uploading ? 'Uploading…' : 'Change Photo'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
          </div>

          {/* ── Account information ───────────────────────────────── */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px 28px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
              Account Information
            </div>

            {[
              { label: 'Full Name', value: user?.name },
              { label: 'Email',     value: user?.email },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '11px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '16px' }}>
                <div style={{ width: '150px', fontSize: '12px', fontWeight: '600', color: '#6b7280', flexShrink: 0, paddingTop: '1px' }}>{label}</div>
                <div style={{ fontSize: '13px', color: '#111827' }}>{value}</div>
              </div>
            ))}

            <div style={{ padding: '11px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '150px', fontSize: '12px', fontWeight: '600', color: '#6b7280', flexShrink: 0 }}>Role</div>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '4px', background: roleBadge.bg, color: roleBadge.color, textTransform: 'capitalize' }}>
                {user?.role}
              </span>
            </div>

            <div style={{ padding: '11px 0', display: 'flex', gap: '16px' }}>
              <div style={{ width: '150px', fontSize: '12px', fontWeight: '600', color: '#6b7280', flexShrink: 0, paddingTop: '1px' }}>Linked Employee</div>
              {employee ? (
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827', fontFamily: 'monospace' }}>{employee.Number}</span>
                  <span style={{ fontSize: '13px', color: '#374151' }}> — {employee.Name}</span>
                  {employee.Department && (
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px' }}>{employee.Department}</div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#9ca3af' }}>No employee record linked</div>
              )}
            </div>
          </div>

          {/* ── Change password ───────────────────────────────────── */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px 28px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
              Change Password
            </div>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div>
                <label style={labelStyle}>Current Password</label>
                <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required style={inputStyle} placeholder="••••••••" />
              </div>
              <div>
                <label style={labelStyle}>New Password</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required style={inputStyle} placeholder="••••••••" />
              </div>
              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); if (pwMsg?.type === 'error') setPwMsg(null) }}
                  required
                  style={{ ...inputStyle, borderColor: confirmPw && newPw && confirmPw !== newPw ? '#fca5a5' : '#e5e7eb' }}
                  placeholder="••••••••"
                />
              </div>

              {pwMsg && (
                <div style={{
                  padding: '9px 12px', borderRadius: '6px', fontSize: '12px', lineHeight: 1.4,
                  background: pwMsg.type === 'success' ? '#e6faf5' : '#fef2f2',
                  border:     `1px solid ${pwMsg.type === 'success' ? '#6ee7b7' : '#fca5a5'}`,
                  color:      pwMsg.type === 'success' ? '#065f46' : '#991b1b',
                }}>
                  {pwMsg.text}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={pwLoading}
                  style={{ padding: '9px 20px', borderRadius: '6px', border: 'none', background: pwLoading ? '#d1fae5' : '#00c896', color: pwLoading ? '#9ca3af' : '#fff', fontWeight: '700', fontSize: '13px', cursor: pwLoading ? 'not-allowed' : 'pointer' }}
                >
                  {pwLoading ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </Layout>
  )
}
