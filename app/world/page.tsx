'use client'

import { useEffect, useRef, useState } from 'react'

// Each entry: [startSeconds, label] — covers the server-side preview phase (~90s)
const LOADING_STAGES: [number, string][] = [
  [0,  'Building geometry…'],
  [75, 'Almost ready…'],
]

const MESHY_EXAMPLES = [
  'Siemens S7-1200 PLC with 4 IO modules',
  'Industrial pneumatic cylinder double acting 50mm bore',
  'Three phase electric motor with cooling fins and junction box',
  'Conveyor belt with drive motor and tracking rollers',
  'Safety relay module on DIN rail',
]

export default function WorldPage() {
  const [meshyPrompt, setMeshyPrompt] = useState('')
  const [meshyLoading, setMeshyLoading] = useState(false)
  const [meshyProgress, setMeshyProgress] = useState(0)
  const [meshyStatusIdx, setMeshyStatusIdx] = useState(0)
  const [meshyModelUrl, setMeshyModelUrl] = useState<string | null>(null)
  const [meshyModelReady, setMeshyModelReady] = useState(false)
  const [meshyUpgrading, setMeshyUpgrading] = useState(false)
  const [meshyError, setMeshyError] = useState('')

  const meshyCanvasRef = useRef<HTMLCanvasElement>(null)
  const meshyAnimIdRef = useRef(0)
  const meshyRendererRef = useRef<any>(null)
  const meshyBlobUrlRef = useRef<string | null>(null)
  // true while loading the refine GLB — skips grey Phong override so real textures show
  const meshyIsRefineRef = useRef(false)
  // increments on each new generation to cancel stale polling
  const meshyGenIdRef = useRef(0)

  // Progress bar + rotating status messages while loading
  useEffect(() => {
    if (!meshyLoading) return
    setMeshyProgress(2)
    setMeshyStatusIdx(0)
    const start = Date.now()

    const tickId = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000
      setMeshyProgress(Math.min(2 + (elapsed / 260) * 92, 94))
      // Find the latest stage whose start time has been reached
      let idx = 0
      for (let i = 0; i < LOADING_STAGES.length; i++) {
        if (elapsed >= LOADING_STAGES[i][0]) idx = i
      }
      setMeshyStatusIdx(idx)
    }, 600)

    return () => clearInterval(tickId)
  }, [meshyLoading])

  // Load GLB into viewer when URL is ready
  useEffect(() => {
    if (!meshyModelUrl) return
    const canvas = meshyCanvasRef.current
    if (!canvas) return
    let cancelled = false

    if (meshyRendererRef.current) { meshyRendererRef.current.dispose(); meshyRendererRef.current = null }
    cancelAnimationFrame(meshyAnimIdRef.current)

    async function loadGLB(cvs: HTMLCanvasElement) {
      const THREE = await import('three')
      // @ts-ignore – not in three's exports map, resolves at runtime via bundler
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader')
      // @ts-ignore
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls')
      if (cancelled) return

      const w = cvs.clientWidth || 680
      const h = 440

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf0ede8)

      const camera = new THREE.PerspectiveCamera(50, w / h, 0.01, 200)
      camera.position.set(0, 0.5, 4)

      scene.add(new THREE.AmbientLight(0xffffff, 3.0))
      const dl1 = new THREE.DirectionalLight(0xffffff, 2.0)
      dl1.position.set(5, 10, 7)
      scene.add(dl1)
      const dl2 = new THREE.DirectionalLight(0xffffff, 1.0)
      dl2.position.set(-5, 5, -5)
      scene.add(dl2)
      const dl3 = new THREE.DirectionalLight(0xffffff, 0.8)
      dl3.position.set(0, -5, 0)
      scene.add(dl3)

      const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0xf0ede8, 1)
      meshyRendererRef.current = renderer

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.07
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.7

      const loader = new GLTFLoader()
      const gltf = await new Promise<any>((resolve, reject) =>
        loader.load(meshyModelUrl!, resolve, undefined, reject),
      )
      if (cancelled) return

      const model = gltf.scene
      const box3 = new THREE.Box3().setFromObject(model)
      const center = box3.getCenter(new THREE.Vector3())
      const size3 = box3.getSize(new THREE.Vector3())
      const maxDim = Math.max(size3.x, size3.y, size3.z)
      model.position.sub(center)
      model.scale.setScalar(2.8 / maxDim)

      // Preview GLBs have no textures — apply grey Phong so geometry is visible.
      // Refine GLBs have real PBR textures — keep their original materials.
      if (!meshyIsRefineRef.current) {
        const phong = new THREE.MeshPhongMaterial({ color: 0xc8c6be, specular: 0x444444, shininess: 30 })
        model.traverse((obj: any) => { if (obj.isMesh) obj.material = phong })
      }

      scene.add(model)

      camera.position.set(0, 0, 3.6)
      camera.lookAt(0, 0, 0)
      controls.target.set(0, 0, 0)
      controls.update()

      if (!cancelled) setMeshyModelReady(true)

      const handleResize = () => {
        const newW = cvs.clientWidth || 680
        camera.aspect = newW / h
        camera.updateProjectionMatrix()
        renderer.setSize(newW, h)
      }
      window.addEventListener('resize', handleResize)

      function animate() {
        meshyAnimIdRef.current = requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      return () => window.removeEventListener('resize', handleResize)
    }

    loadGLB(canvas).catch(err => {
      if (!cancelled) setMeshyError('Failed to display model: ' + (err?.message || 'unknown error'))
    })

    return () => { cancelled = true; cancelAnimationFrame(meshyAnimIdRef.current) }
  }, [meshyModelUrl])

  // Cleanup on unmount
  useEffect(() => () => {
    cancelAnimationFrame(meshyAnimIdRef.current)
    meshyRendererRef.current?.dispose()
    if (meshyBlobUrlRef.current) URL.revokeObjectURL(meshyBlobUrlRef.current)
  }, [])

  async function generateMeshy() {
    if (!meshyPrompt.trim()) return

    // Increment generation ID — any in-flight polling from a prior call will detect
    // the mismatch and stop without updating state.
    const genId = ++meshyGenIdRef.current

    setMeshyLoading(true)
    setMeshyUpgrading(false)
    setMeshyError('')
    setMeshyModelUrl(null)
    setMeshyModelReady(false)
    setMeshyProgress(0)
    meshyIsRefineRef.current = false
    if (meshyBlobUrlRef.current) {
      URL.revokeObjectURL(meshyBlobUrlRef.current)
      meshyBlobUrlRef.current = null
    }

    try {
      // Phase 1: Server handles Claude enhance + preview poll + refine start (~90s)
      const startRes = await fetch('/api/generate-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: meshyPrompt }),
      })
      const startData = await startRes.json()
      if (!startRes.ok) throw new Error(startData.error || 'Generation failed')
      if (meshyGenIdRef.current !== genId) return

      const { preview_glb, refine_task_id } = startData

      // Display the preview GLB immediately (grey geometry, correct shape)
      const previewBytes = atob(preview_glb)
      const previewArray = new Uint8Array(previewBytes.length)
      for (let i = 0; i < previewBytes.length; i++) previewArray[i] = previewBytes.charCodeAt(i)
      const previewBlob = new Blob([previewArray], { type: 'model/gltf-binary' })
      const previewUrl = URL.createObjectURL(previewBlob)
      meshyBlobUrlRef.current = previewUrl
      meshyIsRefineRef.current = false
      setMeshyProgress(100)
      setMeshyModelUrl(previewUrl)
      setMeshyLoading(false)
      setMeshyUpgrading(true)

      // Phase 2: Browser polls refine until SUCCEEDED (up to 3 min)
      const pollDeadline = Date.now() + 180_000
      const poll = async (): Promise<void> => {
        if (meshyGenIdRef.current !== genId) return
        if (Date.now() > pollDeadline) {
          // Timeout — silently keep the preview model, hide the banner
          setMeshyUpgrading(false)
          return
        }
        try {
          const pollRes = await fetch(`/api/poll-3d?task_id=${refine_task_id}`)
          const pollData = await pollRes.json()

          if (pollData.status === 'SUCCEEDED') {
            if (meshyGenIdRef.current !== genId) return
            const glbUrl = pollData.model_urls?.glb
            if (!glbUrl) { setMeshyUpgrading(false); return }

            // Fetch refine GLB via proxy to avoid CORS
            const glbRes = await fetch(`/api/proxy-glb?url=${encodeURIComponent(glbUrl)}`)
            if (!glbRes.ok) { setMeshyUpgrading(false); return }

            const arrayBuffer = await glbRes.arrayBuffer()
            const refineBlob = new Blob([arrayBuffer], { type: 'model/gltf-binary' })
            const refineUrl = URL.createObjectURL(refineBlob)

            // Revoke preview blob, swap in refine model
            if (meshyBlobUrlRef.current) URL.revokeObjectURL(meshyBlobUrlRef.current)
            meshyBlobUrlRef.current = refineUrl
            meshyIsRefineRef.current = true
            setMeshyModelUrl(refineUrl)
            setMeshyUpgrading(false)
          } else if (pollData.status === 'FAILED' || pollData.status === 'EXPIRED') {
            // Silently keep the preview model, hide the banner
            setMeshyUpgrading(false)
          } else {
            setTimeout(poll, 5_000)
          }
        } catch {
          setTimeout(poll, 5_000)
        }
      }
      setTimeout(poll, 5_000)

    } catch (e: any) {
      if (meshyGenIdRef.current === genId) {
        setMeshyError(e.message || 'Generation failed')
        setMeshyLoading(false)
        setMeshyUpgrading(false)
      }
    }
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', color: '#111827', background: '#f9fafb', minHeight: '100vh' }}>

      {/* Top bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>
            Kolatron<span style={{ color: '#185FA5' }}>.ai</span>
          </span>
        </a>
        <div style={{ height: 16, width: 1, background: '#e5e7eb' }} />
        <a href="/diagnose" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>Diagnose</a>
        <a href="/world"    style={{ fontSize: 13, color: '#185FA5', textDecoration: 'none', fontWeight: 600 }}>World</a>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 20px 56px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, color: '#0C447C',
            background: '#E6F1FB', borderRadius: 20, padding: '4px 14px', marginBottom: 12,
          }}>
            Powered by Kolatron.ai
          </div>
          <h1 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>
            3D Component Generator
          </h1>
          <p style={{ fontSize: 15, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
            Describe any industrial machine or component in plain English.
            Kolatron.ai generates a 3D model in seconds.
          </p>
        </div>

        {/* Input card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 18px 14px', marginBottom: 10 }}>
          <input
            value={meshyPrompt}
            onChange={e => setMeshyPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') generateMeshy() }}
            placeholder="e.g. Siemens S7-1200 PLC with 4 IO modules..."
            disabled={meshyLoading}
            style={{
              width: '100%', padding: '11px 13px', fontSize: 15,
              border: '1px solid #d1d5db', borderRadius: 8,
              fontFamily: 'inherit', color: '#111827', lineHeight: 1.5,
              boxSizing: 'border-box', outline: 'none',
              background: meshyLoading ? '#f9fafb' : '#fafafa',
            }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={generateMeshy}
              disabled={meshyLoading || !meshyPrompt.trim()}
              style={{
                padding: '11px 24px', fontSize: 14, fontWeight: 600,
                background: meshyLoading || !meshyPrompt.trim() ? '#94a3b8' : '#d97706',
                color: '#fff', border: 'none', borderRadius: 8,
                cursor: meshyLoading || !meshyPrompt.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {meshyLoading ? 'Generating…' : 'Generate 3D'}
            </button>
            {meshyError && (
              <span style={{ fontSize: 13, color: '#dc2626', lineHeight: 1.4 }}>
                {meshyError}
              </span>
            )}
          </div>
        </div>

        {/* Example prompts */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 32, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>Try:</span>
          {MESHY_EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => setMeshyPrompt(ex)}
              disabled={meshyLoading}
              style={{
                padding: '5px 12px', fontSize: 12, background: '#fff',
                border: '1px solid #d1d5db', borderRadius: 20,
                cursor: meshyLoading ? 'default' : 'pointer', color: '#374151',
              }}
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {meshyLoading && (
          <div style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16,
            padding: '36px 28px 28px', textAlign: 'center', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <div style={{
                width: 46, height: 46, borderRadius: '50%',
                border: '3px solid #f3f4f6', borderTopColor: '#d97706',
                animation: 'kspin 1s linear infinite',
              }} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 4px', minHeight: 24 }}>
              {LOADING_STAGES[meshyStatusIdx][1]}
            </p>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 24px' }}>
              This typically takes 60–90 seconds
            </p>
            <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{
                width: `${meshyProgress}%`, height: '100%',
                background: 'linear-gradient(90deg, #d97706, #fbbf24)',
                borderRadius: 3, transition: 'width 0.7s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: '#e5e7eb' }}>0%</span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>{Math.round(meshyProgress)}%</span>
              <span style={{ fontSize: 11, color: '#e5e7eb' }}>100%</span>
            </div>
          </div>
        )}

        {/* 3D viewer — canvas mounts when URL is ready, reveals after model loads */}
        {meshyModelUrl && (
          <div>
            <div style={{ background: '#f0ede8', borderRadius: 12, overflow: 'hidden', marginBottom: 8, border: '1px solid #e5e7eb', position: 'relative' }}>
              <canvas
                ref={meshyCanvasRef}
                style={{
                  display: 'block', width: '100%', height: 440, cursor: 'grab',
                  visibility: meshyModelReady ? 'visible' : 'hidden',
                }}
              />
              {!meshyModelReady && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 440, gap: 10, color: '#9ca3af', fontSize: 13,
                  position: 'absolute', inset: 0,
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: '2px solid #e5e7eb', borderTopColor: '#d97706',
                    animation: 'kspin 1s linear infinite', flexShrink: 0,
                  }} />
                  Loading model into viewer…
                </div>
              )}
            </div>
            {meshyModelReady && meshyUpgrading && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '8px 0', fontSize: 13, color: '#d97706',
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                  border: '2px solid #fde68a', borderTopColor: '#d97706',
                  animation: 'kspin 1s linear infinite',
                }} />
                Upgrading to textured model…
              </div>
            )}
            {meshyModelReady && !meshyUpgrading && (
              <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', margin: 0 }}>
                Drag to rotate · Scroll to zoom · Auto-rotating · Powered by Kolatron.ai
              </p>
            )}
          </div>
        )}

      </div>

      <style>{`
        @keyframes kspin { to { transform: rotate(360deg) } }
      `}</style>

    </main>
  )
}
