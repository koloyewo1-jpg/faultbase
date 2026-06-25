'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const ADMIN_PW = 'kolatron2024'
const AUTH_KEY = 'kolatron_admin_auth'

const MACHINE_TYPES = [
  { id: 'general-conveyor', label: 'Conveyor' },
  { id: 'general-pneumatics', label: 'Pneumatic System' },
  { id: 'general-sensors', label: 'Sensors' },
  { id: 'general-motors', label: 'Motors' },
  { id: 'general-vfd', label: 'VFD / Variable Speed Drive' },
  { id: 'general-plc', label: 'PLC / Controls' },
  { id: 'general-safety', label: 'Safety Systems' },
  { id: 'general-packaging', label: 'Packaging Machinery' },
  { id: 'general-reject', label: 'Reject Systems' },
]

interface Fault {
  id: string
  title: string
  category: string
  machine_id: string
  status: string
  symptoms: string[]
  causes: { rank: number; cause: string; likelihood: string; type: string }[]
  checks: string[]
}

interface Log {
  id: string
  created_at: string
  machine_type: string
  user_query: string
  matched_fault_title: string | null
  low_confidence: boolean
}

interface FormState {
  id: string
  title: string
  category: string
  machine_id: string
  status: string
  symptoms: string
  causes: string
  checks: string
}

interface ExtractedFault {
  fault_title: string
  category: string
  machine_id: string
  symptoms: string[]
  likely_causes: { description: string; rank: number }[]
  checks_to_perform: { instruction: string }[]
  safety_precautions: string[]
  escalation_guidance: string
  status: string
}

const EMPTY_FORM: FormState = {
  id: '', title: '', category: '', machine_id: '', status: 'draft',
  symptoms: '', causes: '', checks: '',
}

const BLUE = '#185FA5'
const DARK = '#111827'
const MUTED = '#6b7280'
const BORDER = '#e5e7eb'
const LIGHT_BG = '#f9fafb'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13, border: `1px solid ${BORDER}`,
  borderRadius: 6, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  color: DARK, background: '#fff',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: DARK, marginBottom: 4,
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 18px', fontSize: 13, fontWeight: 600, background: BLUE, color: '#fff',
  border: 'none', borderRadius: 7, cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 18px', fontSize: 13, fontWeight: 500, background: '#fff', color: DARK,
  border: `1px solid ${BORDER}`, borderRadius: 7, cursor: 'pointer',
}

const thStyle: React.CSSProperties = {
  padding: '9px 12px', fontSize: 11, fontWeight: 600, color: MUTED,
  textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px', fontSize: 13, color: DARK, borderBottom: `1px solid ${BORDER}`,
  verticalAlign: 'top',
}

function StatusBadge({ status }: { status: string }) {
  const approved = status === 'approved'
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
      background: approved ? '#EAF3DE' : '#f3f4f6',
      color: approved ? '#27500A' : MUTED,
    }}>
      {status}
    </span>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)
  const [tab, setTab] = useState<'faults' | 'logs' | 'upload'>('faults')

  // Fault records tab
  const [faults, setFaults] = useState<Fault[]>([])
  const [faultsLoading, setFaultsLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Diagnosis logs tab
  const [logs, setLogs] = useState<Log[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Upload manual tab
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadMachineType, setUploadMachineType] = useState(MACHINE_TYPES[0].id)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [extractedFaults, setExtractedFaults] = useState<ExtractedFault[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [savingExtracted, setSavingExtracted] = useState(false)
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setAuthed(localStorage.getItem(AUTH_KEY) === 'true')
  }, [])

  const loadFaults = useCallback(async () => {
    setFaultsLoading(true)
    try {
      const r = await fetch('/api/admin/faults')
      const d = await r.json()
      setFaults(d.faults ?? [])
    } finally {
      setFaultsLoading(false)
    }
  }, [])

  const loadLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const r = await fetch('/api/admin/logs')
      const d = await r.json()
      setLogs(d.logs ?? [])
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authed) return
    loadFaults()
    loadLogs()
  }, [authed, loadFaults, loadLogs])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (pwInput === ADMIN_PW) {
      localStorage.setItem(AUTH_KEY, 'true')
      setAuthed(true)
    } else {
      setPwError(true)
    }
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_KEY)
    setAuthed(false)
    setPwInput('')
  }

  function openNew() {
    setForm(EMPTY_FORM)
    setFormError('')
    setSaveSuccess(false)
    setShowForm(true)
  }

  function openEdit(f: Fault) {
    setForm({
      id: f.id,
      title: f.title,
      category: f.category,
      machine_id: f.machine_id,
      status: f.status,
      symptoms: (f.symptoms ?? []).join('\n'),
      causes: (f.causes ?? []).map((c: any) =>
        typeof c === 'string' ? c : c.cause
      ).join('\n'),
      checks: (f.checks ?? []).join('\n'),
    })
    setFormError('')
    setSaveSuccess(false)
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.category.trim() || !form.machine_id.trim()) {
      setFormError('Title, category and machine ID are required.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        ...(form.id ? { id: form.id } : {}),
        title: form.title.trim(),
        category: form.category.trim(),
        machine_id: form.machine_id.trim(),
        status: form.status,
        symptoms: form.symptoms.split('\n').map(s => s.trim()).filter(Boolean),
        causes: form.causes.split('\n').map(s => s.trim()).filter(Boolean).map((c, i) => ({
          rank: i + 1, cause: c, likelihood: 'medium', type: 'technical',
        })),
        checks: form.checks.split('\n').map(s => s.trim()).filter(Boolean),
      }
      const r = await fetch('/api/admin/faults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (r.ok) {
        setSaveSuccess(true)
        loadFaults()
        setTimeout(() => setShowForm(false), 600)
      } else {
        const d = await r.json()
        setFormError(d.error ?? 'Save failed')
      }
    } finally {
      setSaving(false)
    }
  }

  function setF(key: keyof FormState, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadFile) return
    setExtracting(true)
    setExtractError('')
    setExtractedFaults([])
    setSavedCount(null)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      fd.append('machine_type', uploadMachineType)
      const r = await fetch('/api/admin/upload-manual', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok) {
        setExtractError(d.error ?? 'Extraction failed')
        return
      }
      const faultList: ExtractedFault[] = d.faults ?? []
      setExtractedFaults(faultList)
      setSelectedIndices(new Set(faultList.map((_, i) => i)))
    } catch (err: any) {
      setExtractError(err.message ?? 'Network error')
    } finally {
      setExtracting(false)
    }
  }

  function toggleSelect(idx: number) {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function toggleAll() {
    if (selectedIndices.size === extractedFaults.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(extractedFaults.map((_, i) => i)))
    }
  }

  async function handleSaveExtracted() {
    const toSave = extractedFaults.filter((_, i) => selectedIndices.has(i))
    if (toSave.length === 0) return
    setSavingExtracted(true)
    setSavedCount(null)
    let saved = 0
    for (const ef of toSave) {
      const payload = {
        title: ef.fault_title,
        category: ef.category || 'General',
        machine_id: ef.machine_id || uploadMachineType,
        status: 'draft',
        symptoms: Array.isArray(ef.symptoms) ? ef.symptoms : [],
        causes: (ef.likely_causes ?? []).map((c: any, i: number) => ({
          rank: c.rank ?? i + 1,
          cause: c.description ?? c.cause ?? String(c),
          likelihood: 'medium',
          type: 'technical',
        })),
        checks: (ef.checks_to_perform ?? []).map((c: any) =>
          typeof c === 'string' ? c : (c.instruction ?? String(c))
        ),
      }
      const r = await fetch('/api/admin/faults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (r.ok) saved++
    }
    setSavedCount(saved)
    setSavingExtracted(false)
    setExtractedFaults([])
    setSelectedIndices(new Set())
    setUploadFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    loadFaults()
  }

  // ── Not yet hydrated ──────────────────────────────────────────────────────
  if (authed === null) return null

  // ── Password gate ─────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <main style={{ minHeight: '100vh', background: LIGHT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: '40px 36px', width: '100%', maxWidth: 360, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
            Kolatron<span style={{ color: BLUE }}>.ai</span>
          </div>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 28 }}>Admin panel</div>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false) }}
              placeholder="Admin password"
              autoFocus
              style={{ ...inputStyle, marginBottom: 10, textAlign: 'center' }}
            />
            {pwError && (
              <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 10 }}>Incorrect password</div>
            )}
            <button type="submit" style={{ ...btnPrimary, width: '100%', padding: '10px 0' }}>
              Enter
            </button>
          </form>
        </div>
      </main>
    )
  }

  // ── Authenticated dashboard ───────────────────────────────────────────────
  const tabDefs: { key: 'faults' | 'logs' | 'upload'; label: string }[] = [
    { key: 'faults', label: `Fault Records (${faults.length})` },
    { key: 'logs', label: `Diagnosis Logs (${logs.length})` },
    { key: 'upload', label: 'Upload Manual' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: LIGHT_BG, fontFamily: 'system-ui, sans-serif', color: DARK }}>

      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          Kolatron<span style={{ color: BLUE }}>.ai</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: MUTED, marginLeft: 8 }}>Admin</span>
        </div>
        <button onClick={handleLogout} style={{ ...btnSecondary, padding: '6px 14px', fontSize: 12 }}>
          Logout
        </button>
      </nav>

      {/* Page container */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${BORDER}` }}>
          {tabDefs.map(({ key, label }) => {
            const active = tab === key
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: '9px 18px', fontSize: 13, fontWeight: active ? 600 : 500,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: active ? BLUE : MUTED,
                  borderBottom: active ? `2px solid ${BLUE}` : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* ── Fault Records tab ───────────────────────────────────────────── */}
        {tab === 'faults' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: MUTED }}>{faults.length} fault records in knowledge base</div>
              <button onClick={openNew} style={btnPrimary}>+ Add Fault Record</button>
            </div>

            <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: LIGHT_BG }}>
                    <tr>
                      <th style={thStyle}>ID</th>
                      <th style={thStyle}>Title</th>
                      <th style={thStyle}>Category</th>
                      <th style={thStyle}>Machine ID</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {faultsLoading ? (
                      <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: MUTED, padding: 28 }}>Loading...</td></tr>
                    ) : faults.length === 0 ? (
                      <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: MUTED, padding: 28 }}>No fault records found</td></tr>
                    ) : faults.map((f, i) => (
                      <tr key={f.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: MUTED }}>{f.id}</td>
                        <td style={{ ...tdStyle, fontWeight: 500, maxWidth: 280 }}>{f.title}</td>
                        <td style={tdStyle}>{f.category}</td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{f.machine_id}</td>
                        <td style={tdStyle}><StatusBadge status={f.status} /></td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <button
                            onClick={() => openEdit(f)}
                            style={{ fontSize: 12, padding: '4px 12px', border: `1px solid ${BORDER}`, borderRadius: 5, background: '#fff', cursor: 'pointer', color: DARK }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Diagnosis Logs tab ──────────────────────────────────────────── */}
        {tab === 'logs' && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: MUTED }}>{logs.length} diagnosis log entries, most recent first</div>
            </div>

            <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: LIGHT_BG }}>
                    <tr>
                      <th style={thStyle}>Date / Time</th>
                      <th style={thStyle}>Machine</th>
                      <th style={thStyle}>User Query</th>
                      <th style={thStyle}>Matched Fault</th>
                      <th style={thStyle}>Low Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsLoading ? (
                      <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: MUTED, padding: 28 }}>Loading...</td></tr>
                    ) : logs.length === 0 ? (
                      <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: MUTED, padding: 28 }}>No diagnosis logs yet</td></tr>
                    ) : logs.map((l, i) => (
                      <tr key={l.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: 12, color: MUTED }}>
                          {new Date(l.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{l.machine_type}</td>
                        <td style={{ ...tdStyle, maxWidth: 300, color: DARK }}>{l.user_query}</td>
                        <td style={{ ...tdStyle, maxWidth: 220 }}>{l.matched_fault_title ?? <span style={{ color: MUTED }}>—</span>}</td>
                        <td style={tdStyle}>
                          {l.low_confidence ? (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#92400e', background: '#fffbeb', padding: '2px 8px', borderRadius: 10 }}>Yes</span>
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#27500A', background: '#EAF3DE', padding: '2px 8px', borderRadius: 10 }}>No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Upload Manual tab ───────────────────────────────────────────── */}
        {tab === 'upload' && (
          <div style={{ maxWidth: 720 }}>

            {/* Upload form */}
            <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '24px 24px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Extract fault records from a manual</div>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 20, lineHeight: 1.6 }}>
                Upload a PDF or DOCX equipment manual. Claude will read it and extract all fault records as drafts ready for your review.
              </div>

              <form onSubmit={handleExtract}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px', marginBottom: 16 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Manual file <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx"
                      onChange={e => {
                        setUploadFile(e.target.files?.[0] ?? null)
                        setExtractedFaults([])
                        setExtractError('')
                        setSavedCount(null)
                      }}
                      style={{ ...inputStyle, padding: '6px 10px' }}
                    />
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Accepted formats: PDF, DOCX. Maximum ~30,000 characters of text will be sent to Claude.</div>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Machine type</label>
                    <select
                      value={uploadMachineType}
                      onChange={e => setUploadMachineType(e.target.value)}
                      style={{ ...inputStyle, appearance: 'auto' }}
                    >
                      {MACHINE_TYPES.map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {extractError && (
                  <div style={{ marginBottom: 14, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, color: '#b91c1c' }}>
                    {extractError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!uploadFile || extracting}
                  style={{ ...btnPrimary, opacity: !uploadFile || extracting ? 0.6 : 1 }}
                >
                  {extracting ? 'Extracting...' : 'Extract Faults'}
                </button>

                {extracting && (
                  <span style={{ marginLeft: 12, fontSize: 12, color: MUTED }}>
                    Reading manual and calling Claude — this can take up to 60 seconds for large files.
                  </span>
                )}
              </form>
            </div>

            {/* Success banner */}
            {savedCount !== null && (
              <div style={{ padding: '12px 16px', background: '#EAF3DE', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#27500A', marginBottom: 20, fontWeight: 500 }}>
                {savedCount} fault {savedCount === 1 ? 'record' : 'records'} saved to knowledge base as drafts. Review and approve them in the Fault Records tab.
              </div>
            )}

            {/* Extracted results */}
            {extractedFaults.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {extractedFaults.length} fault {extractedFaults.length === 1 ? 'record' : 'records'} extracted
                    {uploadFile && <span style={{ fontSize: 12, fontWeight: 400, color: MUTED, marginLeft: 8 }}>from {uploadFile.name}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      onClick={toggleAll}
                      style={{ ...btnSecondary, padding: '5px 12px', fontSize: 12 }}
                    >
                      {selectedIndices.size === extractedFaults.length ? 'Deselect all' : 'Select all'}
                    </button>
                    <button
                      onClick={handleSaveExtracted}
                      disabled={selectedIndices.size === 0 || savingExtracted}
                      style={{ ...btnPrimary, opacity: selectedIndices.size === 0 || savingExtracted ? 0.6 : 1 }}
                    >
                      {savingExtracted
                        ? 'Saving...'
                        : `Save Selected (${selectedIndices.size}) to Knowledge Base`}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {extractedFaults.map((ef, i) => {
                    const selected = selectedIndices.has(i)
                    return (
                      <div
                        key={i}
                        onClick={() => toggleSelect(i)}
                        style={{
                          background: '#fff',
                          border: `1px solid ${selected ? BLUE : BORDER}`,
                          borderRadius: 8,
                          padding: '14px 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: 14,
                          alignItems: 'flex-start',
                          transition: 'border-color 0.1s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(i)}
                          onClick={e => e.stopPropagation()}
                          style={{ marginTop: 2, flexShrink: 0, accentColor: BLUE, width: 15, height: 15, cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: DARK }}>
                            {ef.fault_title}
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                            {ef.category && (
                              <span style={{ fontSize: 11, padding: '1px 8px', background: '#E6F1FB', color: '#0C447C', borderRadius: 8, fontWeight: 600 }}>
                                {ef.category}
                              </span>
                            )}
                            <span style={{ fontSize: 11, padding: '1px 8px', background: '#f3f4f6', color: MUTED, borderRadius: 8 }}>
                              {ef.machine_id || uploadMachineType}
                            </span>
                            <StatusBadge status="draft" />
                          </div>
                          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: MUTED }}>
                            <span>{(ef.symptoms ?? []).length} symptom{(ef.symptoms ?? []).length !== 1 ? 's' : ''}</span>
                            <span>{(ef.likely_causes ?? []).length} cause{(ef.likely_causes ?? []).length !== 1 ? 's' : ''}</span>
                            <span>{(ef.checks_to_perform ?? []).length} check{(ef.checks_to_perform ?? []).length !== 1 ? 's' : ''}</span>
                            <span>{(ef.safety_precautions ?? []).length} safety note{(ef.safety_precautions ?? []).length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleSaveExtracted}
                    disabled={selectedIndices.size === 0 || savingExtracted}
                    style={{ ...btnPrimary, opacity: selectedIndices.size === 0 || savingExtracted ? 0.6 : 1 }}
                  >
                    {savingExtracted
                      ? 'Saving...'
                      : `Save Selected (${selectedIndices.size}) to Knowledge Base`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Form modal ───────────────────────────────────────────────────── */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '40px 16px', overflowY: 'auto',
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '28px 28px 24px',
            width: '100%', maxWidth: 560, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {form.id ? `Edit ${form.id}` : 'New Fault Record'}
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: MUTED, lineHeight: 1 }}>
                ×
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px', marginBottom: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Title <span style={{ color: '#b91c1c' }}>*</span></label>
                  <input style={inputStyle} value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Conveyor Belt Tracking Failure" />
                </div>

                <div>
                  <label style={labelStyle}>Category <span style={{ color: '#b91c1c' }}>*</span></label>
                  <input style={inputStyle} value={form.category} onChange={e => setF('category', e.target.value)} placeholder="Conveyor" />
                </div>

                <div>
                  <label style={labelStyle}>Machine ID <span style={{ color: '#b91c1c' }}>*</span></label>
                  <input style={inputStyle} value={form.machine_id} onChange={e => setF('machine_id', e.target.value)} placeholder="general-conveyor" />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Status</label>
                  <select
                    value={form.status}
                    onChange={e => setF('status', e.target.value)}
                    style={{ ...inputStyle, appearance: 'auto' }}
                  >
                    <option value="draft">draft</option>
                    <option value="approved">approved</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Symptoms <span style={{ fontSize: 11, color: MUTED, fontWeight: 400 }}>(one per line)</span></label>
                  <textarea
                    value={form.symptoms}
                    onChange={e => setF('symptoms', e.target.value)}
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                    placeholder={"Belt drifting to one side\nBelt edge fraying or tearing"}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Causes <span style={{ fontSize: 11, color: MUTED, fontWeight: 400 }}>(one per line, ranked by order)</span></label>
                  <textarea
                    value={form.causes}
                    onChange={e => setF('causes', e.target.value)}
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                    placeholder={"Pulley misalignment\nUneven belt tension\nSeized idler rollers"}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Actions / Checks <span style={{ fontSize: 11, color: MUTED, fontWeight: 400 }}>(one per line)</span></label>
                  <textarea
                    value={form.checks}
                    onChange={e => setF('checks', e.target.value)}
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                    placeholder={"Isolate and lock out conveyor before inspection\nCheck pulley alignment with straight edge"}
                  />
                </div>
              </div>

              {formError && (
                <div style={{ marginTop: 14, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, color: '#b91c1c' }}>
                  {formError}
                </div>
              )}

              {saveSuccess && (
                <div style={{ marginTop: 14, padding: '8px 12px', background: '#EAF3DE', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, color: '#27500A' }}>
                  Saved successfully
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" onClick={() => setShowForm(false)} style={btnSecondary}>Cancel</button>
                <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : form.id ? 'Save Changes' : 'Create Fault Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
