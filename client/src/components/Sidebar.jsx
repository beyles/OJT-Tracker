import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Users, ClipboardList, BadgeCheck, FileText,
  BookOpen, BookMarked, Settings, UsersRound, GraduationCap, Grid3x3, BarChart2,
  ChevronLeft, ChevronRight
} from 'lucide-react'

const menuItems = [
  { label: 'Dashboard',        icon: LayoutDashboard, path: '/dashboard',      roles: ['sysadmin', 'trainingadmin', 'trainer', 'operator'] },
  { label: 'Staffing',         icon: Users,           path: '/staffing',        roles: ['sysadmin', 'trainingadmin', 'trainer', 'operator'] },
  { label: 'OJT',              icon: ClipboardList,   path: '/ojt',             roles: ['sysadmin', 'trainingadmin', 'trainer'] },
  { label: 'Certifications',   icon: BadgeCheck,      path: '/certifications',  roles: ['sysadmin', 'trainingadmin', 'trainer'] },
  { label: 'Document Records', icon: FileText,        path: '/mpi-records',     roles: ['sysadmin', 'trainingadmin', 'trainer'] },
  { label: 'Self Training',    icon: BookOpen,        path: '/self-training',   roles: ['sysadmin', 'trainingadmin', 'trainer', 'operator'] },
  { label: 'Training Records', icon: BookMarked,      path: '/employee-records', roles: ['sysadmin', 'trainingadmin', 'trainer'] },
  { label: 'System Admin',     icon: Settings,        path: '/system-admin',    roles: ['sysadmin'] },
  { label: 'Employees',        icon: UsersRound,      path: '/employees',       roles: ['sysadmin'] },
  { label: 'Training Admin',   icon: GraduationCap,   path: '/training-admin',  roles: ['sysadmin', 'trainingadmin'] },
  { label: 'Matrices',         icon: Grid3x3,         path: '/matrices',        roles: ['sysadmin', 'trainingadmin'] },
  { label: 'Reports',          icon: BarChart2,       path: '/reports',         roles: ['sysadmin', 'trainingadmin', 'trainer'] },
  { label: 'My Progress',      icon: BarChart2,       path: '/my-progress',     roles: ['operator'] },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const filtered = menuItems.filter(item =>
    item.roles.includes(user?.role || 'operator')
  )

  return (
    <div style={{
      width: collapsed ? '56px' : '220px',
      height: '100vh',
      background: '#f3f4f6',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'width 0.2s ease',
      overflow: 'hidden'
    }}>
      {/* Logo */}
      <div style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid #e5e7eb',
        whiteSpace: 'nowrap',
        overflow: 'hidden'
      }}>
        {collapsed
          ? <img src="/sparkplug-logo- crop.png" alt="Sparkplug" style={{ height: '36px', objectFit: 'contain' }} />
          : <img src="/sparkplug-logo.png" alt="Sparkplug" style={{ height: '36px', objectFit: 'contain' }} />
        }
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, paddingTop: '12px', overflowY: 'auto', overflowX: 'hidden' }}>
        {filtered.map(item => {
          const active = location.pathname === item.path
          const Icon = item.icon
          return (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : ''}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: collapsed ? '10px 0' : '10px 20px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                fontSize: '14px',
                color: active ? '#00c896' : '#1f2937',
                background: active ? '#e6faf5' : 'transparent',
                borderLeft: collapsed ? 'none' : (active ? '3px solid #00c896' : '3px solid transparent'),
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#e9eaec' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon
                size={18}
                style={{ flexShrink: 0, opacity: active ? 1 : 0.6 }}
              />
              {!collapsed && item.label}
            </div>
          )
        })}
      </div>

      {/* Collapse button */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: collapsed ? '14px 0' : '14px 20px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderTop: '1px solid #e5e7eb',
          fontSize: '14px', color: '#1f2937',
          fontWeight: '600',
          cursor: 'pointer', whiteSpace: 'nowrap'
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#e9eaec'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {collapsed
          ? <ChevronRight size={18} style={{ flexShrink: 0 }} />
          : <><ChevronLeft size={18} style={{ flexShrink: 0 }} />Collapse Menu</>
        }
      </div>
    </div>
  )
}
