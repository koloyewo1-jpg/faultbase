'use client'
import { useState, useRef } from 'react'

export default function DiagnosePage() {
  const inputRef = useRef<HTMLTextAreaElement>(null)
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
      const res = await fetch(window.location.origin + '/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: 's7-1200-cpu', input: trimmed }),
      })
      const data = await res.json()
      if (!data.matched) {
        setError(data.message)
      } else {
        setResult(data.diagnosis)
      }
    } catch {
      setError('Network error — please try again')
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

      <div style={{ maxWidth: 580, margin: '0 auto', padding: '20px 16px' }}>

        {/* Input card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 16px', marginBottom: 16 }}>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Machine
            </div>
            <select style={{ width: '100%', padding: '10px 12px', fontSize: 15, border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#111827' }}>
              <option value="s7-1200-cpu">S7-1200 CPU</option>
              <option value="s7-1200-sm">S7-1200 Signal Module</option>
              <option value="s7-1200-iolink">S7-1200 IO-Link Master</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Describe the fault
            </div>
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
            style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 700, background: loading ? '#93c5fd' : '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'system-ui, sans-serif', display: 'block' }}
          >
            {loading ? 'Running diagnosis...' : 'Run diagnosis'}
          </button>

        </div>

        {/* Examples */}
        {showExamples && !result && !error && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Try these examples
            </div>
            {[
              'ERROR LED flashing red on CPU',
              'CPU went to STOP unexpectedly during production',
              'Wire break alarm on IO-Link port',
              'All LEDs flashing at the same time',
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
              Type anything in plain English — fault code, what you see, what you hear. No training needed.
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#92400e', lineHeight: 1.5, marginBottom: 12 }}>
            {error}
            <div style={{ marginTop: 10 }}>
              <button type="button" onClick={reset} style={{ color: '#185FA5', cursor: 'pointer', fontSize: 13, background: 'none', border: 'none', padding: 0, fontFamily: 'system-ui, sans-serif' }}>
                ← Try again
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div>

            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                ⚠ Safety precautions — read before proceeding
              </div>
              {result.safety_precautions?.map((p: string, i: number) => (
                <div key={i} style={{ fontSize: 13, color: '#b91c1c', padding: '3px 0', display: 'flex', gap: 8, lineHeight: 1.5 }}>
                  <span style={{ flexShrink: 0 }}>•</span><span>{p}</span>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>What this means</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{result.meaning}</div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Likely causes (ranked)
              </div>
              {result.top_causes?.map((c: any) => (
                <div key={c.rank} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, background: '#f3f4f6', color: '#6b7280', borderRadius: 4, padding: '2px 6px', flexShrink: 0, marginTop: 2 }}>#{c.rank}</span>
                  <span style={{ fontSize: 13, color: '#111827', flex: 1, lineHeight: 1.5 }}>{c.cause}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, flexShrink: 0, background: c.likelihood === 'high' ? '#fef2f2' : c.likelihood === 'medium' ? '#fffbeb' : '#f3f4f6', color: c.likelihood === 'high' ? '#991b1b' : c.likelihood === 'medium' ? '#92400e' : '#6b7280' }}>{c.likelihood}</span>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Step-by-step actions
              </div>
              {result.actions?.map((a: any) => (
                <div key={a.step} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6', background: a.caution ? '#fffbeb' : 'transparent' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', minWidth: 20, flexShrink: 0 }}>{a.step}.</span>
                  <span style={{ fontSize: 13, color: '#111827', flex: 1, lineHeight: 1.5 }}>{a.instruction}</span>
                  {a.caution && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#92400e', background: '#fef3c7', borderRadius: 4, padding: '2px 6px', flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>CAUTION</span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Tools required</div>
                {result.tools_required?.map((t: string, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>• {t}</div>
                ))}
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Estimated fix time</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{result.estimated_fix_mins} min</div>
              </div>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Escalation guidance</div>
              <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>{result.escalation_guidance}</div>
            </div>

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
