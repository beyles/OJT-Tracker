import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Topbar({ title, subtitle }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const now = new Date()
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{
      height: '56px',
      background: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      gap: '16px',
      flexShrink: 0,
      position: 'relative'
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
            cursor: 'pointer', userSelect: 'none'
          }}
        >
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: '#00c896',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: '700', color: '#fff'
          }}>
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{user?.name}</div>
            <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{user?.role}</div>
          </div>
          <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: '4px' }}>▾</span>
        </div>

        {/* Dropdown menu */}
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
            <div style={{
              position: 'absolute', top: '48px', right: 0,
              background: '#ffffff', border: '1px solid #e5e7eb',
              borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              width: '220px', zIndex: 100, overflow: 'hidden'
            }}>
              {/* User info header */}
              <div style={{ padding: '16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: '#00c896',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: '700', color: '#fff', flexShrink: 0
                }}>
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{user?.name}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>{user?.email}</div>
                </div>
              </div>

              {/* Menu items */}
              {[
                { icon: '⚙', label: 'Settings', action: () => {} },
                { icon: '👤', label: 'My Profile', action: () => {} },
              ].map(item => (
                <div
                  key={item.label}
                  onClick={item.action}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '11px 16px', fontSize: '13px', color: '#374151',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span>{item.icon}</span> {item.label}
                </div>
              ))}

              {/* Logout */}
              <div style={{ borderTop: '1px solid #f3f4f6' }}>
                <div
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '11px 16px', fontSize: '13px', color: '#ef4444',
                    cursor: 'pointer'
                  }}
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