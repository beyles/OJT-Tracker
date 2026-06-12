import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API = 'http://localhost:3000/api'

export default function Topbar({ title, subtitle }) {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen]   = useState(false)
  const [photoErr, setPhotoErr]   = useState(false)
  const [dropPhotoErr, setDropPhotoErr] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const goTo = (path) => {
    setMenuOpen(false)
    navigate(path)
  }

  const now  = new Date()
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // Token passed as query param so <img src> can load it without custom headers
  const photoUrl = token ? `${API}/users/photo?token=${encodeURIComponent(token)}` : null
  const initial  = user?.name?.charAt(0) || 'U'
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={{
      height: '56px', background: '#ffffff', borderBottom: '1px solid #e5e7eb',
      display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px',
      flexShrink: 0, position: 'relative'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{subtitle}</div>}
      </div>

      <div style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace' }}>{date} · {time}</div>

      {/* User button */}
      <div style={{ position: 'relative' }}>
        <div
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '6px 12px', background: menuOpen ? '#f3f4f6' : '#f9fafb',
            borderRadius: '8px', border: '1px solid #e5e7eb',
            cursor: 'pointer', userSelect: 'none',
          }}
        >
          {/* Avatar — 32px */}
          {photoUrl && !photoErr ? (
            <img
              src={photoUrl}
              onError={() => setPhotoErr(true)}
              alt={user?.name}
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#00c896', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
              {initial}
            </div>
          )}
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{user?.name}</div>
            <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{user?.role}</div>
          </div>
          <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: '4px' }}>▾</span>
        </div>

        {/* Dropdown */}
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
            <div style={{
              position: 'absolute', top: '48px', right: 0,
              background: '#ffffff', border: '1px solid #e5e7eb',
              borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              width: '220px', zIndex: 100, overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ padding: '16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {photoUrl && !dropPhotoErr ? (
                  <img
                    src={photoUrl}
                    onError={() => setDropPhotoErr(true)}
                    alt={user?.name}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #e5e7eb' }}
                  />
                ) : (
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#00c896', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                    {initials}
                  </div>
                )}
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                </div>
              </div>

              {/* Menu items */}
              {[
                { icon: '👤', label: 'My Profile', action: () => goTo('/my-profile') },
              ].map(item => (
                <div
                  key={item.label}
                  onClick={item.action}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span>{item.icon}</span> {item.label}
                </div>
              ))}

              {/* Sign out */}
              <div style={{ borderTop: '1px solid #f3f4f6' }}>
                <div
                  onClick={handleLogout}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px', fontSize: '13px', color: '#ef4444', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span>⎋</span> Sign Out
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
