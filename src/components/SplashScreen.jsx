import { useEffect, useState } from 'react'
import './SplashScreen.css'

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('show') // 'show' | 'fadeout'

  useEffect(() => {
    // Nach 2s Fade-out starten
    const t1 = setTimeout(() => setPhase('fadeout'), 2000)
    // Nach 2.5s komplett fertig
    const t2 = setTimeout(() => onDone(), 2500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className={`splash ${phase === 'fadeout' ? 'splash-fadeout' : ''}`}>
      <div className="splash-logo">
        <svg viewBox="0 0 200 200" width="160" height="160">

          {/* R Stamm — wird gezeichnet */}
          <path
            className="splash-r-stem"
            d="M60 155 L60 48"
            stroke="#C8D9BF" strokeWidth="6" strokeLinecap="round" fill="none"
          />

          {/* R Bogen — wird gezeichnet nach Stamm */}
          <path
            className="splash-r-arc"
            d="M60 48 C108 46 130 66 130 88 C130 110 108 130 60 130"
            stroke="#C8D9BF" strokeWidth="5.5" strokeLinecap="round" fill="none"
          />

          {/* R Bein — wird gezeichnet nach Bogen */}
          <path
            className="splash-r-leg"
            d="M60 130 C95 130 116 144 136 166"
            stroke="#C8D9BF" strokeWidth="5.5" strokeLinecap="round" fill="none"
          />

          {/* Gabel — fällt von oben, bounced auf R-Bogen */}
          <g className="splash-fork">
            {/* Zinken */}
            <path d="M124 88 L124 68" stroke="#F9FBF8" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
            <path d="M136 88 L136 68" stroke="#F9FBF8" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
            <path d="M148 88 L148 68" stroke="#F9FBF8" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
            {/* Verbindungsbogen */}
            <path d="M124 88 Q136 93 148 88" stroke="#F9FBF8" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
            {/* Stiel */}
            <path d="M136 88 L136 140" stroke="#F9FBF8" strokeWidth="4" strokeLinecap="round" fill="none"/>
          </g>

        </svg>

        <div className="splash-wordmark">
          Rezept<em>or</em>
        </div>
      </div>
    </div>
  )
}
