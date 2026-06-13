import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import SearchSelect from '../components/SearchSelect'
import axios from 'axios'
import useBreakpoint from '../hooks/useBreakpoint'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const ILUO_THRESHOLDS = [
  { max: 25,  level: 'I', color: '#6b7280' },
  { max: 50,  level: 'L', color: '#f59e0b' },
  { max: 75,  level: 'U', color: '#3b82f6' },
  { max: 99,  level: 'O', color: '#8b5cf6' },
  { max: 100, level: '✓', color: '#00c896' },
]

function getILUO(progress) {
  const p = parseFloat(progress)
  if (isNaN(p)) return null
  return ILUO_THRESHOLDS.find(t => p <= t.max) || ILUO_THRESHOLDS[ILUO_THRESHOLDS.length - 1]
}

function formatDate(raw) {
  if (!raw) return '—'
  // DATE columns come back as 'YYYY-MM-DD'; TIMESTAMP as full ISO string
  const d = typeof raw === 'string' && raw.length === 10
    ? new Date(raw + 'T00:00:00')
    : new Date(raw)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const thStyle = {
  textAlign: 'left', padding: '10px 16px',
  fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em',
  textTransform: 'uppercase', color: '#9ca3af',
  borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
  background: '#fff', position: 'sticky', top: 0, zIndex: 1
}
const tdStyle = {
  padding: '10px 16px', borderBottom: '1px solid #f3f4f6',
  fontSize: '13px', color: '#374151', verticalAlign: 'middle'
}

function EmptyRow({ cols, message }) {
  return (
    <tr>
      <td colSpan={cols} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
        {message}
      </td>
    </tr>
  )
}

function OjtTable({ rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>{['Date', 'Workstation', 'Progress', 'Hours', 'Trainer', 'Notes'].map(h =>
          <th key={h} style={thStyle}>{h}</th>
        )}</tr>
      </thead>
      <tbody>
        {rows.length === 0
          ? <EmptyRow cols={6} message="No OJT events recorded for this employee." />
          : rows.map(ev => {
              const iluo = getILUO(ev.Progress) || ILUO_THRESHOLDS[0]
              return (
                <tr key={ev.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(ev.EventDate)}</td>
                  <td style={tdStyle}>{ev.WorkstationName}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '600' }}>{ev.Progress}%</span>
                      <span style={{
                        padding: '1px 7px', borderRadius: '4px',
                        fontSize: '11px', fontWeight: '700',
                        background: iluo.color + '22', color: iluo.color
                      }}>{iluo.level}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>{ev.Hours}h</td>
                  <td style={tdStyle}>{ev.TrainerName}</td>
                  <td style={{
                    ...tdStyle, color: '#9ca3af', maxWidth: '260px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>{ev.Comment || '—'}</td>
                </tr>
              )
            })
        }
      </tbody>
    </table>
  )
}

function CertsTable({ rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>{['Date', 'Workstation', 'Result'].map(h =>
          <th key={h} style={thStyle}>{h}</th>
        )}</tr>
      </thead>
      <tbody>
        {rows.length === 0
          ? <EmptyRow cols={3} message="No certifications recorded for this employee." />
          : rows.map(cert => (
              <tr key={cert.id}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(cert.Date)}</td>
                <td style={tdStyle}>{cert.WorkstationName}</td>
                <td style={tdStyle}>
                  <span style={{
                    fontSize: '12px', fontWeight: '700', padding: '2px 10px', borderRadius: '20px',
                    background: cert.Result === 'Pass' ? '#f0fdf9' : '#fef2f2',
                    color: cert.Result === 'Pass' ? '#00c896' : '#ef4444',
                    border: `1px solid ${cert.Result === 'Pass' ? '#bbf7d0' : '#fecaca'}`
                  }}>{cert.Result}</span>
                </td>
              </tr>
            ))
        }
      </tbody>
    </table>
  )
}

function MpiTable({ rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>{['Date', 'MPI Code', 'MPI Name', 'Version'].map(h =>
          <th key={h} style={thStyle}>{h}</th>
        )}</tr>
      </thead>
      <tbody>
        {rows.length === 0
          ? <EmptyRow cols={4} message="No MPI records for this employee." />
          : rows.map(rec => (
              <tr key={rec.id}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(rec.Date)}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#6b7280' }}>{rec.MpiCode}</td>
                <td style={tdStyle}>{rec.MpiName}</td>
                <td style={tdStyle}>
                  <span style={{
                    fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px',
                    background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe'
                  }}>Rev. {rec.Version}</span>
                </td>
              </tr>
            ))
        }
      </tbody>
    </table>
  )
}

export default function EmployeeRecords() {
  const { isMobileOrTablet } = useBreakpoint()
  const [employees, setEmployees]   = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedName, setSelectedName] = useState('')
  const [activeTab, setActiveTab]   = useState('ojt')
  const [ojtEvents, setOjtEvents]   = useState([])
  const [certs, setCerts]           = useState([])
  const [mpiRecords, setMpiRecords] = useState([])
  const [loading, setLoading]       = useState(false)
  const [photoUrl, setPhotoUrl]     = useState(null)

  useEffect(() => {
    axios.get(`${API_BASE}/api/employees?limit=2000&active=true`)
      .then(r => setEmployees((r.data.data || []).map(e => ({ id: e.id, label: e.Name, sub: e.Number }))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedId) { setPhotoUrl(null); return }
    axios.get(`${API_BASE}/api/employees/${selectedId}/photo`, { responseType: 'blob' })
      .then(r => setPhotoUrl(URL.createObjectURL(r.data)))
      .catch(() => setPhotoUrl(null))
  }, [selectedId])

  useEffect(() => {
    if (!selectedId) {
      setOjtEvents([]); setCerts([]); setMpiRecords([])
      return
    }
    setLoading(true)
    Promise.all([
      axios.get(`${API_BASE}/api/ojt/events/by-employee?employeeId=${selectedId}`),
      axios.get(`${API_BASE}/api/certifications?employeeId=${selectedId}&limit=1000`),
      axios.get(`${API_BASE}/api/mpi-records?employeeId=${selectedId}&limit=1000`),
    ])
      .then(([ojtRes, certsRes, mpiRes]) => {
        setOjtEvents(ojtRes.data.data || [])
        setCerts(certsRes.data.data || [])
        setMpiRecords(mpiRes.data.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedId])

  const handleEmployeeChange = (id, item) => {
    setSelectedId(id)
    setSelectedName(item?.label || '')
    setActiveTab('ojt')
  }

  const tabs = [
    { key: 'ojt',   label: 'OJT Events',    count: ojtEvents.length  },
    { key: 'certs', label: 'Certifications', count: certs.length      },
    { key: 'mpi',   label: 'MPI Records',    count: mpiRecords.length },
  ]

  return (
    <Layout title="Training Records" subtitle="Full training history by employee">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: isMobileOrTablet ? 'auto' : 'calc(100vh - 56px - 56px)', minHeight: 0 }}>

        {/* Employee selector card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {selectedId && (
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: '#e5e7eb', overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {photoUrl
                  ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '26px', fontWeight: '700', color: '#9ca3af' }}>{selectedName?.charAt(0) || '?'}</span>
                }
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Employee</div>
              <div style={{ maxWidth: isMobileOrTablet ? '100%' : '420px' }}>
                <SearchSelect
                  value={selectedId}
                  onChange={handleEmployeeChange}
                  options={employees}
                  placeholder="Select an employee to view their records…"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {!selectedId && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px'
          }}>
            <div style={{ fontSize: '44px', marginBottom: '12px', opacity: 0.35 }}>👤</div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#6b7280', marginBottom: '6px' }}>
              No employee selected
            </div>
            <div style={{ fontSize: '13px', color: '#9ca3af' }}>
              Use the selector above to view training history for an employee.
            </div>
          </div>
        )}

        {/* Tabs + table */}
        {selectedId && (
          <div style={{
            flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
            overflow: 'hidden'
          }}>
            {/* Tab bar */}
            <div style={{
              display: 'flex', alignItems: 'center',
              borderBottom: '1px solid #e5e7eb', padding: '0 20px',
              flexShrink: 0, gap: '4px',
              overflowX: isMobileOrTablet ? 'auto' : 'visible',
            }}>
              <div style={{
                fontSize: '14px', fontWeight: '700', color: '#111827',
                paddingRight: '20px', borderRight: '1px solid #e5e7eb',
                marginRight: '8px', paddingTop: '14px', paddingBottom: '14px',
                whiteSpace: 'nowrap'
              }}>
                {selectedName}
              </div>
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '14px 12px',
                    border: 'none', background: 'none', cursor: 'pointer',
                    borderBottom: activeTab === tab.key ? '2px solid #00c896' : '2px solid transparent',
                    color: activeTab === tab.key ? '#00c896' : '#6b7280',
                    fontWeight: '600', fontSize: '13px',
                    whiteSpace: 'nowrap', transition: 'all 0.15s',
                    marginBottom: '-1px'
                  }}
                >
                  {tab.label}
                  <span style={{
                    marginLeft: '6px', fontSize: '11px', fontWeight: '700',
                    padding: '1px 6px', borderRadius: '10px',
                    background: activeTab === tab.key ? '#e6faf5' : '#f3f4f6',
                    color: activeTab === tab.key ? '#00c896' : '#9ca3af'
                  }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Table area */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
              {loading
                ? <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Loading records…</div>
                : <>
                    {activeTab === 'ojt'   && <OjtTable   rows={ojtEvents}  />}
                    {activeTab === 'certs' && <CertsTable rows={certs}      />}
                    {activeTab === 'mpi'   && <MpiTable   rows={mpiRecords} />}
                  </>
              }
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
