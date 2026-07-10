import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

// Bildausschnitt wählen: Bild im Rahmen verschieben (1 Finger), zoomen
// (2 Finger oder Regler). "Übernehmen" rendert den sichtbaren Ausschnitt
// als neues Bild (JPEG). Rahmen-Seitenverhältnis ≈ Foto-Header im Detail.
const ASPECT = 1.2 // Breite : Höhe

export default function ImageCropper({ src, onDone, onClose }) {
  const frameRef = useRef(null)
  const imgRef = useRef(null) // { el, iw, ih }
  const [ready, setReady] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  // Gesten-Zustand (Refs, um Re-Renders während der Geste zu vermeiden)
  const gesture = useRef(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => { imgRef.current = { el: img, iw: img.width, ih: img.height }; setReady(true) }
    img.src = src
  }, [src])

  const frameSize = () => {
    const el = frameRef.current
    return el ? { W: el.clientWidth, H: el.clientHeight } : { W: 1, H: 1 }
  }

  // Skala, bei der das Bild den Rahmen exakt abdeckt
  const coverScale = () => {
    const { W, H } = frameSize()
    const { iw, ih } = imgRef.current
    return Math.max(W / iw, H / ih)
  }

  const clampOffset = (o, z) => {
    const { W, H } = frameSize()
    const { iw, ih } = imgRef.current
    const st = coverScale() * z
    const maxX = Math.max(0, (iw * st - W) / 2)
    const maxY = Math.max(0, (ih * st - H) / 2)
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) }
  }

  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      gesture.current = { type: 'pan', x: e.touches[0].clientX, y: e.touches[0].clientY, start: offset }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      gesture.current = { type: 'pinch', dist: Math.hypot(dx, dy), startZoom: zoom }
    }
  }
  const onTouchMove = (e) => {
    e.preventDefault()
    const g = gesture.current
    if (!g) return
    if (g.type === 'pan' && e.touches.length === 1) {
      const nx = g.start.x + (e.touches[0].clientX - g.x)
      const ny = g.start.y + (e.touches[0].clientY - g.y)
      setOffset(clampOffset({ x: nx, y: ny }, zoom))
    } else if (g.type === 'pinch' && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const z = Math.min(3, Math.max(1, g.startZoom * (Math.hypot(dx, dy) / g.dist)))
      setZoom(z)
      setOffset(o => clampOffset(o, z))
    }
  }
  const onTouchEnd = () => { gesture.current = null }

  // Maus (Desktop-Test)
  const onMouseDown = (e) => {
    gesture.current = { type: 'pan', x: e.clientX, y: e.clientY, start: offset }
    const move = (ev) => {
      const g = gesture.current
      if (!g) return
      setOffset(clampOffset({ x: g.start.x + (ev.clientX - g.x), y: g.start.y + (ev.clientY - g.y) }, zoom))
    }
    const up = () => { gesture.current = null; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  const apply = () => {
    const { W, H } = frameSize()
    const { el, iw, ih } = imgRef.current
    const st = coverScale() * zoom
    // Rahmen-Ecke (0,0) in Bildkoordinaten
    const x0 = iw / 2 - (W / 2 + offset.x) / st
    const y0 = ih / 2 - (H / 2 + offset.y) / st
    const outW = 1080
    const outH = Math.round(outW / ASPECT)
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    canvas.getContext('2d').drawImage(el, x0, y0, W / st, H / st, 0, 0, outW, outH)
    onDone(canvas.toDataURL('image/jpeg', 0.85))
  }

  const st = ready ? coverScale() * zoom : 1
  const dims = ready ? { w: imgRef.current.iw * st, h: imgRef.current.ih * st } : { w: 0, h: 0 }

  return createPortal((
    <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: '#F9FBF8', marginBottom: 14, fontStyle: 'italic' }}>
        Verschieben & zoomen, bis der Ausschnitt passt
      </div>
      <div
        ref={frameRef}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        style={{
          width: '100%', maxWidth: 480, aspectRatio: String(ASPECT),
          overflow: 'hidden', borderRadius: 16, position: 'relative',
          outline: '2px solid rgba(255,255,255,0.85)', touchAction: 'none',
          cursor: 'grab', background: '#111',
        }}
      >
        {ready && (
          <img
            src={src} alt="" draggable={false}
            style={{
              position: 'absolute', left: '50%', top: '50%',
              width: dims.w, height: dims.h, maxWidth: 'none',
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              pointerEvents: 'none', userSelect: 'none',
            }}
          />
        )}
      </div>
      <input
        type="range" min="1" max="3" step="0.01" value={zoom}
        onChange={e => { const z = Number(e.target.value); setZoom(z); setOffset(o => clampOffset(o, z)) }}
        style={{ width: '80%', maxWidth: 380, marginTop: 18, accentColor: 'var(--sage-2)' }}
      />
      <div style={{ display: 'flex', gap: 10, marginTop: 18, width: '100%', maxWidth: 480 }}>
        <button onClick={onClose} style={{
          flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.4)',
          background: 'none', color: '#F9FBF8', fontFamily: 'var(--serif)', fontSize: 15, cursor: 'pointer',
        }}>
          Abbrechen
        </button>
        <button onClick={apply} disabled={!ready} style={{
          flex: 1, padding: '13px', borderRadius: 14, border: 'none',
          background: 'var(--green)', color: '#F9FBF8', fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}>
          Übernehmen
        </button>
      </div>
    </div>
  ), document.body)
}
