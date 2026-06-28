import { useEffect, useState } from 'react'

// TEMPORÄR: zeigt die echten Safe-Area-/Viewport-Werte auf dem Gerät.
// Nach der Diagnose wieder entfernen.
export default function SafeAreaDebug() {
  const [v, setV] = useState({})
  useEffect(() => {
    const probeTop = document.createElement('div')
    probeTop.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;height:env(safe-area-inset-top,0px)'
    const probeBot = document.createElement('div')
    probeBot.style.cssText = 'position:fixed;bottom:0;left:0;visibility:hidden;height:env(safe-area-inset-bottom,0px)'
    document.body.append(probeTop, probeBot)
    const read = () => {
      const cs = getComputedStyle(document.documentElement)
      const root = document.getElementById('root')
      setV({
        innerH: window.innerHeight,
        screenH: window.screen.height,
        visualH: window.visualViewport ? Math.round(window.visualViewport.height) : '-',
        rootH: root ? Math.round(root.getBoundingClientRect().height) : '-',
        docClientH: document.documentElement.clientHeight,
        safeTop: Math.round(probeTop.getBoundingClientRect().height),
        safeBot: Math.round(probeBot.getBoundingClientRect().height),
        cssSat: (cs.getPropertyValue('--sat') || '-').trim(),
        cssSab: (cs.getPropertyValue('--sab') || '-').trim(),
        dpr: window.devicePixelRatio,
      })
    }
    read()
    const t = [120, 400, 1000].map(ms => setTimeout(read, ms))
    window.addEventListener('resize', read)
    window.visualViewport && window.visualViewport.addEventListener('resize', read)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) read() })
    return () => { t.forEach(clearTimeout); window.removeEventListener('resize', read); probeTop.remove(); probeBot.remove() }
  }, [])
  const Row = ({ k, val }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ opacity: 0.7 }}>{k}</span><b>{String(val)}</b>
    </div>
  )
  return (
    <div style={{
      position: 'fixed', left: 6, bottom: 6, zIndex: 99999,
      background: 'rgba(0,0,0,0.82)', color: '#9EE6A0', font: '11px/1.45 monospace',
      padding: '8px 10px', borderRadius: 8, minWidth: 188, pointerEvents: 'none',
      maxWidth: '70vw',
    }}>
      <div style={{ color: '#fff', fontWeight: 700, marginBottom: 4 }}>SAFE-AREA DEBUG</div>
      <Row k="innerHeight" val={v.innerH} />
      <Row k="screen.height" val={v.screenH} />
      <Row k="visualViewport.h" val={v.visualH} />
      <Row k="#root height" val={v.rootH} />
      <Row k="doc.clientH" val={v.docClientH} />
      <Row k="env top" val={v.safeTop + 'px'} />
      <Row k="env bottom" val={v.safeBot + 'px'} />
      <Row k="--sat" val={v.cssSat} />
      <Row k="--sab" val={v.cssSab} />
      <Row k="devicePixelRatio" val={v.dpr} />
    </div>
  )
}
