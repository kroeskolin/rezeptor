import { useState } from 'react'
import { Icon } from './DesignTokens'

function isIOS() {
  const ua = navigator.userAgent || ''
  return /iphone|ipad|ipod/i.test(ua)
}
function isStandalone() {
  return window.navigator.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches
}

// Glühbirne (kein passendes Icon im Set)
function Bulb() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'block' }}>
      <path d="M9.5 18h5M10 21h4M12 3a6 6 0 0 0-3.8 10.6c.6.5 1 1.2 1.1 2.0h5.4c.1-.8.5-1.5 1.1-2.0A6 6 0 0 0 12 3z"
        stroke="var(--green)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// iOS-Teilen-Symbol (Kästchen mit Pfeil nach oben) – inline im Text
function ShareGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: '-2px', margin: '0 1px' }}>
      <path d="M12 3v11M12 3l-3.2 3.2M12 3l3.2 3.2" stroke="var(--cocoa)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 10H5.5v9h13v-9h-2" stroke="var(--cocoa)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Banner({ leading, children, action, onAction, onClose }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 11,
      background: 'var(--paper-2)', border: '1px solid var(--line-2)',
      borderRadius: 14, padding: '11px 12px', margin: '0 0 14px',
    }}>
      {leading}
      <div style={{ flex: 1, minWidth: 0, fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--cocoa)', lineHeight: 1.4 }}>
        {children}
        {action && (
          <button onClick={onAction} style={{
            background: 'none', border: 'none', padding: 0, marginLeft: 6, cursor: 'pointer',
            fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 700, color: 'var(--green)',
            textDecoration: 'underline',
          }}>
            {action}
          </button>
        )}
      </div>
      <button onClick={onClose} aria-label="Hinweis schließen" style={{
        flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
        background: 'var(--card)', border: '1px solid var(--line-2)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="x" size={11} color="var(--mute)" strokeWidth={2.2} />
      </button>
    </div>
  )
}

// Zeigt höchstens EINEN Hinweis: zuerst der iOS-„Zum Home-Bildschirm"-Tipp,
// sonst (ausgeloggt) der Sicherungs-Hinweis.
export default function OnboardingHints({ user, onLogin }) {
  const [installDismissed, setInstallDismissed] = useState(() => !!localStorage.getItem('rezeptor-hint-install'))
  const [loginDismissed, setLoginDismissed] = useState(() => !!localStorage.getItem('rezeptor-hint-login'))

  const showInstall = isIOS() && !isStandalone() && !installDismissed
  const showLogin = user === null && !loginDismissed && !showInstall

  if (showInstall) {
    return (
      <Banner
        leading={<Bulb />}
        onClose={() => { localStorage.setItem('rezeptor-hint-install', '1'); setInstallDismissed(true) }}
      >
        <b style={{ fontWeight: 700 }}>Tipp von der Chefköchin:</b> Über <ShareGlyph /> Teilen → „Zum Home-Bildschirm" wird Rezeptor zur App.
      </Banner>
    )
  }

  if (showLogin) {
    return (
      <Banner
        leading={<Icon name="globe" size={18} color="var(--green)" />}
        action="Anmelden"
        onAction={onLogin}
        onClose={() => { localStorage.setItem('rezeptor-hint-login', '1'); setLoginDismissed(true) }}
      >
        Melde dich an, um deine Rezepte zu sichern und auf allen Geräten zu haben.
      </Banner>
    )
  }

  return null
}
