import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <Layout title="Dashboard" subtitle="Overview · Morning Shift">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Active Operators', value: '47', sub: 'on floor today', color: '#00c896' },
          { label: 'Expiring Soon', value: '6', sub: 'within 30 days', color: '#f59e0b' },
          { label: 'Critical Gaps', value: '2', sub: 'workstations uncovered', color: '#ef4444' },
          { label: 'Multiskilled', value: '18%', sub: 'target: 30%', color: '#6b7280' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '18px 20px'
          }}>
            <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '8px' }}>{kpi.label}</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Tables Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Coverage Table */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>Coverage by Workstation</div>
            <span style={{ fontSize: '10px', fontWeight: '600', background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '20px' }}>Line 1</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {['Workstation', 'Required', 'Certified', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { ws: 'WS-01 Assembly', req: 4, cert: 5, status: 'Covered', color: '#00c896', bg: '#f0fdf9' },
                { ws: 'WS-02 Soldering', req: 3, cert: 3, status: 'Covered', color: '#00c896', bg: '#f0fdf9' },
                { ws: 'WS-03 Inspection', req: 4, cert: 2, status: 'Monitor', color: '#f59e0b', bg: '#fffbeb' },
                { ws: 'WS-04 Calibration', req: 3, cert: 1, status: 'Critical', color: '#ef4444', bg: '#fef2f2' },
                { ws: 'WS-05 Packaging', req: 2, cert: 2, status: 'Covered', color: '#00c896', bg: '#f0fdf9' },
                { ws: 'WS-06 QC Final', req: 2, cert: 0, status: 'Vacancy', color: '#ef4444', bg: '#fef2f2' },
              ].map(row => (
                <tr key={row.ws}>
                  <td style={{ padding: '11px 16px', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>{row.ws}</td>
                  <td style={{ padding: '11px 16px', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>{row.req}</td>
                  <td style={{ padding: '11px 16px', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>{row.cert}</td>
                  <td style={{ padding: '11px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: '10px', fontWeight: '600', background: row.bg, color: row.color, padding: '2px 8px', borderRadius: '20px' }}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Expiry Alerts */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>Expiry Alerts</div>
            <span style={{ fontSize: '10px', fontWeight: '600', background: '#fffbeb', color: '#f59e0b', padding: '2px 8px', borderRadius: '20px' }}>6 pending</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {['Operator', 'Workstation', 'Expires', 'Urgency'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { op: 'J. Martinez', ws: 'WS-04', exp: '2026-06-12', days: '4 days', color: '#ef4444', bg: '#fef2f2' },
                { op: 'L. Hernandez', ws: 'WS-02', exp: '2026-06-18', days: '10 days', color: '#ef4444', bg: '#fef2f2' },
                { op: 'R. Torres', ws: 'WS-01', exp: '2026-06-23', days: '15 days', color: '#f59e0b', bg: '#fffbeb' },
                { op: 'A. Garcia', ws: 'WS-03', exp: '2026-07-01', days: '23 days', color: '#f59e0b', bg: '#fffbeb' },
                { op: 'M. Lopez', ws: 'WS-05', exp: '2026-07-04', days: '26 days', color: '#6b7280', bg: '#f3f4f6' },
                { op: 'P. Ruiz', ws: 'WS-01', exp: '2026-07-07', days: '29 days', color: '#6b7280', bg: '#f3f4f6' },
              ].map(row => (
                <tr key={row.op}>
                  <td style={{ padding: '11px 16px', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>{row.op}</td>
                  <td style={{ padding: '11px 16px', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>{row.ws}</td>
                  <td style={{ padding: '11px 16px', color: '#6b7280', fontFamily: 'monospace', fontSize: '12px', borderBottom: '1px solid #f3f4f6' }}>{row.exp}</td>
                  <td style={{ padding: '11px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: '10px', fontWeight: '600', background: row.bg, color: row.color, padding: '2px 8px', borderRadius: '20px' }}>{row.days}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}