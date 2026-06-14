import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './themes.css'

// ── Safe-Area-Inset-Fix für iOS-PWAs ──
// iOS liefert env(safe-area-inset-top) beim Kaltstart im Hochformat manchmal als 0,
// bis ein Re-Layout (z.B. Drehen) erfolgt. Wir messen den echten Wert per JS und
// schreiben ihn in eine stabile CSS-Variable --sat, die das Layout dann nutzt.
function applySafeAreaInsets() {
  const probe = document.createElement('div')
  probe.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'visibility: hidden',
    'pointer-events: none',
    'height: env(safe-area-inset-top, 0px)',
  ].join(';')
  document.body.appendChild(probe)

  const measure = () => {
    const top = probe.getBoundingClientRect().height
    // Nur setzen, wenn ein sinnvoller Wert vorliegt; sonst den bisherigen behalten
    if (top > 0) {
      document.documentElement.style.setProperty('--sat', `${top}px`)
    }
  }

  // Mehrfach messen, um den iOS-Timing-Bug abzufangen:
  measure()
  requestAnimationFrame(measure)
  setTimeout(measure, 120)
  setTimeout(measure, 400)
  setTimeout(measure, 1000)

  // Bei Orientierungswechsel / Resize / Wiederanzeige neu messen
  window.addEventListener('resize', measure)
  window.addEventListener('orientationchange', () => setTimeout(measure, 120))
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(measure, 120)
  })
}

applySafeAreaInsets()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)