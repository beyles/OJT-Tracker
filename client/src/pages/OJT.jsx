import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import SearchSelect from '../components/SearchSelect'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import useBreakpoint from '../hooks/useBreakpoint'

const ILUO_THRESHOLDS = [
  { max: 25,  level: 'I', color: '#6b7280' },
  { max: 50,  level: 'L', color: '#f59e0b' },
  { max: 75,  level: 'U', color: '#3b82f6' },
  { max: 99,  level: 'O', color: '#8b5cf6' },
  { max: 100, level: '✓', color: '#00c896' },
]

function getILUO(progress) {
  const p = parseFloat(progress)
  if (isNaN(p) || progress === '') return null
  return ILUO_THRESHOLDS.find(t => p <= t.max) || ILUO_THRESHOLDS[ILUO_THRESHOLDS.length - 1]
}

const today = new Date().toISOString().split('T')[0]

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }
const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb',
  borderRadius: '6px', fontSize: '14px', color: '#111827',
  outline: 'none', boxSizing: 'border-box', background: '#f9fafb'
}

const EMPTY_FORM = { employeeId: null, workstationId: null, progress: '', trainingHours: '', notes: '' }

export default function OJT() {
  const { user } = useAuth()
  const { isMobileOrTablet } = useBreakpoint()
  const [date, setDate] = useState(today)
  const [view, setView] = useState('mine')
  const [events, setEvents] = useState([])
  const [employees, setEmployees] = useState([])
  const [workstations, setWorkstations] = useState([])
  const [saving, setSaving] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    axios.get('http://localhost:3000/api/employees?limit=2000&active=true').then(r => {
      setEmployees((r.data.data || []).map(e => ({ id: e.id, label: e.Name, sub: e.Number })))
    }).catch(() => {})

    axios.get('http://localhost:3000/api/training/workstations/all').then(r => {
      setWorkstations((r.data.data || []).map(w => ({ id: w.id, label: w.Name })))
    }).catch(() => {})
  }, [])

  const loadEvents = () => {
    if (!user?.id) return
    const trainerParam = view === 'mine' ? `&trainerEmployeeId=${user.id}` : ''
    axios.get(`http://localhost:3000/api/ojt/events?date=${date}${trainerParam}`)
      .then(r => setEvents(r.data.data || []))
      .catch(() => {})
  }

  useEffect(() => { loadEvents() }, [date, view, user?.id])

  const openNew = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setPanelOpen(true)
  }

  const openEdit = (ev) => {
    setForm({
      employeeId: ev.EmployeeId,
      workstationId: ev.WorkstationId,
      progress: String(ev.Progress),
      trainingHours: String(ev.Hours),
      notes: ev.Comment || '',
    })
    setEditingId(ev.id)
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleDelete = async (eventId) => {
    try {
      await axios.delete(`http://localhost:3000/api/ojt/events/${eventId}?trainerId=${user.id}`)
      loadEvents()
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete event')
    }
  }

  const iluo = getILUO(form.progress)
  const canSave = form.employeeId && form.workstationId && form.progress !== '' && form.trainingHours !== '' && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const payload = {
        trainerId: user.id,
        employeeId: form.employeeId,
        workstationId: form.workstationId,
        progress: parseFloat(form.progress),
        trainingHours: parseFloat(form.trainingHours),
        notes: form.notes || null,
      }
      if (editingId) {
        await axios.put(`http://localhost:3000/api/ojt/events/${editingId}`, payload)
      } else {
        await axios.post('http://localhost:3000/api/ojt/events', { ...payload, date })
      }
      closePanel()
      loadEvents()
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to save event')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="OJT" subtitle="On-the-Job Training log">
      <div style={{ display: 'flex', flexDirection: isMobileOrTablet ? 'column' : 'row', gap: '24px', height: isMobileOrTablet ? 'auto' : 'calc(100vh - 56px - 56px)', minHeight: 0 }}>

        {/* ── LEFT PANEL ───────────────────────────────────── */}
        <div style={{
          width: isMobileOrTablet ? '100%' : (panelOpen ? '320px' : '100%'),
          flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: '14px', minHeight: 0,
          transition: 'width 0.2s'
        }}>
          {/* Date picker */}
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '10px' }}>Date</div>
            <input
              type="date"
              value={date}
              max={today}
              onChange={e => setDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* My Events / All Trainers toggle */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '8px', padding: '3px', gap: '2px' }}>
            {[['mine', 'My Events'], ['all', 'All Trainers']].map(([key, lbl]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                style={{
                  flex: 1, padding: '6px 0', fontSize: '13px', fontWeight: '600',
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                  background: view === key ? '#fff' : 'transparent',
                  color: view === key ? '#111827' : '#6b7280',
                  boxShadow: view === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* + Log OJT Event button */}
          <button
            onClick={openNew}
            style={{
              width: '100%', padding: '10px 0',
              background: '#00c896', color: '#fff',
              border: 'none', borderRadius: '8px',
              fontWeight: '700', fontSize: '14px',
              cursor: 'pointer', letterSpacing: '0.01em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Log OJT Event
          </button>

          {/* Events list */}
          <div style={{ flex: isMobileOrTablet ? 'none' : 1, maxHeight: isMobileOrTablet ? '45vh' : undefined, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {events.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', paddingTop: '40px' }}>
                No events logged for this date.
              </div>
            ) : events.map(ev => {
              const evIluo = getILUO(ev.Progress) || ILUO_THRESHOLDS[0]
              const isOwn = String(ev.TrainerId) === String(user?.id)
              return (
                <div
                  key={ev.id}
                  onClick={() => isOwn && openEdit(ev)}
                  style={{
                    background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
                    padding: '12px 14px',
                    cursor: isOwn ? 'pointer' : 'default',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { if (isOwn) { e.currentTarget.style.borderColor = '#00c896'; e.currentTarget.style.boxShadow = '0 0 0 2px #00c89622' } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{ev.EmployeeName}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{
                        background: evIluo.color + '22', color: evIluo.color,
                        padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '700'
                      }}>{evIluo.level}</span>
                      {isOwn && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(ev.id) }}
                          title="Delete event"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#d1d5db', fontSize: '14px', padding: '2px 4px',
                            borderRadius: '4px', lineHeight: 1
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
                        >✕</button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>{ev.WorkstationName}</div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '12px', color: '#374151',
                    marginBottom: ev.Comment ? '6px' : '0'
                  }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ fontWeight: '600' }}>{ev.Progress}%</span>
                      <span>{ev.Hours}h</span>
                    </div>
                    {view === 'all' && (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>{ev.TrainerName}</span>
                    )}
                  </div>
                  {ev.Comment && (
                    <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic', borderTop: '1px solid #f3f4f6', paddingTop: '6px' }}>
                      {ev.Comment}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── RIGHT PANEL (form) ────────────────────────────── */}
        {panelOpen && (
          <div style={{
            flex: 1, background: '#fff', border: '1px solid #e5e7eb',
            borderRadius: '10px', padding: isMobileOrTablet ? '20px 16px' : '28px', overflowY: 'auto'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>
                {editingId ? 'Edit OJT Event' : 'Log OJT Event'}
              </div>
              <button
                onClick={closePanel}
                style={{
                  background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px',
                  padding: '4px 12px', fontSize: '13px', color: '#6b7280',
                  cursor: 'pointer', fontWeight: '500'
                }}
              >
                Cancel
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '500px' }}>
              {/* Employee */}
              <div>
                <label style={labelStyle}>Employee</label>
                <SearchSelect
                  value={form.employeeId}
                  onChange={id => setForm(f => ({ ...f, employeeId: id }))}
                  options={employees}
                  placeholder="Search employees..."
                />
              </div>

              {/* Workstation */}
              <div>
                <label style={labelStyle}>Workstation</label>
                <SearchSelect
                  value={form.workstationId}
                  onChange={id => setForm(f => ({ ...f, workstationId: id }))}
                  options={workstations}
                  placeholder="Search workstations..."
                />
              </div>

              {/* Progress + live ILUO badge */}
              <div>
                <label style={labelStyle}>Progress (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.progress}
                    onChange={e => setForm(f => ({ ...f, progress: e.target.value }))}
                    placeholder="0 – 100"
                    style={{ ...inputStyle, width: '140px' }}
                  />
                  {iluo && (
                    <div style={{
                      padding: '6px 16px', borderRadius: '6px', fontWeight: '700', fontSize: '16px',
                      background: iluo.color + '22', color: iluo.color,
                      border: `1px solid ${iluo.color}44`,
                      minWidth: '52px', textAlign: 'center', flexShrink: 0,
                      transition: 'all 0.15s'
                    }}>
                      {iluo.level}
                    </div>
                  )}
                  {iluo && (
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                      {iluo.level === 'I' && '0 – 25%'}
                      {iluo.level === 'L' && '26 – 50%'}
                      {iluo.level === 'U' && '51 – 75%'}
                      {iluo.level === 'O' && '76 – 99%'}
                      {iluo.level === '✓' && '100% — Certified'}
                    </div>
                  )}
                </div>
              </div>

              {/* Training Hours */}
              <div>
                <label style={labelStyle}>Training Hours</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.trainingHours}
                  onChange={e => setForm(f => ({ ...f, trainingHours: e.target.value }))}
                  placeholder="e.g. 2.5"
                  style={{ ...inputStyle, width: '140px' }}
                />
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>
                  Notes&nbsp;<span style={{ fontWeight: '400', color: '#9ca3af' }}>(optional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any additional observations..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  style={{
                    padding: '10px 28px',
                    background: canSave ? '#00c896' : '#e5e7eb',
                    color: canSave ? '#fff' : '#9ca3af',
                    border: 'none', borderRadius: '6px',
                    fontWeight: '600', fontSize: '14px',
                    cursor: canSave ? 'pointer' : 'not-allowed',
                    transition: 'background 0.15s'
                  }}
                >
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Log Event'}
                </button>
                <button
                  onClick={closePanel}
                  style={{
                    padding: '10px 20px',
                    background: 'none', border: '1px solid #e5e7eb',
                    borderRadius: '6px', fontWeight: '600', fontSize: '14px',
                    color: '#6b7280', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
