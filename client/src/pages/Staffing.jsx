import { Fragment, useState, useEffect, useCallback, useMemo } from 'react'
import Layout from '../components/Layout'
import SearchSelect from '../components/SearchSelect'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import useBreakpoint from '../hooks/useBreakpoint'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api'
const today = new Date().toLocaleDateString('en-CA')

const selectStyle = {
  padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '6px',
  fontSize: '13px', color: '#111827', background: '#fff', outline: 'none', cursor: 'pointer'
}
const btnStyle = {
  padding: '4px 12px', borderRadius: '6px', border: 'none',
  cursor: 'pointer', fontSize: '12px', fontWeight: '600'
}
const thStyle = {
  padding: '7px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700',
  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
  background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap'
}

const CERT_CFG = {
  certified: { label: 'Certified', color: '#00c896', bg: '#e6faf5' },
  expired:   { label: 'Expired',   color: '#ef4444', bg: '#fef2f2' },
  none:      { label: 'None',      color: '#9ca3af', bg: '#f3f4f6' },
}
const OJT_CFG = {
  O:    { label: 'O — Fully Trained', color: '#00c896', bg: '#e6faf5' },
  U:    { label: 'U',                  color: '#3b82f6', bg: '#eff6ff' },
  L:    { label: 'L',                  color: '#f59e0b', bg: '#fffbeb' },
  I:    { label: 'I',                  color: '#9ca3af', bg: '#f3f4f6' },
  none: { label: 'None',               color: '#d1d5db', bg: '#f9fafb' },
}
const OJT_BADGE_CFG = {
  O:    { label: 'O', color: '#00c896', bg: '#e6faf5' },
  U:    { label: 'U', color: '#3b82f6', bg: '#eff6ff' },
  L:    { label: 'L', color: '#f59e0b', bg: '#fffbeb' },
  I:    { label: 'I', color: '#9ca3af', bg: '#f3f4f6' },
  none: { label: '—', color: '#d1d5db', bg: 'transparent' },
}
const MPI_CFG = {
  current:  { label: 'Current',  color: '#00c896', bg: '#e6faf5' },
  outdated: { label: 'Outdated', color: '#f59e0b', bg: '#fffbeb' },
  none:     { label: '—',        color: '#d1d5db', bg: 'transparent' },
}

function Badge({ cfg }) {
  return (
    <span style={{ fontSize: '11px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function PhotoCircle({ empId, name, size = 32 }) {
  const [err, setErr] = useState(false)
  const fontSize = Math.round(size * 0.36)
  if (!err) {
    return (
      <img
        src={`${API}/employees/${empId}/photo`}
        alt=""
        onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#e5e7eb',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, fontWeight: '700', color: '#9ca3af', flexShrink: 0
    }}>
      {name?.[0] || '?'}
    </div>
  )
}

export default function Staffing() {
  const { token } = useAuth()
  const { isMobile, isMobileOrTablet } = useBreakpoint()
  const headers = { Authorization: `Bearer ${token}` }

  const [sites, setSites]           = useState([])
  const [buildings, setBuildings]   = useState([])
  const [lines, setLines]           = useState([])
  const [shifts, setShifts]         = useState([])
  const [siteId, setSiteId]         = useState('')
  const [buildingId, setBuildingId] = useState('')
  const [lineId, setLineId]         = useState('')
  const [shiftId, setShiftId]       = useState('')
  const [date, setDate]             = useState(today)

  const [workstations, setWorkstations] = useState([])
  const [records, setRecords]           = useState([])
  const [employees, setEmployees]       = useState([])

  const [assigningRow, setAssigningRow]   = useState(null)
  const [selectedEmpId, setSelectedEmpId] = useState(null)
  const [foundEmp, setFoundEmp]           = useState(null)
  const [validation, setValidation]       = useState(null)
  const [validating, setValidating]       = useState(false)
  const [assigning, setAssigning]         = useState(false)
  const [assignError, setAssignError]     = useState('')

  const [removing, setRemoving]   = useState(null)
  const [detailRec, setDetailRec] = useState(null)

  useEffect(() => {
    axios.get(`${API}/employees?limit=2000&active=true`, { headers })
      .then(r => setEmployees((r.data.data || []).map(e => ({ id: e.id, label: e.Name, sub: e.Number }))))
      .catch(console.error)
  }, [])

  useEffect(() => {
    axios.get(`${API}/staffing/context`, { headers })
      .then(r => setSites(r.data.sites || []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    setBuildings([]); setBuildingId(''); setLines([]); setShifts([]); setLineId(''); setShiftId('')
    if (!siteId) return
    axios.get(`${API}/staffing/context?siteId=${siteId}`, { headers })
      .then(r => setBuildings(r.data.buildings || []))
      .catch(console.error)
  }, [siteId])

  useEffect(() => {
    setLines([]); setShifts([]); setLineId(''); setShiftId('')
    if (!buildingId) return
    axios.get(`${API}/staffing/context?siteId=${siteId}&buildingId=${buildingId}`, { headers })
      .then(r => { setLines(r.data.lines || []); setShifts(r.data.shifts || []) })
      .catch(console.error)
  }, [buildingId])

  useEffect(() => {
    setWorkstations([])
    if (!lineId) return
    axios.get(`${API}/staffing/line-workstations?lineId=${lineId}`, { headers })
      .then(r => setWorkstations(r.data.data || []))
      .catch(console.error)
  }, [lineId])

  const loadRecords = useCallback(() => {
    if (!lineId) { setRecords([]); return }
    const p = new URLSearchParams({ date })
    if (buildingId) p.set('buildingId', buildingId)
    p.set('lineId', lineId)
    if (shiftId) p.set('shiftId', shiftId)
    axios.get(`${API}/staffing/records?${p}`, { headers })
      .then(r => setRecords(r.data.data || []))
      .catch(console.error)
  }, [lineId, buildingId, shiftId, date])

  useEffect(() => { loadRecords() }, [loadRecords])

  const recordsByWs = useMemo(() => {
    const m = {}
    records.forEach(r => {
      if (!m[r.WorkstationID]) m[r.WorkstationID] = []
      m[r.WorkstationID].push(r)
    })
    return m
  }, [records])

  const totalAssigned = records.length
  const certified  = records.filter(r => r.CertificationStatus === 'certified').length
  const inTraining = records.filter(r => r.OJTStatus !== 'none' && r.CertificationStatus !== 'certified').length
  const pctCert    = totalAssigned ? Math.round(certified  / totalAssigned * 100) : 0
  const pctTrain   = totalAssigned ? Math.round(inTraining / totalAssigned * 100) : 0
  const certColor  = pctCert === 100 ? '#00c896' : pctCert >= 50 ? '#f59e0b' : '#ef4444'

  const openAssign = (wsId) => {
    setAssigningRow(wsId); setSelectedEmpId(null); setFoundEmp(null); setValidation(null); setAssignError('')
  }
  const closeAssign = () => {
    setAssigningRow(null); setSelectedEmpId(null); setFoundEmp(null); setValidation(null); setAssignError('')
  }

  const handleEmpSelect = async (empId, item) => {
    setSelectedEmpId(empId); setValidation(null); setAssignError('')
    if (!empId) { setFoundEmp(null); return }
    setFoundEmp({ id: empId, name: item.label, number: item.sub })
    setValidating(true)
    try {
      const r = await axios.get(
        `${API}/staffing/validate?employeeId=${empId}&workstationId=${assigningRow}&date=${date}`,
        { headers }
      )
      setValidation(r.data)
    } catch { setAssignError('Error validating employee') }
    finally { setValidating(false) }
  }

  const handleAssign = async () => {
    if (!foundEmp || !validation) return
    setAssigning(true); setAssignError('')
    try {
      await axios.post(`${API}/staffing/records`, {
        employeeId: foundEmp.id, workstationId: assigningRow,
        buildingId: buildingId ? parseInt(buildingId, 10) : null,
        shiftId: shiftId ? parseInt(shiftId, 10) : null,
        lineId: lineId ? parseInt(lineId, 10) : null,
        date,
        certificationStatus:  validation.certificationStatus,
        certificationExpired: validation.certificationStatus === 'expired',
        ojtStatus: validation.ojtStatus, mpiStatus: validation.mpiStatus, mpiVersion: validation.mpiVersion,
      }, { headers })
      closeAssign(); loadRecords()
    } catch (err) { setAssignError(err.response?.data?.error || 'Error assigning') }
    finally { setAssigning(false) }
  }

  const handleRemove = async (recordId) => {
    setRemoving(recordId)
    try {
      await axios.delete(`${API}/staffing/records/${recordId}`, { headers })
      if (detailRec?.id === recordId) setDetailRec(null)
      loadRecords()
    } catch (err) { console.error(err) }
    finally { setRemoving(null) }
  }

  // Shared inline assign panel (used in both desktop and mobile)
  const AssignPanel = ({ wsName }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: isMobile ? undefined : '440px' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Assign employee to {wsName}
      </div>
      <SearchSelect
        value={selectedEmpId}
        onChange={handleEmpSelect}
        options={employees}
        placeholder="Search by name or number…"
        clearable={true}
      />
      {validating && <div style={{ fontSize: '12px', color: '#6b7280' }}>Validating…</div>}
      {assignError && <div style={{ fontSize: '12px', color: '#ef4444' }}>{assignError}</div>}
      {foundEmp && validation && !validating && (
        <>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{foundEmp.name}</span>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>#{foundEmp.number}</span>
            <span style={{ color: '#e5e7eb' }}>|</span>
            <Badge cfg={CERT_CFG[validation.certificationStatus] || CERT_CFG.none} />
            <Badge cfg={OJT_BADGE_CFG[validation.ojtStatus] || OJT_BADGE_CFG.none} />
            <Badge cfg={MPI_CFG[validation.mpiStatus] || MPI_CFG.none} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleAssign} disabled={assigning}
              style={{ ...btnStyle, background: '#00c896', color: '#fff', padding: isMobile ? '8px 14px' : '5px 14px', flex: isMobile ? 1 : undefined }}>
              {assigning ? 'Assigning…' : 'Assign to Workstation'}
            </button>
            <button onClick={closeAssign}
              style={{ ...btnStyle, background: '#f3f4f6', color: '#374151', padding: isMobile ? '8px 14px' : '5px 14px' }}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <Layout title="Staffing">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* TOP BAR */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '10px' : '14px',
          flexWrap: 'wrap',
          background: '#fff', padding: isMobile ? '12px' : '10px 16px',
          borderRadius: '8px', border: '1px solid #e5e7eb'
        }}>
          <ContextSelect label="Site"     value={siteId}     onChange={setSiteId}     disabled={false}       options={sites}     fullWidth={isMobile} />
          <ContextSelect label="Building" value={buildingId} onChange={setBuildingId} disabled={!siteId}     options={buildings} fullWidth={isMobile} />
          <ContextSelect label="Line"     value={lineId}     onChange={setLineId}     disabled={!buildingId} options={lines}     fullWidth={isMobile} />
          <ContextSelect label="Shift"    value={shiftId}    onChange={setShiftId}    disabled={!buildingId} options={shifts}    allLabel="All Shifts" fullWidth={isMobile} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: isMobile ? 0 : 'auto', width: isMobile ? '100%' : undefined }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', flexShrink: 0 }}>Date</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ ...selectStyle, flex: isMobile ? 1 : undefined }} />
          </div>
        </div>

        {/* KPI BAR */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: isMobile ? '12px' : '13px', flexWrap: 'wrap' }}>
          <span style={{ color: '#6b7280', fontSize: '11px' }}>Assigned:</span>
          <span style={{ fontWeight: '700', color: '#111827' }}>{totalAssigned}</span>
          <span style={{ color: '#d1d5db', margin: '0 4px' }}>|</span>
          <span style={{ color: '#6b7280', fontSize: '11px' }}>Certified:</span>
          <span style={{ fontWeight: '700', color: certColor }}>{pctCert}%</span>
          <span style={{ color: '#d1d5db', margin: '0 4px' }}>|</span>
          <span style={{ color: '#6b7280', fontSize: '11px' }}>Training:</span>
          <span style={{ fontWeight: '700', color: '#3b82f6' }}>{pctTrain}%</span>
        </div>

        {/* GRID */}
        <div style={{
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
          ...(isMobileOrTablet ? {} : { height: 'calc(100vh - 220px)', overflowY: 'auto' })
        }}>
          {!lineId ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px', color: '#9ca3af', fontSize: '14px' }}>
              Select a site, building, and line to view staffing
            </div>
          ) : isMobileOrTablet ? (
            /* ── MOBILE: card view ── */
            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {workstations.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>No workstations in this line</div>
              ) : workstations.map(ws => {
                const wsRecs     = recordsByWs[ws.id] || []
                const isAssigning = assigningRow === ws.id
                return (
                  <div key={ws.id} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                    {/* Card header */}
                    <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa', borderBottom: wsRecs.length > 0 || isAssigning ? '1px solid #f3f4f6' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.Name}</span>
                        {ws.IsCritical && (
                          <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '3px', background: '#fef2f2', color: '#ef4444', flexShrink: 0 }}>Critical</span>
                        )}
                      </div>
                      <button
                        onClick={() => isAssigning ? closeAssign() : openAssign(ws.id)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: isAssigning ? '#f3f4f6' : '#00c896', color: isAssigning ? '#6b7280' : '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0, marginLeft: '8px' }}
                      >
                        {isAssigning ? 'Cancel' : '+ Assign'}
                      </button>
                    </div>

                    {/* Empty state */}
                    {wsRecs.length === 0 && !isAssigning && (
                      <div style={{ padding: '10px 14px' }}>
                        <span style={{ color: '#d1d5db', fontStyle: 'italic', fontSize: '12px' }}>— Unassigned —</span>
                      </div>
                    )}

                    {/* Employee rows */}
                    {wsRecs.map(rec => {
                      const hasIssue = rec.CertificationStatus !== 'certified' || rec.MpiStatus === 'outdated'
                      return (
                        <div
                          key={rec.id}
                          onClick={() => setDetailRec(rec)}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '1px solid #f9fafb', background: hasIssue ? '#fffbeb' : '#fff', cursor: 'pointer' }}
                        >
                          <PhotoCircle empId={rec.EmployeeID} name={rec.EmployeeName} size={30} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {rec.EmployeeName}
                              {rec.IsTrainer && (
                                <span style={{ marginLeft: '5px', fontSize: '10px', fontWeight: '700', padding: '1px 5px', borderRadius: '3px', background: '#eff6ff', color: '#3b82f6' }}>Trainer</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                              <Badge cfg={CERT_CFG[rec.CertificationStatus] || CERT_CFG.none} />
                              <Badge cfg={OJT_BADGE_CFG[rec.OJTStatus] || OJT_BADGE_CFG.none} />
                              {rec.MpiStatus && rec.MpiStatus !== 'none' && <Badge cfg={MPI_CFG[rec.MpiStatus] || MPI_CFG.none} />}
                            </div>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); handleRemove(rec.id) }}
                            disabled={removing === rec.id}
                            style={{ background: 'none', border: 'none', cursor: removing === rec.id ? 'wait' : 'pointer', color: '#9ca3af', fontSize: '20px', padding: '4px 6px', flexShrink: 0, lineHeight: 1 }}
                          >×</button>
                        </div>
                      )
                    })}

                    {/* Inline assign panel */}
                    {isAssigning && (
                      <div style={{ padding: '12px 14px', background: '#f0f9ff', borderTop: '1px solid #bae6fd' }}>
                        <AssignPanel wsName={ws.Name} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* ── DESKTOP: table view ── */
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr>
                  {['Workstation', 'Employee', 'Cert', 'OJT', 'MPI', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workstations.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>No workstations in this line</td></tr>
                ) : workstations.map(ws => {
                  const wsRecs     = recordsByWs[ws.id] || []
                  const isAssigning = assigningRow === ws.id
                  const rows       = wsRecs.length > 0 ? wsRecs : [null]

                  return (
                    <Fragment key={ws.id}>
                      {rows.map((rec, idx) => {
                        const isFirst   = idx === 0
                        const isLast    = idx === rows.length - 1
                        const hasIssue  = rec && (rec.CertificationStatus !== 'certified' || rec.MpiStatus === 'outdated')
                        const rowBg     = (isAssigning && isLast) ? '#f0f9ff' : (hasIssue ? '#fffbeb' : '#fff')
                        const bBottom   = isLast ? '1px solid #d1d5db' : '1px solid #f3f4f6'
                        const td        = { padding: '8px 12px', borderBottom: bBottom, fontSize: '13px', verticalAlign: 'middle' }

                        return (
                          <tr key={rec ? rec.id : `${ws.id}-empty`} style={{ background: rowBg }}>
                            <td style={{ ...td, fontWeight: '600', color: '#111827', whiteSpace: 'nowrap' }}>
                              {isFirst ? (
                                <>
                                  {ws.Name}
                                  {ws.IsCritical && (
                                    <span style={{ fontSize: '10px', fontWeight: '700', marginLeft: '6px', padding: '1px 6px', borderRadius: '3px', background: '#fef2f2', color: '#ef4444' }}>
                                      Critical
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span style={{ display: 'block', width: '10px', borderLeft: '2px solid #e5e7eb', height: '100%' }} />
                              )}
                            </td>

                            <td style={td}>
                              {rec ? (
                                <div
                                  onClick={() => setDetailRec(rec)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}
                                >
                                  <PhotoCircle empId={rec.EmployeeID} name={rec.EmployeeName} size={26} />
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', lineHeight: 1.2 }}>{rec.EmployeeName}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ fontSize: '11px', color: '#6b7280' }}>{rec.EmployeeNumber}</span>
                                      {rec.IsTrainer && (
                                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 5px', borderRadius: '3px', background: '#eff6ff', color: '#3b82f6' }}>
                                          Trainer
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: '#d1d5db', fontStyle: 'italic', fontSize: '12px' }}>— Unassigned —</span>
                              )}
                            </td>

                            <td style={td}>
                              {rec ? <Badge cfg={CERT_CFG[rec.CertificationStatus] || CERT_CFG.none} /> : <span style={{ color: '#e5e7eb' }}>—</span>}
                            </td>
                            <td style={td}>
                              {rec ? <Badge cfg={OJT_BADGE_CFG[rec.OJTStatus] || OJT_BADGE_CFG.none} /> : <span style={{ color: '#e5e7eb' }}>—</span>}
                            </td>
                            <td style={td}>
                              {rec ? <Badge cfg={MPI_CFG[rec.MpiStatus] || MPI_CFG.none} /> : <span style={{ color: '#e5e7eb' }}>—</span>}
                            </td>

                            <td style={{ ...td, whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {rec && (
                                  <button
                                    onClick={() => handleRemove(rec.id)}
                                    disabled={removing === rec.id}
                                    title="Remove"
                                    style={{ background: 'none', border: 'none', cursor: removing === rec.id ? 'wait' : 'pointer', color: '#9ca3af', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}
                                    onMouseEnter={e => { if (removing !== rec.id) e.currentTarget.style.color = '#ef4444' }}
                                    onMouseLeave={e => { if (removing !== rec.id) e.currentTarget.style.color = '#9ca3af' }}
                                  >×</button>
                                )}
                                {isLast && (
                                  <button
                                    onClick={() => isAssigning ? closeAssign() : openAssign(ws.id)}
                                    style={{ ...btnStyle, background: isAssigning ? '#f3f4f6' : '#00c896', color: isAssigning ? '#6b7280' : '#fff' }}
                                  >
                                    {isAssigning ? 'Cancel' : '+ Assign'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}

                      {isAssigning && (
                        <tr>
                          <td colSpan={6} style={{ background: '#f0f9ff', padding: '10px 16px 14px', borderBottom: '2px solid #bae6fd' }}>
                            <AssignPanel wsName={ws.Name} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* EMPLOYEE DETAIL PANEL */}
      {detailRec && (
        <div style={{
          position: 'fixed',
          top: '56px',
          right: 0,
          bottom: isMobileOrTablet ? '60px' : 0,
          width: isMobileOrTablet ? '100%' : '300px',
          background: '#fff', borderLeft: '1px solid #e5e7eb',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
          zIndex: 40, display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>Employee Detail</span>
            <button
              onClick={() => setDetailRec(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#9ca3af', lineHeight: 1, padding: '2px 4px' }}
              onMouseEnter={e => e.currentTarget.style.color = '#374151'}
              onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
            >×</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f3f4f6' }}>
              <PhotoCircle empId={detailRec.EmployeeID} name={detailRec.EmployeeName} size={80} />
              <div style={{ marginTop: '12px', fontWeight: '700', fontSize: '15px', color: '#111827', textAlign: 'center' }}>{detailRec.EmployeeName}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>#{detailRec.EmployeeNumber}</div>
            </div>

            <PanelRow label="Workstation">
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{detailRec.WorkstationName}</span>
            </PanelRow>
            <PanelRow label="Certification">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge cfg={CERT_CFG[detailRec.CertificationStatus] || CERT_CFG.none} />
                {detailRec.CertificationStatus === 'expired' && <span style={{ fontSize: '11px', color: '#ef4444' }}>Renewal required</span>}
              </div>
            </PanelRow>
            <PanelRow label="OJT Level">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge cfg={OJT_BADGE_CFG[detailRec.OJTStatus] || OJT_BADGE_CFG.none} />
                {detailRec.OJTStatus !== 'none' && <span style={{ fontSize: '11px', color: '#6b7280' }}>{OJT_CFG[detailRec.OJTStatus]?.label}</span>}
              </div>
            </PanelRow>
            <PanelRow label="MPI Status">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge cfg={MPI_CFG[detailRec.MpiStatus] || MPI_CFG.none} />
                {detailRec.MpiVersion && <span style={{ fontSize: '11px', color: '#6b7280' }}>v{detailRec.MpiVersion}</span>}
              </div>
            </PanelRow>
          </div>

          <div style={{ padding: '14px 16px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
            <button
              onClick={() => handleRemove(detailRec.id)}
              disabled={removing === detailRec.id}
              style={{ width: '100%', padding: '8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontWeight: '600', cursor: removing === detailRec.id ? 'wait' : 'pointer', fontSize: '13px' }}
            >
              {removing === detailRec.id ? 'Removing…' : 'Remove from Workstation'}
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}

function PanelRow({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>{label}</span>
      <div>{children}</div>
    </div>
  )
}

function ContextSelect({ label, value, onChange, disabled, options, allLabel, fullWidth }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: fullWidth ? '100%' : undefined }}>
      <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{ ...selectStyle, flex: fullWidth ? 1 : undefined, opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <option value="">{allLabel || '— Select —'}</option>
        {options.map(o => { const oid = o.id ?? o.ID; return <option key={oid} value={oid}>{o.Name || o.name}</option> })}
      </select>
    </div>
  )
}
