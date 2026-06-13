import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { label: 'Dashboard',        icon: '📊', path: '/dashboard',       roles: ['sysadmin', 'trainingadmin', 'trainer', 'operator'] },
  { label: 'Staffing',         icon: '👷', path: '/staffing',        roles: ['sysadmin', 'trainingadmin', 'trainer', 'operator'] },
  { label: 'OJT',              icon: '📝', path: '/ojt',             roles: ['sysadmin', 'trainingadmin', 'trainer'] },
  { label: 'Self Training',    icon: '📖', path: '/self-training',   roles: ['sysadmin', 'trainingadmin', 'trainer', 'operator'] },
  { label: 'Certifications',   icon: '🎓', path: '/certifications',  roles: ['sysadmin', 'trainingadmin', 'trainer'] },
  { label: 'MPI Records',      icon: '📄', path: '/mpi-records',     roles: ['sysadmin', 'trainingadmin', 'trainer'] },
  { label: 'Training Records', icon: '🗂️', path: '/employee-records', roles: ['sysadmin', 'trainingadmin', 'trainer'] },
  { label: 'Reports',          icon: '📈', path: '/reports',         roles: ['sysadmin', 'trainingadmin', 'trainer'] },
  { label: 'My Progress',      icon: '⭐', path: '/my-progress',     roles: ['operator'] },
  { label: 'Training Admin',   icon: '📋', path: '/training-admin',  roles: ['sysadmin', 'trainingadmin'] },
  { label: 'System Admin',     icon: '🖥️', path: '/system-admin',   roles: ['sysadmin'] },
  { label: 'Employees',        icon: '👥', path: '/employees',       roles: ['sysadmin'] },
]

const PRIMARY_PATHS = {
  sysadmin:      ['/dashboard', '/staffing', '/ojt', '/self-training'],
  trainingadmin: ['/dashboard', '/staffing', '/ojt', '/self-training'],
  trainer:       ['/dashboard', '/staffing', '/ojt', '/self-training'],
  operator:      ['/dashboard', '/staffing', '/self-training'],
}

export default function BottomNav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const role = user?.role || 'operator'
  const primaryPaths = PRIMARY_PATHS[role] || PRIMARY_PATHS.operator
  const accessible    = NAV_ITEMS.filter(item => item.roles.includes(role))
  const primaryItems  = accessible.filter(item => primaryPaths.includes(item.path))
  const drawerItems   = accessible.filter(item => !primaryPaths.includes(item.path))

  const isActive = (path) => location.pathname === path
  const go = (path) => { setDrawerOpen(false); navigate(path) }
  const handleLogout = () => { setDrawerOpen(false); logout(); navigate('/login') }

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(0,0,0,0.25)' }}
        />
      )}

      {/* Slide-up drawer */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: '60px', zIndex: 49,
        background: '#fff',
        borderRadius: '16px 16px 0 0',
        borderTop: '1px solid #e5e7eb',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        transform: drawerOpen ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        maxHeight: '70vh',
        overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#e5e7eb' }} />
        </div>

        {drawerItems.map(item => (
          <div
            key={item.path}
            onClick={() => go(item.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '15px 24px', fontSize: '15px', fontWeight: '600',
              color: isActive(item.path) ? '#00c896' : '#111827',
              background: isActive(item.path) ? '#e6faf5' : 'transparent',
              cursor: 'pointer', borderBottom: '1px solid #f9fafb',
            }}
          >
            <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </div>
        ))}

        <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

        <div
          onClick={() => go('/my-profile')}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '15px 24px', fontSize: '15px', fontWeight: '600',
            color: isActive('/my-profile') ? '#00c896' : '#111827', cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>👤</span>
          My Profile
        </div>

        <div
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '15px 24px', fontSize: '15px', fontWeight: '600',
            color: '#ef4444', cursor: 'pointer', marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>⎋</span>
          Sign Out
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
        height: '60px', background: '#fff', borderTop: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'stretch',
      }}>
        {primaryItems.map(item => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => go(item.path)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '2px',
                border: 'none', background: 'none', cursor: 'pointer',
                color: active ? '#00c896' : '#9ca3af', padding: 0,
              }}
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: '600', lineHeight: 1 }}>{item.label}</span>
            </button>
          )
        })}
        <button
          onClick={() => setDrawerOpen(d => !d)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '2px',
            border: 'none', background: 'none', cursor: 'pointer',
            color: drawerOpen ? '#00c896' : '#9ca3af', padding: 0,
          }}
        >
          <span style={{ fontSize: '22px', lineHeight: 1, letterSpacing: '1px' }}>···</span>
          <span style={{ fontSize: '10px', fontWeight: '600', lineHeight: 1 }}>More</span>
        </button>
      </div>
    </>
  )
}
