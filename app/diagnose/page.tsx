'use client'
import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'

function stripMarkdown(text: string): string {
  if (!text) return text
  return text
    .split('\n')
    .filter(line => !/^[-*#]+\s/.test(line.trim()))   // drop lines starting with - * #
    .join('\n')
    .replace(/\*\*(.+?)\*\*/g, '$1')                  // remove **bold**
    .replace(/\*(.+?)\*/g, '$1')                       // remove *italic*
    .replace(/`(.+?)`/g, '$1')                         // remove `code`
    .trim()
}

const ModelViewer = dynamic(() => import('../components/ModelViewer'), { ssr: false })

const MODEL_PATHS: Record<string, string> = {
  'general-conveyor': '/conveyor.glb',
  'general-motors':   '/motor.glb',
  'general-vfd':      '/panel.glb',
}

const MACHINES = [
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

const LOADING_STEPS = [
  'Searching knowledge base...',
  'Matching approved fault records...',
  'Analysing causes and actions...',
  'Preparing structured diagnosis...',
]

function LoadingCard() {
  const [stepIndex, setStepIndex] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex(i => (i < LOADING_STEPS.length - 1 ? i + 1 : i))
    }, 1800)
    const dotTimer = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 400)
    return () => {
      clearInterval(stepTimer)
      clearInterval(dotTimer)
    }
  }, [])

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '24px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
          {LOADING_STEPS[stepIndex]}{dots}
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af' }}>
          Checking against approved fault records only
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {LOADING_STEPS.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i < stepIndex ? '#185FA5' : i === stepIndex ? '#E6F1FB' : '#f3f4f6',
              border: i === stepIndex ? '2px solid #185FA5' : 'none',
              transition: 'all 0.3s ease'
            }}>
              {i < stepIndex ? (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : i === stepIndex ? (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#185FA5' }} />
              ) : null}
            </div>
            <span style={{
              fontSize: 12,
              color: i < stepIndex ? '#185FA5' : i === stepIndex ? '#111827' : '#d1d5db',
              fontWeight: i === stepIndex ? 600 : 400,
              transition: 'all 0.3s ease'
            }}>
              {step.replace('...', '')}
            </span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}

export default function DiagnosePage() {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [machineId, setMachineId] = useState('general-conveyor')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [showExamples, setShowExamples] = useState(true)

  async function runDiagnosis() {
    const trimmed = inputRef.current?.value.trim() || ''
    if (!trimmed || loading) return
    setShowExamples(false)
    setLoading(true)
    setResult(null)
    setError('')
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: machineId, input: trimmed }),
      })
      const data = await res.json()
      if (data.error) {
        setError('Diagnosis service error. Please try again.')
      } else if (!data.matched) {
        setError(data.message)
      } else {
        setResult(data.diagnosis)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setResult(null)
    setError('')
    setShowExamples(true)
    if (inputRef.current) inputRef.current.value = ''
  }

  function pickExample(text: string) {
    if (inputRef.current) {
      inputRef.current.value = text
      inputRef.current.focus()
    }
    setShowExamples(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>

      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>
            Kolatron<span style={{ color: '#185FA5' }}>.ai</span>
          </span>
        </a>
        <span style={{ fontSize: 11, color: '#6b7280' }}>Maintenance Decision Support</span>
      </div>

      <div style={{ maxWidth: 580, margin: '0 auto', padding: '20px 16px', boxSizing: 'border-box', width: '100%' }}>

        {/* Input card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 16px', marginBottom: 16, boxSizing: 'border-box' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Machine</div>
            <select
              value={machineId}
              onChange={e => setMachineId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: 15, border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#111827', boxSizing: 'border-box', appearance: 'auto' }}
            >
              {MACHINES.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Describe the fault: plain English or fault code</div>
            <textarea
              ref={inputRef}
              onFocus={() => setShowExamples(false)}
              rows={4}
              placeholder="e.g. ERROR LED flashing red, CPU stopped during production"
              style={{ width: '100%', padding: '10px 12px', fontSize: 15, border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#111827', fontFamily: 'system-ui, sans-serif', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5, display: 'block' }}
            />
          </div>
          <button
            type="button"
            onClick={runDiagnosis}
            disabled={loading}
            style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 700, background: loading ? '#93c5fd' : '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'system-ui, sans-serif', display: 'block', boxSizing: 'border-box' }}
          >
            {loading ? 'Running diagnosis...' : 'Run diagnosis'}
          </button>
        </div>

        {/* Animated loading */}
        {loading && <LoadingCard />}

        {/* Examples */}
        {showExamples && !result && !error && !loading && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px', marginBottom: 16, boxSizing: 'border-box' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Try these examples</div>
            {[
              'Belt drifting to one side',
              'Cylinder not extending on command',
              'Safety relay not resetting after E-stop',
              'Motor overload relay tripped',
              'Heat seal failing, weak or incomplete seal',
              'Metal detector giving false rejects',
              'VFD showing fault code on display',
              'Machine not starting, multiple interlocks',
            ].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => pickExample(example)}
                style={{ width: '100%', padding: '12px 14px', marginBottom: 8, fontSize: 14, textAlign: 'left', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', color: '#374151', fontFamily: 'system-ui, sans-serif', lineHeight: 1.5, display: 'block', boxSizing: 'border-box' }}
              >
                {example}
              </button>
            ))}
            <div style={{ marginTop: 4, padding: '10px 12px', background: '#EAF3DE', borderRadius: 8, fontSize: 12, color: '#27500A', lineHeight: 1.5 }}>
              Type anything in plain English: fault code, what you see, what you hear. No training needed.
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#92400e', lineHeight: 1.5, marginBottom: 12 }}>
            {error}
            <div style={{ marginTop: 10 }}>
              <button type="button" onClick={reset} style={{ color: '#185FA5', cursor: 'pointer', fontSize: 13, background: 'none', border: 'none', padding: 0, fontFamily: 'system-ui, sans-serif' }}>← Try again</button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div>
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>⚠ Safety precautions, read before proceeding</div>
              {result.safety_precautions?.map((p: string, i: number) => (
                <div key={i} style={{ fontSize: 13, color: '#b91c1c', padding: '3px 0', display: 'flex', gap: 8, lineHeight: 1.5 }}>
                  <span style={{ flexShrink: 0 }}>•</span><span>{p}</span>
                </div>
              ))}
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>What this means</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{stripMarkdown(result.meaning)}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Likely causes (ranked)</div>
              {result.top_causes?.map((c: any) => (
                <div key={c.rank} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, background: '#f3f4f6', color: '#6b7280', borderRadius: 4, padding: '2px 6px', flexShrink: 0, marginTop: 2 }}>#{c.rank}</span>
                  <span style={{ fontSize: 13, color: '#111827', flex: 1, lineHeight: 1.5 }}>{stripMarkdown(c.cause)}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, flexShrink: 0, background: c.likelihood === 'high' ? '#fef2f2' : c.likelihood === 'medium' ? '#fffbeb' : '#f3f4f6', color: c.likelihood === 'high' ? '#991b1b' : c.likelihood === 'medium' ? '#92400e' : '#6b7280' }}>{c.likelihood}</span>
                </div>
              ))}
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Step-by-step actions</div>
              {result.actions?.map((a: any) => (
                <div key={a.step} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6', background: a.caution ? '#fffbeb' : 'transparent', borderRadius: a.caution ? 6 : 0, paddingLeft: a.caution ? 8 : 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', minWidth: 20, flexShrink: 0 }}>{a.step}.</span>
                  <span style={{ fontSize: 13, color: '#111827', flex: 1, lineHeight: 1.5 }}>{stripMarkdown(a.instruction)}</span>
                  {a.caution && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#92400e', background: '#fef3c7', borderRadius: 4, padding: '2px 6px', flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>CAUTION</span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Escalation guidance</div>
              <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>{stripMarkdown(result.escalation_guidance)}</div>
            </div>
            <ModelViewer
              machineId={machineId}
              modelPath={MODEL_PATHS[machineId]}
              faultZone={MACHINES.find(m => m.id === machineId)?.label ?? ''}
              title={result.title ?? ''}
            />

            <button
              type="button"
              onClick={reset}
              style={{ width: '100%', padding: '14px', fontSize: 14, fontWeight: 500, background: '#fff', color: '#185FA5', border: '1px solid #185FA5', borderRadius: 8, cursor: 'pointer', fontFamily: 'system-ui, sans-serif', display: 'block', boxSizing: 'border-box' }}
            >
              ← Run another diagnosis
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
