import { Fragment, useState, useEffect, useCallback, useMemo } from 'react'
import Layout from '../components/Layout'
import SearchSelect from '../components/SearchSelect'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = 'http://localhost:3000/api'
const today = new Date().toISOString().split('T')[0]

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

// Photo circle — falls back to initials on 404
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
  const headers = { Authorization: `Bearer ${token}` }

  // Context dropdowns
  const [sites, setSites]           = useState([])
  const [buildings, setBuildings]   = useState([])
  const [lines, setLines]           = useState([])
  const [shifts, setShifts]         = useState([])
  const [siteId, setSiteId]         = useState('')
  const [buildingId, setBuildingId] = useState('')
  const [lineId, setLineId]         = useState('')
  const [shiftId, setShiftId]       = useState('')
  const [date, setDate]             = useState(today)

  // Grid data
  const [workstations, setWorkstations] = useState([])
  const [records, setRecords]           = useState([])
  const [employees, setEmployees]       = useState([])

  // Assign flow
  const [assigningRow, setAssigningRow]   = useState(null)
  const [selectedEmpId, setSelectedEmpId] = useState(null)
  const [foundEmp, setFoundEmp]           = useState(null)
  const [validation, setValidation]       = useState(null)
  const [validating, setValidating]       = useState(false)
  const [assigning, setAssigning]         = useState(false)
  const [assignError, setAssignError]     = useState('')

  // Remove + detail panel
  const [removing, setRemoving]   = useState(null)
  const [detailRec, setDetailRec] = useState(null)

  // Load employees for SearchSelect
  useEffect(() => {
    axios.get(`${API}/employees?limit=2000&active=true`, { headers })
      .then(r => setEmployees((r.data.data || []).map(e => ({ id: e.id, label: e.Name, sub: e.Number }))))
      .catch(console.error)
  }, [])

  // Load sites
  useEffect(() => {
    axios.get(`${API}/staffing/context`, { headers })
      .then(r => setSites(r.data.sites || []))
      .catch(console.error)
  }, [])

  // site → buildings
  useEffect(() => {
    setBuildings([]); setBuildingId(''); setLines([]); setShifts([]); setLineId(''); setShiftId('')
    if (!siteId) return
    axios.get(`${API}/staffing/context?siteId=${siteId}`, { headers })
      .then(r => setBuildings(r.data.buildings || []))
      .catch(console.error)
  }, [siteId])

  // building → lines + shifts
  useEffect(() => {
    setLines([]); setShifts([]); setLineId(''); setShiftId('')
    if (!buildingId) return
    axios.get(`${API}/staffing/context?siteId=${siteId}&buildingId=${buildingId}`, { headers })
      .then(r => { setLines(r.data.lines || []); setShifts(r.data.shifts || []) })
      .catch(console.error)
  }, [buildingId])

  // line → workstations
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

  // KPI
  const totalAssigned = records.length
  const certified  = records.filter(r => r.CertificationStatus === 'certified').length
  const inTraining = records.filter(r => r.OJTStatus !== 'none' && r.CertificationStatus !== 'certified').length
  const pctCert  = totalAssigned ? Math.round(certified  / totalAssigned * 100) : 0
  const pctTrain = totalAssigned ? Math.round(inTraining / totalAssigned * 100) : 0
  const certColor = pctCert === 100 ? '#00c896' : pctCert >= 50 ? '#f59e0b' : '#ef4444'

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

  return (
    <Layout title="Staffing">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* TOP BAR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', background: '#fff', padding: '10px 16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <ContextSelect label="Site"     value={siteId}     onChange={setSiteId}     disabled={false}       options={sites} />
          <ContextSelect label="Building" value={buildingId} onChange={setBuildingId} disabled={!siteId}     options={buildings} />
          <ContextSelect label="Line"     value={lineId}     onChange={setLineId}     disabled={!buildingId} options={lines} />
          <ContextSelect label="Shift"    value={shiftId}    onChange={setShiftId}    disabled={!buildingId} options={shifts} allLabel="All Shifts" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Date</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={selectStyle} />
          </div>
        </div>

        {/* KPI BAR */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <span style={{ color: '#6b7280', fontSize: '12px' }}>Total Assigned:</span>
          <span style={{ fontWeight: '700', color: '#111827' }}>{totalAssigned}</span>
          <span style={{ color: '#d1d5db', margin: '0 6px' }}>|</span>
          <span style={{ color: '#6b7280', fontSize: '12px' }}>% Certified:</span>
          <span style={{ fontWeight: '700', color: certColor }}>{pctCert}%</span>
          <span style={{ color: '#d1d5db', margin: '0 6px' }}>|</span>
          <span style={{ color: '#6b7280', fontSize: '12px' }}>% In Training:</span>
          <span style={{ fontWeight: '700', color: '#3b82f6' }}>{pctTrain}%</span>
        </div>

        {/* GRID */}
        <div style={{ height: 'calc(100vh - 220px)', overflowY: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          {!lineId ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px', color: '#9ca3af', fontSize: '14px' }}>
              Select a site, building, and line to view staffing
            </div>
          ) : (
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
                  // One display row per employee, or one empty placeholder
                  const rows       = wsRecs.length > 0 ? wsRecs : [null]

                  return (
                    <Fragment key={ws.id}>
                      {rows.map((rec, idx) => {
                        const isFirst   = idx === 0
                        const isLast    = idx === rows.length - 1
                        const hasIssue  = rec && (rec.CertificationStatus !== 'certified' || rec.MpiStatus === 'outdated')
                        const rowBg     = (isAssigning && isLast) ? '#f0f9ff' : (hasIssue ? '#fffbeb' : '#fff')
                        // Stronger border after the last row of each workstation group
                        const bBottom   = isLast ? '1px solid #d1d5db' : '1px solid #f3f4f6'
                        const td        = { padding: '8px 12px', borderBottom: bBottom, fontSize: '13px', verticalAlign: 'middle' }

                        return (
                          <tr key={rec ? rec.id : `${ws.id}-empty`} style={{ background: rowBg }}>

                            {/* Workstation — only first row of each group */}
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
                                // Subtle indent for continuation rows
                                <span style={{ display: 'block', width: '10px', borderLeft: '2px solid #e5e7eb', height: '100%' }} />
                              )}
                            </td>

                            {/* Employee */}
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

                            {/* Per-employee status badges */}
                            <td style={td}>
                              {rec ? <Badge cfg={CERT_CFG[rec.CertificationStatus] || CERT_CFG.none} /> : <span style={{ color: '#e5e7eb' }}>—</span>}
                            </td>
                            <td style={td}>
                              {rec ? <Badge cfg={OJT_BADGE_CFG[rec.OJTStatus] || OJT_BADGE_CFG.none} /> : <span style={{ color: '#e5e7eb' }}>—</span>}
                            </td>
                            <td style={td}>
                              {rec ? <Badge cfg={MPI_CFG[rec.MpiStatus] || MPI_CFG.none} /> : <span style={{ color: '#e5e7eb' }}>—</span>}
                            </td>

                            {/* Actions: × on every employee row; + Assign on last row only */}
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
                                  >
                                    ×
                                  </button>
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

                      {/* Inline assign panel — after all employee rows */}
                      {isAssigning && (
                        <tr>
                          <td colSpan={6} style={{ background: '#f0f9ff', padding: '10px 16px 14px', borderBottom: '2px solid #bae6fd' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '440px' }}>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Assign employee to {ws.Name}
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
                                    <span style={{ fontSize: '11px', color: '#6b7280' }}>Cert</span>
                                    <Badge cfg={CERT_CFG[validation.certificationStatus] || CERT_CFG.none} />
                                    <span style={{ fontSize: '11px', color: '#6b7280' }}>OJT</span>
                                    <Badge cfg={OJT_BADGE_CFG[validation.ojtStatus] || OJT_BADGE_CFG.none} />
                                    <span style={{ fontSize: '11px', color: '#6b7280' }}>MPI</span>
                                    <Badge cfg={MPI_CFG[validation.mpiStatus] || MPI_CFG.none} />
                                    {validation.mpiVersion && <span style={{ fontSize: '11px', color: '#9ca3af' }}>v{validation.mpiVersion}</span>}
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={handleAssign} disabled={assigning}
                                      style={{ ...btnStyle, background: '#00c896', color: '#fff', padding: '5px 14px' }}>
                                      {assigning ? 'Assigning…' : 'Assign to Workstation'}
                                    </button>
                                    <button onClick={closeAssign}
                                      style={{ ...btnStyle, background: '#f3f4f6', color: '#374151', padding: '5px 14px' }}>
                                      Cancel
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
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
        <div
          style={{
            position: 'fixed', top: '56px', right: 0, bottom: 0, width: '300px',
            background: '#fff', borderLeft: '1px solid #e5e7eb',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
            zIndex: 40, display: 'flex', flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>Employee Detail</span>
            <button
              onClick={() => setDetailRec(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#9ca3af', lineHeight: 1, padding: '2px 4px' }}
              onMouseEnter={e => e.currentTarget.style.color = '#374151'}
              onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
            {/* Avatar + name */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f3f4f6' }}>
              <PhotoCircle empId={detailRec.EmployeeID} name={detailRec.EmployeeName} size={80} />
              <div style={{ marginTop: '12px', fontWeight: '700', fontSize: '15px', color: '#111827', textAlign: 'center' }}>
                {detailRec.EmployeeName}
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>#{detailRec.EmployeeNumber}</div>
            </div>

            {/* Workstation */}
            <PanelRow label="Workstation">
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{detailRec.WorkstationName}</span>
            </PanelRow>

            {/* Certification */}
            <PanelRow label="Certification">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge cfg={CERT_CFG[detailRec.CertificationStatus] || CERT_CFG.none} />
                {detailRec.CertificationStatus === 'expired' && (
                  <span style={{ fontSize: '11px', color: '#ef4444' }}>Renewal required</span>
                )}
                {detailRec.CertificationStatus === 'none' && (
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Not certified</span>
                )}
              </div>
            </PanelRow>

            {/* OJT */}
            <PanelRow label="OJT Level">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge cfg={OJT_BADGE_CFG[detailRec.OJTStatus] || OJT_BADGE_CFG.none} />
                {detailRec.OJTStatus !== 'none' && (
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>
                    {OJT_CFG[detailRec.OJTStatus]?.label}
                  </span>
                )}
              </div>
            </PanelRow>

            {/* MPI */}
            <PanelRow label="MPI Status">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge cfg={MPI_CFG[detailRec.MpiStatus] || MPI_CFG.none} />
                {detailRec.MpiVersion && (
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>v{detailRec.MpiVersion}</span>
                )}
                {detailRec.MpiStatus === 'outdated' && (
                  <span style={{ fontSize: '11px', color: '#f59e0b' }}>Outdated</span>
                )}
              </div>
            </PanelRow>
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
            <button
              onClick={() => handleRemove(detailRec.id)}
              disabled={removing === detailRec.id}
              style={{
                width: '100%', padding: '8px', background: '#fef2f2',
                color: '#ef4444', border: '1px solid #fecaca',
                borderRadius: '6px', fontWeight: '600', cursor: removing === detailRec.id ? 'wait' : 'pointer',
                fontSize: '13px'
              }}
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

function ContextSelect({ label, value, onChange, disabled, options, allLabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{ ...selectStyle, opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <option value="">{allLabel || '— Select —'}</option>
        {options.map(o => { const oid = o.id ?? o.ID; return <option key={oid} value={oid}>{o.Name || o.name}</option> })}
      </select>
    </div>
  )
}
