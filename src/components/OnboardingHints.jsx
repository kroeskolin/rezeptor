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

function Banner({ icon, children, action, onAction, onClose }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 11,
      background: 'var(--paper-2)', border: '1px solid var(--line-2)',
      borderRadius: 14, padding: '11px 12px', margin: '0 0 14px',
    }}>
      <Icon name={icon} size={18} color="var(--green)" />
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
        icon="share"
        onClose={() => { localStorage.setItem('rezeptor-hint-install', '1'); setInstallDismissed(true) }}
      >
        Tipp: Über <b style={{ fontWeight: 700 }}>Teilen → „Zum Home-Bildschirm"</b> wird Rezeptor zur App.
      </Banner>
    )
  }

  if (showLogin) {
    return (
      <Banner
        icon="globe"
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
