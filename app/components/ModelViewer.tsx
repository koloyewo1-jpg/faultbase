'use client'
import { useEffect, useRef, useState } from 'react'
import type * as THREE_T from 'three'

interface Props {
  modelPath: string
  faultZone: string
  title: string
}

export default function ModelViewer({ modelPath, faultZone, title }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    let renderer: THREE_T.WebGLRenderer | null = null
    let animId = 0

    // Collect event listeners for cleanup
    type Listener = [EventTarget, string, (e: any) => void]
    const listeners: Listener[] = []
    function on(target: EventTarget, event: string, fn: (e: any) => void) {
      target.addEventListener(event, fn)
      listeners.push([target, event, fn])
    }

    async function init(cvs: HTMLCanvasElement) {
      const THREE = await import('three')
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      if (cancelled) return

      const w = cvs.clientWidth || cvs.offsetWidth || 580
      const h = 350

      // Scene
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf9fafb)

      // Camera
      const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000)
      camera.position.set(0, 0.5, 3.5)

      // Lighting
      scene.add(new THREE.AmbientLight(0xffffff, 1.2))
      const dir = new THREE.DirectionalLight(0xffffff, 1.8)
      dir.position.set(5, 8, 5)
      scene.add(dir)
      const fill = new THREE.DirectionalLight(0xffffff, 0.4)
      fill.position.set(-5, 2, -3)
      scene.add(fill)

      // Renderer
      renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      // Load GLB
      const loader = new GLTFLoader()
      try {
        const gltf = await new Promise<{ scene: THREE_T.Group }>((resolve, reject) => {
          loader.load(modelPath, resolve as any, undefined, reject)
        })
        if (cancelled) return

        const model = gltf.scene

        // Fit model to view
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const scaleFactor = 2 / maxDim
        model.scale.setScalar(scaleFactor)
        model.position.set(
          -center.x * scaleFactor,
          -center.y * scaleFactor,
          -center.z * scaleFactor,
        )
        scene.add(model)
        setLoading(false)

        // Rotation state
        let rotation = 0
        let isDragging = false
        let lastX = 0

        on(cvs, 'mousedown', (e: MouseEvent) => { isDragging = true; lastX = e.clientX })
        on(window, 'mousemove', (e: MouseEvent) => {
          if (!isDragging) return
          rotation += (e.clientX - lastX) * 0.01
          lastX = e.clientX
        })
        on(window, 'mouseup', () => { isDragging = false })
        on(cvs, 'touchstart', (e: TouchEvent) => { isDragging = true; lastX = e.touches[0].clientX })
        on(window, 'touchmove', (e: TouchEvent) => {
          if (!isDragging) return
          rotation += (e.touches[0].clientX - lastX) * 0.01
          lastX = e.touches[0].clientX
        })
        on(window, 'touchend', () => { isDragging = false })

        function animate() {
          animId = requestAnimationFrame(animate)
          if (!isDragging) rotation += 0.004
          model.rotation.y = rotation
          renderer!.render(scene, camera)
        }
        animate()

      } catch {
        if (!cancelled) setError(true)
      }
    }

    init(canvas)

    return () => {
      cancelled = true
      cancelAnimationFrame(animId)
      listeners.forEach(([t, e, fn]) => t.removeEventListener(e, fn))
      renderer?.dispose()
    }
  }, [modelPath])

  if (error) return null

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 16,
    }}>
      <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {faultZone}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 2 }}>
          {title}
        </div>
      </div>

      <div style={{ position: 'relative', height: 350 }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f9fafb',
          }}>
            <div style={{
              width: 32, height: 32,
              border: '3px solid #e5e7eb',
              borderTop: '3px solid #185FA5',
              borderRadius: '50%',
              animation: 'mv-spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes mv-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab' }}
        />
      </div>

      <div style={{ padding: '8px 16px 10px', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
        Drag to rotate
      </div>
    </div>
  )
}
