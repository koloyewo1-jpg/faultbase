import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', color: '#111827', background: '#fff' }}>

      <style>{`
        @media (max-width: 600px) {
          .nav-links { display: none !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .hero-buttons { flex-direction: column !important; align-items: stretch !important; }
          .hero-buttons a { text-align: center !important; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid #e5e7eb', background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          Kolatron<span style={{ color: '#185FA5' }}>.ai</span>
        </div>
        <div className="nav-links" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="#how" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>How it works</a>
          <a href="#features" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>Features</a>
          <a href="#security" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>Security</a>
          <div style={{ height: 14, width: 1, background: '#e5e7eb' }} />
          <Link href="/world" style={{ fontSize: 13, color: '#185FA5', textDecoration: 'none', fontWeight: 500 }}>World</Link>
        </div>
        <Link href="/diagnose" style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, background: '#185FA5', color: '#fff', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Try demo →
        </Link>
      </nav>

      {/* Hero */}
      <div style={{ padding: '64px 24px 48px', textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#0C447C', background: '#E6F1FB', borderRadius: 20, padding: '4px 14px', marginBottom: 20 }}>
          Safety-first · Audit-ready · AI-assisted
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 700, lineHeight: 1.2, marginBottom: 16, color: '#111827' }}>
          When your machines stop,<br />
          <span style={{ color: '#185FA5' }}>your team needs answers fast.</span>
        </h1>
        <p style={{ fontSize: 'clamp(15px, 2vw, 17px)', color: '#6b7280', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 16px' }}>
          Kolatron.ai gives manufacturing teams instant, structured fault diagnosis — powered by your own approved knowledge base, not random AI guesswork. Built for food, pharma, automotive, chemical, packaging, and every other manufacturing environment.
        </p>
        <div className="hero-buttons" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <a href="#early-access" style={{ padding: '13px 28px', fontSize: 15, fontWeight: 600, background: '#185FA5', color: '#fff', borderRadius: 8, textDecoration: 'none' }}>
            Request early access — free
          </a>
          <Link href="/diagnose" style={{ padding: '12px 24px', fontSize: 14, fontWeight: 500, background: 'transparent', color: '#111827', border: '1px solid #d1d5db', borderRadius: 8, textDecoration: 'none' }}>
            See live demo →
          </Link>
        </div>
        <p style={{ fontSize: 12, color: '#9ca3af' }}>
          <strong style={{ color: '#27500A' }}>Free during early access</strong> — no credit card, no commitment
        </p>
      </div>

      {/* Industries */}
      <div style={{ padding: '20px 24px 40px', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Built for every manufacturing environment</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 700, margin: '0 auto' }}>
          {['Food & Beverage', 'Pharmaceutical', 'Automotive', 'Chemical Processing', 'Medical Devices', 'Packaging', 'Water Treatment', 'Energy & Utilities', 'Heavy Industry'].map(industry => (
            <span key={industry} style={{ padding: '6px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, fontSize: 13, color: '#374151' }}>
              {industry}
            </span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div id="how" style={{ padding: '64px 24px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#185FA5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>How it works</div>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, marginBottom: 12 }}>From equipment manual to instant diagnosis</h2>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.7, maxWidth: 540, marginBottom: 40 }}>
            Your engineers build the knowledge base. Your technicians get the answers. Everything stays inside your approved data.
          </p>
          <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>

            {/* Steps */}
            <div>
              {[
                ['Upload your equipment manual', 'PDF or DOCX. Kolatron extracts every fault code, cause, and action into a structured knowledge base. The manual is deleted within 24 hours — only your structured data remains.'],
                ['Engineers review and approve', 'Nothing reaches a technician until an engineer has reviewed it and a manager has approved it. Draft → Review → Approved. Full version control throughout.'],
                ['Technicians describe what they see', 'Plain English or a fault code — no training needed. "Conveyor belt stopped, red alarm light flashing" is enough to get a structured diagnosis.'],
                ['Kolatron returns a structured diagnosis', 'Safety precautions first. Ranked causes. Step-by-step actions with caution flags. Tools needed, fix time, and escalation guidance.'],
                ['Every diagnosis is logged', 'Who ran it, when, which machine, what the system returned. Full audit trail for ISO, GMP, and any other compliance requirement.'],
              ].map(([title, desc], i) => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < 4 ? '1px solid #e5e7eb' : 'none' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#E6F1FB', color: '#0C447C', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Demo preview card */}
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', alignSelf: 'start' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['#E24B4A', '#EF9F27', '#639922'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', margin: '0 auto' }}>Live diagnosis example</div>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', background: '#fff', borderRadius: 6, padding: '5px 10px', marginBottom: 12, border: '1px solid #e5e7eb' }}>
                  "ERROR LED flashing red, PLC stopped mid-batch"
                </div>
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>⚠ Safety precautions — read first</div>
                  <div style={{ fontSize: 12, color: '#b91c1c', lineHeight: 1.5 }}>• Power down panel before any hardware changes.</div>
                  <div style={{ fontSize: 12, color: '#b91c1c', lineHeight: 1.5, marginTop: 3 }}>• Document the error and notify QA before acting.</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                  <strong style={{ color: '#111827' }}>What this means: </strong>CPU detected a fault — configuration mismatch, memory error, or hardware fault.
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Likely causes (ranked)</div>
                {[['#1', "Configuration mismatch — modules don't match hardware config", 'high'], ['#2', 'Memory card error — faulty or incompatible card', 'medium'], ['#3', 'Internal CPU error — firmware or hardware fault', 'medium']].map(([rank, cause, lh]) => (
                  <div key={rank} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: rank !== '#3' ? '1px solid #f3f4f6' : 'none', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 9, fontWeight: 600, background: '#f3f4f6', color: '#9ca3af', borderRadius: 3, padding: '2px 5px', flexShrink: 0 }}>{rank}</span>
                    <span style={{ fontSize: 12, color: '#111827', flex: 1 }}>{cause}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: lh === 'high' ? '#fef2f2' : '#fffbeb', color: lh === 'high' ? '#991b1b' : '#92400e', flexShrink: 0 }}>{lh}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12, padding: '8px 12px', background: '#E6F1FB', borderRadius: 6, fontSize: 11, color: '#0C447C' }}>
                  → <Link href="/diagnose" style={{ color: '#185FA5', fontWeight: 600, textDecoration: 'none' }}>Try this live with real S7-1200 data →</Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* No match section */}
      <div style={{ padding: '64px 24px', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#185FA5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Knowledge gaps</div>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, marginBottom: 12 }}>What if the answer isn't in the knowledge base?</h2>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.7, maxWidth: 540, marginBottom: 28 }}>
            If Kolatron.ai doesn't know the answer, it says so clearly. The AI is never called without an approved record. No guessing. No invented fixes. Ever.
          </p>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '24px 28px' }}>
            {[
              ['#FCEBEB', '#A32D2D', 'No approved record — AI is not called', 'The system searches only your approved fault records. If nothing matches, the AI is never contacted. Zero risk of an invented answer reaching your technician.'],
              ['#E6F1FB', '#185FA5', 'Technician sees a clear message', '"No approved record found for this fault. Contact your engineer to add this to the knowledge base." They are never left with a guess.'],
              ['#EAF3DE', '#27500A', 'The gap is logged automatically', 'Every unanswered query is captured with machine, description, timestamp, and technician. Engineers see a queue of knowledge gaps to fill.'],
              ['#EAF3DE', '#27500A', 'Engineer adds it, manager approves, it goes live', 'Added as draft, reviewed by engineering, approved, and available for every future diagnosis. Your knowledge base grows with real experience.'],
            ].map(([bg, color, title, desc], i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < 3 ? '1px solid #e5e7eb' : 'none' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: bg as string, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 16, color: color as string }}>→</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per company */}
      <div style={{ padding: '64px 24px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#185FA5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Your workspace</div>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, marginBottom: 12 }}>Every company gets their own private space</h2>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.7, maxWidth: 540, marginBottom: 28 }}>
            Your machines, your fault records, your users, your audit trail. Completely isolated from every other company. Your data is never shared, never visible to others.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              ['AP', 'Acme Foods Ltd', 'acmefoods', '#E6F1FB', '#0C447C'],
              ['BM', 'BioMed UK', 'biomeduk', '#EAF3DE', '#27500A'],
              ['YC', 'Your company', 'yourcompany', '#FAEEDA', '#633806'],
            ].map(([initials, name, sub, bg, color]) => (
              <div key={name as string} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: bg as string, color: color as string, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                    <div style={{ fontSize: 11, color: '#185FA5' }}>{sub}.kolatron.ai</div>
                  </div>
                </div>
                {['Their machines only', 'Their fault records only', 'Their users only', 'Their audit trail only'].map(item => (
                  <div key={item} style={{ fontSize: 12, color: '#6b7280', padding: '3px 0', display: 'flex', gap: 6 }}>
                    <span style={{ color: '#27500A' }}>✓</span> {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="features" style={{ padding: '64px 24px', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#185FA5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Features</div>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, marginBottom: 12 }}>Everything your maintenance team needs</h2>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.7, maxWidth: 540, marginBottom: 28 }}>
            Designed for the reality of regulated manufacturing — where safety, consistency, and auditability are not optional.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {[
              ['Plain English input', 'No fault codes to memorise. Describe what you see in plain English and Kolatron finds the right approved record.'],
              ['Safety precautions first', 'Always shown before causes or actions — by design. Not configurable. This is how the system works.'],
              ['Controlled knowledge base', 'Draft → Review → Approved. Only approved records reach technicians. Full version history on every fault.'],
              ['PDF and DOCX upload', 'Upload any equipment manual. Kolatron structures the fault data ready for your engineers to review and approve.'],
              ['Role-based access', 'Technician · Engineer · Manager · QA. Each role sees exactly what they should — nothing more.'],
              ['Full audit trail', 'Every diagnosis, knowledge change, and approval — timestamped, attributed, and exportable for compliance.'],
              ['Works on any device', 'Browser-based. Works on a tablet mounted next to the machine. No app to install, no updates to manage.'],
              ['Gets smarter over time', 'Unanswered queries become engineering tasks. Technician feedback refines cause rankings.'],
              ['Your data stays yours', 'Export everything at any time. Delete on request within 30 days. You own your knowledge base.'],
            ].map(([title, desc]) => (
              <div key={title as string} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#111827' }}>{title}</div>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security */}
      <div id="security" style={{ padding: '64px 24px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#185FA5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Security and data</div>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, marginBottom: 12 }}>Questions manufacturers always ask</h2>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.7, maxWidth: 540, marginBottom: 28 }}>
            We answer these upfront because your IT and compliance teams will ask before you can use any new software.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {[
              ['Where is our data stored?', 'UK or EU servers (AWS London or Frankfurt). You choose your region. Data never leaves those regions.'],
              ['What happens to our manual after upload?', 'Processed and deleted within 24 hours. Only the structured fault records remain — nothing else is retained.'],
              ['Who can see our data?', 'Only your own users. Complete database-level isolation. Kolatron staff cannot read your fault records.'],
              ['Does our data go to the AI?', 'Only the matched fault record when a diagnosis is run. Anthropic does not train on API data. Covered in our DPA.'],
              ['Is it encrypted?', 'AES-256 at rest. TLS 1.3 in transit. Row-level security isolates each company completely.'],
              ['What if we want to leave?', 'Full data export at any time in JSON or CSV. All data deleted within 30 days of cancellation on request.'],
            ].map(([q, a]) => (
              <div key={q as string} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#111827' }}>{q}</div>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Early access form */}
      <div id="early-access" style={{ padding: '64px 24px', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#27500A', background: '#EAF3DE', borderRadius: 20, padding: '4px 14px', marginBottom: 20 }}>
            Free during early access
          </div>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, marginBottom: 14 }}>
            Ready to give your team better answers?
          </h2>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.7, marginBottom: 28 }}>
            Join the early access programme. We work with you personally to get your first machine's knowledge base live. Free, no commitment, no credit card.
          </p>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '24px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#111827' }}>Request early access</div>
            <iframe
              src="https://tally.so/embed/VL4jRl?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
              width="100%"
              height="320"
              style={{ border: 'none', borderRadius: 8 }}
              title="Early access request form"
            />
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af' }}>
            No credit card · No setup fee · We help you onboard your first machine
          </p>
          <div style={{ marginTop: 20 }}>
            <Link href="/diagnose" style={{ fontSize: 13, color: '#185FA5', textDecoration: 'none', fontWeight: 500 }}>
              Or try the live demo first →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '20px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          Kolatron<span style={{ color: '#185FA5' }}>.ai</span>
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af' }}>
          © 2026 Kolatron.ai · Intelligent maintenance for manufacturing teams
        </div>
      </div>

    </main>
  )
}
