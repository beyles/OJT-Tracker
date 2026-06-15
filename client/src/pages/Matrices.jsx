import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api'

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
  borderRadius: '6px', fontSize: '13px', outline: 'none',
  boxSizing: 'border-box', background: '#f9fafb', color: '#111827'
}
const selectStyle = {
  padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '6px',
  fontSize: '13px', outline: 'none', background: '#f9fafb', color: '#111827',
  cursor: 'pointer'
}
const btnPrimary = {
  padding: '8px 16px', background: '#00c896', border: 'none',
  borderRadius: '6px', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer'
}
const btnGhost = {
  padding: '8px 14px', background: '#f3f4f6', border: 'none',
  borderRadius: '6px', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer'
}
const btnDanger = {
  padding: '8px 14px', background: '#fef2f2', border: '1px solid #fecaca',
  borderRadius: '6px', color: '#ef4444', fontWeight: '600', fontSize: '13px', cursor: 'pointer'
}
const sectionLabel = {
  fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em',
  textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px', display: 'block'
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function LeftPanel({ title, count, onNew, showNewForm, newFormContent, loading, children }) {
  return (
    <div style={{
      width: '280px', flexShrink: 0, background: '#fff',
      border: '1px solid #e5e7eb', borderRadius: '8px',
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0
      }}>
        <span style={{ flex: 1, fontWeight: '700', fontSize: '14px', color: '#111827' }}>
          {title}{' '}
          <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '400' }}>({count})</span>
        </span>
        <button onClick={onNew} style={{ ...btnPrimary, padding: '5px 11px', fontSize: '12px' }}>
          + New
        </button>
      </div>
      {showNewForm && newFormContent}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading
          ? <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Loading…</div>
          : children}
      </div>
    </div>
  )
}

function ListItem({ label, sub, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '8px 12px', cursor: 'pointer',
        borderBottom: '1px solid #f3f4f6',
        background: active ? '#e6faf5' : 'transparent',
        borderLeft: active ? '3px solid #00c896' : '3px solid transparent'
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{label}</div>
      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{sub}</div>
    </div>
  )
}

function TwoColumnDetail({ topContent, leftTitle, leftContent, rightTitle, rightHeaderExtra, rightContent }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        {topContent}
      </div>
      <div style={{ flex: 1, display: 'flex', gap: '16px', padding: '12px 16px 14px', overflow: 'hidden' }}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          border: '1px solid #e5e7eb', borderRadius: '8px',
          background: '#fafafa', overflow: 'hidden'
        }}>
          <div style={{ padding: '11px 14px', borderBottom: '1px solid #e5e7eb', flexShrink: 0, background: '#fff' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>{leftTitle}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>{leftContent}</div>
        </div>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          border: '1px solid #e5e7eb', borderRadius: '8px',
          background: '#fafafa', overflow: 'hidden'
        }}>
          <div style={{ padding: '11px 14px', borderBottom: '1px solid #e5e7eb', flexShrink: 0, background: '#fff' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>{rightTitle}</span>
          </div>
          {rightHeaderExtra}
          <div style={{ flex: 1, overflowY: 'auto' }}>{rightContent}</div>
        </div>
      </div>
    </div>
  )
}

function NameDeleteTop({ nameInput, onNameChange, onNameKeyDown, onSave, savingName, nameDirty, nameError, deleteConfirm, onDeleteRequest, onDeleteConfirm, deleting, onDeleteCancel, itemName }) {
  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        <label style={sectionLabel}>Name</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={nameInput} onChange={onNameChange} onKeyDown={onNameKeyDown} style={{ ...inputStyle, flex: 1 }} />
          <button
            onClick={onSave}
            disabled={savingName || !nameDirty}
            style={{ ...btnPrimary, opacity: (savingName || !nameDirty) ? 0.5 : 1, flexShrink: 0 }}
          >
            {savingName ? 'Saving…' : 'Save'}
          </button>
        </div>
        {nameError && <div style={{ marginTop: '6px', fontSize: '12px', color: '#ef4444' }}>{nameError}</div>}
      </div>
      <div>
        {!deleteConfirm ? (
          <button onClick={onDeleteRequest} style={btnDanger}>Delete</button>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px',
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px 14px'
          }}>
            <span style={{ fontSize: '13px', color: '#374151', flex: 1, minWidth: '160px' }}>
              Delete "{itemName}"? This cannot be undone.
            </span>
            <button onClick={onDeleteConfirm} disabled={deleting} style={{ ...btnDanger, padding: '6px 12px', fontSize: '12px' }}>
              {deleting ? 'Deleting…' : 'Yes, Delete'}
            </button>
            <button onClick={onDeleteCancel} style={{ ...btnGhost, padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
          </div>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Matrices() {
  const { token } = useAuth()
  const headers = { Authorization: `Bearer ${token}` }

  // ── Tab ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('matrices')

  // ── Matrices tab ──────────────────────────────────────────────────────────
  const [matrices, setMatrices]               = useState([])
  const [loadingMatrices, setLoadingMatrices] = useState(false)
  const [selectedId, setSelectedId]           = useState(null)
  const [detail, setDetail]                   = useState(null)
  const [loadingDetail, setLoadingDetail]     = useState(false)
  const [nameInput, setNameInput]             = useState('')
  const [nameError, setNameError]             = useState('')
  const [savingName, setSavingName]           = useState(false)
  const [showNewForm, setShowNewForm]         = useState(false)
  const [newName, setNewName]                 = useState('')
  const [createError, setCreateError]         = useState('')
  const [creating, setCreating]               = useState(false)
  const [deleteConfirm, setDeleteConfirm]     = useState(false)
  const [deleting, setDeleting]               = useState(false)
  const [allMpis, setAllMpis]                 = useState([])
  const [docSearch, setDocSearch]             = useState('')

  // ── Groups tab ────────────────────────────────────────────────────────────
  const [groups, setGroups]                       = useState([])
  const [loadingGroups, setLoadingGroups]         = useState(false)
  const [selectedGroupId, setSelectedGroupId]     = useState(null)
  const [groupDetail, setGroupDetail]             = useState(null)
  const [loadingGroupDetail, setLoadingGroupDetail] = useState(false)
  const [groupNameInput, setGroupNameInput]       = useState('')
  const [groupNameError, setGroupNameError]       = useState('')
  const [savingGroupName, setSavingGroupName]     = useState(false)
  const [showNewGroupForm, setShowNewGroupForm]   = useState(false)
  const [newGroupName, setNewGroupName]           = useState('')
  const [createGroupError, setCreateGroupError]   = useState('')
  const [creatingGroup, setCreatingGroup]         = useState(false)
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState(false)
  const [deletingGroup, setDeletingGroup]         = useState(false)
  const [empSearch, setEmpSearch]                 = useState('')
  const [empResults, setEmpResults]               = useState([])
  const [searchingEmps, setSearchingEmps]         = useState(false)

  // ── Report tab ────────────────────────────────────────────────────────────
  const [reportMatrixId, setReportMatrixId] = useState('')
  const [reportGroupId, setReportGroupId]   = useState('')
  const [reportData, setReportData]         = useState(null)
  const [reportLoading, setReportLoading]   = useState(false)

  // ── Data loaders ───────────────────────────────────────────────────────────

  const loadMatrices = async () => {
    setLoadingMatrices(true)
    try {
      const r = await axios.get(`${API}/matrices`, { headers })
      setMatrices(r.data.data || [])
    } catch (err) { console.error(err) }
    finally { setLoadingMatrices(false) }
  }

  const loadGroups = async () => {
    setLoadingGroups(true)
    try {
      const r = await axios.get(`${API}/matrices/groups`, { headers })
      setGroups(r.data.data || [])
    } catch (err) { console.error(err) }
    finally { setLoadingGroups(false) }
  }

  const loadDetail = async (id) => {
    setLoadingDetail(true)
    setDetail(null)
    try {
      const r = await axios.get(`${API}/matrices/${id}`, { headers })
      setDetail(r.data)
      setNameInput(r.data.name)
      setNameError('')
    } catch (err) { console.error(err) }
    finally { setLoadingDetail(false) }
  }

  const loadGroupDetail = async (id) => {
    setLoadingGroupDetail(true)
    setGroupDetail(null)
    try {
      const r = await axios.get(`${API}/matrices/groups/${id}`, { headers })
      setGroupDetail(r.data)
      setGroupNameInput(r.data.name)
      setGroupNameError('')
    } catch (err) { console.error(err) }
    finally { setLoadingGroupDetail(false) }
  }

  const refreshDocuments = async (id) => {
    try {
      const r = await axios.get(`${API}/matrices/${id}`, { headers })
      setDetail(prev => prev ? { ...prev, documents: r.data.documents } : null)
    } catch (err) { console.error(err) }
  }

  const refreshGroupMembers = async (id) => {
    try {
      const r = await axios.get(`${API}/matrices/groups/${id}`, { headers })
      setGroupDetail(prev => prev ? { ...prev, members: r.data.members } : null)
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    axios.get(`${API}/training/mpis?limit=2000`, { headers })
      .then(r => setAllMpis(r.data.data || []))
      .catch(console.error)
  }, [])

  useEffect(() => { loadMatrices() }, [])
  useEffect(() => { loadGroups() }, [])

  // Employee search with debounce
  useEffect(() => {
    if (!empSearch.trim()) { setEmpResults([]); return }
    const t = setTimeout(async () => {
      setSearchingEmps(true)
      try {
        const r = await axios.get(
          `${API}/employees?search=${encodeURIComponent(empSearch.trim())}&limit=20&active=true`,
          { headers }
        )
        setEmpResults(r.data.data || [])
      } catch (err) { console.error(err) }
      finally { setSearchingEmps(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [empSearch])

  // ── Matrix handlers ────────────────────────────────────────────────────────

  const selectMatrix = (id) => {
    setSelectedId(id); setDeleteConfirm(false); setDocSearch(''); loadDetail(id)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true); setCreateError('')
    try {
      const r = await axios.post(`${API}/matrices`, { name: newName.trim() }, { headers })
      setNewName(''); setShowNewForm(false)
      await loadMatrices()
      selectMatrix(r.data.id)
    } catch (err) { setCreateError(err.response?.data?.error || 'Error creating matrix') }
    finally { setCreating(false) }
  }

  const handleSaveName = async () => {
    if (!nameInput.trim()) return
    setSavingName(true); setNameError('')
    try {
      await axios.put(`${API}/matrices/${detail.id}`, { name: nameInput.trim() }, { headers })
      setDetail(prev => ({ ...prev, name: nameInput.trim() }))
      setMatrices(prev => prev.map(m => m.id === detail.id ? { ...m, name: nameInput.trim() } : m))
    } catch (err) { setNameError(err.response?.data?.error || 'Error saving name') }
    finally { setSavingName(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await axios.delete(`${API}/matrices/${detail.id}`, { headers })
      setSelectedId(null); setDetail(null); loadMatrices()
    } catch (err) { console.error(err) }
    finally { setDeleting(false); setDeleteConfirm(false) }
  }

  const handleAddDocument = async (mpiId) => {
    try {
      await axios.post(`${API}/matrices/${detail.id}/documents`, { mpiId }, { headers })
      await refreshDocuments(detail.id)
      setMatrices(prev => prev.map(m => m.id === detail.id ? { ...m, documentCount: m.documentCount + 1 } : m))
    } catch (err) { console.error(err) }
  }

  const handleRemoveDocument = async (mpiId) => {
    try {
      await axios.delete(`${API}/matrices/${detail.id}/documents/${mpiId}`, { headers })
      await refreshDocuments(detail.id)
      setMatrices(prev => prev.map(m => m.id === detail.id ? { ...m, documentCount: Math.max(0, m.documentCount - 1) } : m))
    } catch (err) { console.error(err) }
  }

  const handleMoveDoc = async (index, direction) => {
    if (!detail) return
    const docs = [...detail.documents]
    const target = index + direction
    if (target < 0 || target >= docs.length) return
    ;[docs[index], docs[target]] = [docs[target], docs[index]]
    const reordered = docs.map((d, i) => ({ ...d, order: i + 1 }))
    setDetail(prev => ({ ...prev, documents: reordered }))
    try {
      await axios.put(`${API}/matrices/${detail.id}/documents/reorder`,
        { documents: reordered.map(d => ({ mpiId: d.mpiId, order: d.order })) }, { headers })
    } catch (err) { console.error(err) }
  }

  // ── Group handlers ─────────────────────────────────────────────────────────

  const selectGroup = (id) => {
    setSelectedGroupId(id); setDeleteGroupConfirm(false); setEmpSearch(''); setEmpResults([]); loadGroupDetail(id)
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return
    setCreatingGroup(true); setCreateGroupError('')
    try {
      const r = await axios.post(`${API}/matrices/groups`, { name: newGroupName.trim() }, { headers })
      setNewGroupName(''); setShowNewGroupForm(false)
      await loadGroups()
      selectGroup(r.data.id)
    } catch (err) { setCreateGroupError(err.response?.data?.error || 'Error creating group') }
    finally { setCreatingGroup(false) }
  }

  const handleSaveGroupName = async () => {
    if (!groupNameInput.trim()) return
    setSavingGroupName(true); setGroupNameError('')
    try {
      await axios.put(`${API}/matrices/groups/${groupDetail.id}`, { name: groupNameInput.trim() }, { headers })
      setGroupDetail(prev => ({ ...prev, name: groupNameInput.trim() }))
      setGroups(prev => prev.map(g => g.id === groupDetail.id ? { ...g, name: groupNameInput.trim() } : g))
    } catch (err) { setGroupNameError(err.response?.data?.error || 'Error saving name') }
    finally { setSavingGroupName(false) }
  }

  const handleDeleteGroup = async () => {
    setDeletingGroup(true)
    try {
      await axios.delete(`${API}/matrices/groups/${groupDetail.id}`, { headers })
      setSelectedGroupId(null); setGroupDetail(null); loadGroups()
    } catch (err) { console.error(err) }
    finally { setDeletingGroup(false); setDeleteGroupConfirm(false) }
  }

  const handleAddMember = async (employeeId) => {
    try {
      await axios.post(`${API}/matrices/groups/${groupDetail.id}/members`, { employeeId }, { headers })
      await refreshGroupMembers(groupDetail.id)
      setGroups(prev => prev.map(g => g.id === groupDetail.id ? { ...g, memberCount: g.memberCount + 1 } : g))
    } catch (err) { console.error(err) }
  }

  const handleRemoveMember = async (employeeId) => {
    try {
      await axios.delete(`${API}/matrices/groups/${groupDetail.id}/members/${employeeId}`, { headers })
      await refreshGroupMembers(groupDetail.id)
      setGroups(prev => prev.map(g => g.id === groupDetail.id ? { ...g, memberCount: Math.max(0, g.memberCount - 1) } : g))
    } catch (err) { console.error(err) }
  }

  // ── Report handlers ────────────────────────────────────────────────────────

  const handleGenerateReport = async () => {
    setReportLoading(true); setReportData(null)
    try {
      const r = await axios.get(
        `${API}/matrices/report?matrixId=${reportMatrixId}&groupId=${reportGroupId}`,
        { headers }
      )
      setReportData(r.data)
    } catch (err) { console.error(err) }
    finally { setReportLoading(false) }
  }

  // ── Computed ───────────────────────────────────────────────────────────────

  const inMatrixIds = new Set((detail?.documents || []).map(d => d.mpiId))
  const availableMpis = allMpis
    .filter(m =>
      !inMatrixIds.has(m.id) &&
      (m.Name?.toLowerCase().includes(docSearch.toLowerCase()) ||
       m.Code?.toLowerCase().includes(docSearch.toLowerCase()))
    ).slice(0, 20)

  const inGroupIds = new Set((groupDetail?.members || []).map(m => m.id))
  const availableEmps = empResults.filter(e => !inGroupIds.has(e.id))

  // ── Reusable inline form (new matrix / new group) ──────────────────────────

  function NewItemForm({ value, onChange, onKeyDown, onCreate, onCancel, creating, error, placeholder }) {
    return (
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #e5e7eb', background: '#f0fdf9', flexShrink: 0 }}>
        <input
          value={value} onChange={onChange} onKeyDown={onKeyDown}
          placeholder={placeholder} autoFocus
          style={{ ...inputStyle, marginBottom: '8px', fontSize: '13px' }}
        />
        {error && <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '8px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={onCreate} disabled={creating || !value.trim()} style={{ ...btnPrimary, flex: 1, padding: '6px 8px', fontSize: '12px' }}>
            {creating ? 'Creating…' : 'Create'}
          </button>
          <button onClick={onCancel} style={{ ...btnGhost, padding: '6px 10px', fontSize: '12px' }}>Cancel</button>
        </div>
      </div>
    )
  }

  // ── Shared empty / loading states ──────────────────────────────────────────

  function RightPanelShell({ selectedId, loading, children }) {
    if (!selectedId) return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '14px' }}>
        Select an item or create a new one
      </div>
    )
    if (loading) return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '14px' }}>
        Loading…
      </div>
    )
    return children
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'matrices', label: 'Matrices' },
    { id: 'groups',   label: 'Employee Groups' },
    { id: 'report',   label: 'Matrix Report' },
  ]

  return (
    <Layout title="Matrices" subtitle="Document matrix configuration">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

        {/* ── Tab bar ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '16px', flexShrink: 0 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 22px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: '600',
                color: activeTab === tab.id ? '#00c896' : '#6b7280',
                borderBottom: `2px solid ${activeTab === tab.id ? '#00c896' : 'transparent'}`,
                marginBottom: '-2px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'hidden' }}>

          {/* ══ TAB 1: Matrices ══════════════════════════════════════════════ */}
          {activeTab === 'matrices' && (
            <div style={{ display: 'flex', gap: '20px', height: '100%' }}>

              {/* Left panel */}
              <LeftPanel
                title="Matrices" count={matrices.length}
                onNew={() => { setShowNewForm(true); setNewName(''); setCreateError('') }}
                showNewForm={showNewForm}
                newFormContent={
                  <NewItemForm
                    value={newName} onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    onCreate={handleCreate} onCancel={() => setShowNewForm(false)}
                    creating={creating} error={createError} placeholder="Matrix name…"
                  />
                }
                loading={loadingMatrices}
              >
                {matrices.length === 0
                  ? <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No matrices yet</div>
                  : matrices.map(m => (
                    <ListItem key={m.id} label={m.name}
                      sub={`${m.documentCount} ${m.documentCount === 1 ? 'document' : 'documents'}`}
                      active={selectedId === m.id}
                      onClick={() => selectMatrix(m.id)}
                    />
                  ))
                }
              </LeftPanel>

              {/* Right panel */}
              <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <RightPanelShell selectedId={selectedId} loading={loadingDetail && !detail}>
                  {detail && (
                    <TwoColumnDetail
                      topContent={
                        <NameDeleteTop
                          nameInput={nameInput} onNameChange={e => { setNameInput(e.target.value); setNameError('') }}
                          onNameKeyDown={e => e.key === 'Enter' && handleSaveName()}
                          onSave={handleSaveName} savingName={savingName}
                          nameDirty={nameInput.trim() && nameInput.trim() !== detail.name}
                          nameError={nameError}
                          deleteConfirm={deleteConfirm} onDeleteRequest={() => setDeleteConfirm(true)}
                          onDeleteConfirm={handleDelete} deleting={deleting}
                          onDeleteCancel={() => setDeleteConfirm(false)} itemName={detail.name}
                        />
                      }
                      leftTitle={`Documents in this Matrix (${detail.documents.length})`}
                      leftContent={
                        detail.documents.length === 0
                          ? <div style={{ padding: '20px 14px', color: '#9ca3af', fontSize: '13px' }}>No documents yet. Add some from the right.</div>
                          : detail.documents.map((doc, idx) => (
                            <div key={doc.mpiId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderBottom: idx < detail.documents.length - 1 ? '1px solid #f3f4f6' : 'none', background: '#fff' }}>
                              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#f3f4f6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#6b7280' }}>
                                {idx + 1}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                                {doc.revision && <div style={{ fontSize: '11px', color: '#9ca3af' }}>Rev. {doc.revision}</div>}
                              </div>
                              <button onClick={() => handleMoveDoc(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '2px 6px', fontSize: '12px', lineHeight: 1.4, cursor: idx === 0 ? 'not-allowed' : 'pointer', color: idx === 0 ? '#d1d5db' : '#374151' }}>↑</button>
                              <button onClick={() => handleMoveDoc(idx, 1)} disabled={idx === detail.documents.length - 1} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '2px 6px', fontSize: '12px', lineHeight: 1.4, cursor: idx === detail.documents.length - 1 ? 'not-allowed' : 'pointer', color: idx === detail.documents.length - 1 ? '#d1d5db' : '#374151' }}>↓</button>
                              <button onClick={() => handleRemoveDocument(doc.mpiId)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#d1d5db', padding: '2px 4px', lineHeight: 1 }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'} title="Remove">×</button>
                            </div>
                          ))
                      }
                      rightTitle="Add Document"
                      rightHeaderExtra={
                        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', flexShrink: 0, background: '#fff' }}>
                          <input value={docSearch} onChange={e => setDocSearch(e.target.value)} placeholder="Search by name or code…" style={inputStyle} />
                        </div>
                      }
                      rightContent={
                        docSearch.trim() === ''
                          ? <div style={{ padding: '20px 14px', color: '#9ca3af', fontSize: '13px' }}>Type to search available documents.</div>
                          : availableMpis.length === 0
                          ? <div style={{ padding: '20px 14px', color: '#9ca3af', fontSize: '13px' }}>No matching documents found.</div>
                          : availableMpis.map((m, idx) => (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderBottom: idx < availableMpis.length - 1 ? '1px solid #f3f4f6' : 'none', background: '#fff' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.Name}</div>
                                {m.Code && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{m.Code}</div>}
                              </div>
                              <button onClick={() => handleAddDocument(m.id)} style={{ ...btnPrimary, padding: '5px 12px', fontSize: '12px', flexShrink: 0 }}>+ Add</button>
                            </div>
                          ))
                      }
                    />
                  )}
                </RightPanelShell>
              </div>

            </div>
          )}

          {/* ══ TAB 2: Employee Groups ════════════════════════════════════════ */}
          {activeTab === 'groups' && (
            <div style={{ display: 'flex', gap: '20px', height: '100%' }}>

              {/* Left panel */}
              <LeftPanel
                title="Employee Groups" count={groups.length}
                onNew={() => { setShowNewGroupForm(true); setNewGroupName(''); setCreateGroupError('') }}
                showNewForm={showNewGroupForm}
                newFormContent={
                  <NewItemForm
                    value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
                    onCreate={handleCreateGroup} onCancel={() => setShowNewGroupForm(false)}
                    creating={creatingGroup} error={createGroupError} placeholder="Group name…"
                  />
                }
                loading={loadingGroups}
              >
                {groups.length === 0
                  ? <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No groups yet</div>
                  : groups.map(g => (
                    <ListItem key={g.id} label={g.name}
                      sub={`${g.memberCount} ${g.memberCount === 1 ? 'member' : 'members'}`}
                      active={selectedGroupId === g.id}
                      onClick={() => selectGroup(g.id)}
                    />
                  ))
                }
              </LeftPanel>

              {/* Right panel */}
              <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <RightPanelShell selectedId={selectedGroupId} loading={loadingGroupDetail && !groupDetail}>
                  {groupDetail && (
                    <TwoColumnDetail
                      topContent={
                        <NameDeleteTop
                          nameInput={groupNameInput} onNameChange={e => { setGroupNameInput(e.target.value); setGroupNameError('') }}
                          onNameKeyDown={e => e.key === 'Enter' && handleSaveGroupName()}
                          onSave={handleSaveGroupName} savingName={savingGroupName}
                          nameDirty={groupNameInput.trim() && groupNameInput.trim() !== groupDetail.name}
                          nameError={groupNameError}
                          deleteConfirm={deleteGroupConfirm} onDeleteRequest={() => setDeleteGroupConfirm(true)}
                          onDeleteConfirm={handleDeleteGroup} deleting={deletingGroup}
                          onDeleteCancel={() => setDeleteGroupConfirm(false)} itemName={groupDetail.name}
                        />
                      }
                      leftTitle={`Members (${groupDetail.members.length})`}
                      leftContent={
                        groupDetail.members.length === 0
                          ? <div style={{ padding: '20px 14px', color: '#9ca3af', fontSize: '13px' }}>No members yet. Add some from the right.</div>
                          : groupDetail.members.map((m, idx) => (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderBottom: idx < groupDetail.members.length - 1 ? '1px solid #f3f4f6' : 'none', background: '#fff' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{m.name}</div>
                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>{m.number}</div>
                              </div>
                              <button onClick={() => handleRemoveMember(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#d1d5db', padding: '2px 4px', lineHeight: 1 }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'} title="Remove">×</button>
                            </div>
                          ))
                      }
                      rightTitle="Add Employee"
                      rightHeaderExtra={
                        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', flexShrink: 0, background: '#fff' }}>
                          <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="Search by name or number…" style={inputStyle} />
                        </div>
                      }
                      rightContent={
                        empSearch.trim() === ''
                          ? <div style={{ padding: '20px 14px', color: '#9ca3af', fontSize: '13px' }}>Type to search employees.</div>
                          : searchingEmps
                          ? <div style={{ padding: '20px 14px', color: '#9ca3af', fontSize: '13px' }}>Searching…</div>
                          : availableEmps.length === 0
                          ? <div style={{ padding: '20px 14px', color: '#9ca3af', fontSize: '13px' }}>
                              {empResults.length === 0 ? 'No employees found.' : 'All matching employees are already in this group.'}
                            </div>
                          : availableEmps.map((e, idx) => (
                            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderBottom: idx < availableEmps.length - 1 ? '1px solid #f3f4f6' : 'none', background: '#fff' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{e.Name}</div>
                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>{e.Number}</div>
                              </div>
                              <button onClick={() => handleAddMember(e.id)} style={{ ...btnPrimary, padding: '5px 12px', fontSize: '12px', flexShrink: 0 }}>+ Add</button>
                            </div>
                          ))
                      }
                    />
                  )}
                </RightPanelShell>
              </div>

            </div>
          )}

          {/* ══ TAB 3: Matrix Report ══════════════════════════════════════════ */}
          {activeTab === 'report' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>

              {/* Controls row */}
              <div style={{
                display: 'flex', gap: '16px', alignItems: 'flex-end', flexShrink: 0,
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
                padding: '16px 20px'
              }}>
                <div>
                  <label style={sectionLabel}>Matrix</label>
                  <select value={reportMatrixId} onChange={e => { setReportMatrixId(e.target.value); setReportData(null) }} style={{ ...selectStyle, minWidth: '200px' }}>
                    <option value="">Select matrix…</option>
                    {matrices.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={sectionLabel}>Employee Group</label>
                  <select value={reportGroupId} onChange={e => { setReportGroupId(e.target.value); setReportData(null) }} style={{ ...selectStyle, minWidth: '200px' }}>
                    <option value="">Select group…</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleGenerateReport}
                  disabled={!reportMatrixId || !reportGroupId || reportLoading}
                  style={{ ...btnPrimary, opacity: (!reportMatrixId || !reportGroupId || reportLoading) ? 0.5 : 1 }}
                >
                  {reportLoading ? 'Generating…' : 'Generate Report'}
                </button>
              </div>

              {/* Report area */}
              <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {reportLoading ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '14px' }}>
                    Generating report…
                  </div>
                ) : !reportData ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '14px' }}>
                    Select a matrix and group, then click "Generate Report"
                  </div>
                ) : reportData.employees.length === 0 || reportData.documents.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '14px' }}>
                    {reportData.employees.length === 0 ? 'The selected group has no members.' : 'The selected matrix has no documents.'}
                  </div>
                ) : (
                  <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                    <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content', minWidth: '100%' }}>
                      <thead>
                        <tr>
                          {/* Corner cell */}
                          <th style={{
                            position: 'sticky', top: 0, left: 0, zIndex: 30,
                            background: '#f9fafb', border: '1px solid #e5e7eb',
                            padding: '10px 14px', fontSize: '12px', fontWeight: '700',
                            color: '#374151', textAlign: 'left', minWidth: '180px',
                            whiteSpace: 'nowrap'
                          }}>
                            Employee
                          </th>
                          {reportData.documents.map(doc => (
                            <th
                              key={doc.id}
                              title={`${doc.name} (${doc.revision})`}
                              style={{
                                position: 'sticky', top: 0, zIndex: 20,
                                background: '#f9fafb', border: '1px solid #e5e7eb',
                                padding: '8px 10px', textAlign: 'center',
                                minWidth: '90px', maxWidth: '90px', width: '90px'
                              }}
                            >
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px', fontWeight: '600', color: '#374151' }}>
                                {doc.name}
                              </div>
                              <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '400', whiteSpace: 'nowrap' }}>
                                {doc.revision}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.employees.map(emp => (
                          <tr key={emp.id}>
                            <td style={{
                              position: 'sticky', left: 0, zIndex: 10,
                              background: '#fff', border: '1px solid #e5e7eb',
                              padding: '8px 14px', minWidth: '180px'
                            }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', whiteSpace: 'nowrap' }}>{emp.name}</div>
                              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{emp.number}</div>
                            </td>
                            {reportData.documents.map(doc => {
                              const ok = emp.compliance[doc.id]
                              return (
                                <td key={doc.id} style={{
                                  background: ok ? '#16a34a' : '#dc2626',
                                  border: '1px solid rgba(255,255,255,0.2)',
                                  textAlign: 'center', padding: '8px',
                                  fontSize: '15px', fontWeight: '700', color: '#fff',
                                  minWidth: '90px', maxWidth: '90px', width: '90px'
                                }}>
                                  {ok ? '✓' : '✕'}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Summary card */}
                    {(() => {
                      const pct = reportData.overallCompliance
                      const color = pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626'
                      return (
                        <div style={{ paddingTop: '20px' }}>
                          <div style={{
                            display: 'inline-flex', flexDirection: 'column', gap: '2px',
                            background: '#fff', border: `2px solid ${color}50`,
                            borderRadius: '10px', padding: '14px 22px'
                          }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              Overall Compliance
                            </span>
                            <span style={{ fontSize: '30px', fontWeight: '800', color, lineHeight: 1.1 }}>
                              {pct}%
                            </span>
                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                              {reportData.matrixName} × {reportData.groupName}
                            </span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </Layout>
  )
}
