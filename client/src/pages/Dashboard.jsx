import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = 'http://localhost:3000/api'

export default function Dashboard() {
  const { user, token, siteIds } = useAuth()
  const headers = { Authorization: `Bearer ${token}` }
  const isSysadmin = user?.role === 'sysadmin'

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    setLoading(true); setError('')
    // Sysadmin: no filter. Others: use first assigned site.
    const siteId = isSysadmin ? null : (siteIds[0] ?? null)
    const q = siteId ? `?siteId=${siteId}` : ''
    axios.get(`${API}/dashboard${q}`, { headers })
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [token])

  const kpis = data ? [
    { label: 'Active Employees', value: data.totalActiveEmployees, sub: 'in system', color: '#00c896' },
    { label: 'Assigned Today',   value: data.todayAssigned,        sub: 'on floor today', color: '#3b82f6' },
    { label: 'Certified Today',  value: `${data.percentCertified}%`, sub: `${data.certifiedToday} of ${data.todayAssigned} certified`, color: data.percentCertified === 100 ? '#00c896' : data.percentCertified >= 50 ? '#f59e0b' : '#ef4444' },
    { label: 'Expiring Soon',    value: data.expiringSoon?.length ?? 0, sub: 'within 30 days', color: data.expiringSoon?.length > 0 ? '#f59e0b' : '#9ca3af' },
  ] : []

  const urgencyColor = (days) => days <= 7 ? '#ef4444' : days <= 14 ? '#f59e0b' : '#6b7280'
  const urgencyBg    = (days) => days <= 7 ? '#fef2f2' : days <= 14 ? '#fffbeb' : '#f3f4f6'

  return (
    <Layout title="Dashboard">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#ef4444' }}>{error}</div>
        )}

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {loading && !data ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '18px 20px', height: '88px', background: '#f9fafb' }} />
            ))
          ) : kpis.map(kpi => (
            <div key={kpi.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '18px 20px' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '8px' }}>{kpi.label}</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Tables row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* Active Lines */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>Active Lines</div>
              <span style={{ fontSize: '10px', fontWeight: '600', background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '20px' }}>
                {data?.activeLines?.length ?? 0} lines
              </span>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '320px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    {['Line', 'Building', 'Workstations', 'Assigned Today'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 16px', fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#f9fafb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.activeLines || []).map(line => (
                    <tr key={line.ID}>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', fontWeight: '500', color: '#111827' }}>{line.Name}</td>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{line.Building}</td>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', color: '#6b7280', textAlign: 'center' }}>{line.WorkstationCount}</td>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: line.AssignedToday > 0 ? '#e6faf5' : '#f3f4f6', color: line.AssignedToday > 0 ? '#00c896' : '#9ca3af' }}>
                          {line.AssignedToday}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!data || data.activeLines.length === 0) && (
                    <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>No active lines</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expiry Alerts */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>Expiry Alerts</div>
              <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: (data?.expiringSoon?.length ?? 0) > 0 ? '#fffbeb' : '#f3f4f6', color: (data?.expiringSoon?.length ?? 0) > 0 ? '#f59e0b' : '#9ca3af' }}>
                {data?.expiringSoon?.length ?? 0} pending
              </span>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '320px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    {['Employee', 'Workstation', 'Expires', 'Days Left'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 16px', fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#f9fafb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.expiringSoon || []).map((row, i) => (
                    <tr key={i}>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{row.Employee}</td>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{row.Workstation}</td>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', color: '#6b7280', fontFamily: 'monospace', fontSize: '12px' }}>{row.ExpiryDate}</td>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: urgencyBg(row.DaysLeft), color: urgencyColor(row.DaysLeft) }}>
                          {row.DaysLeft}d
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!data || data.expiringSoon.length === 0) && (
                    <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>No upcoming expirations</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
