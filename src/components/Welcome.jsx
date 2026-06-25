import { Wordmark } from './DesignTokens'
import JoinCommunity from './JoinCommunity'

// Einmaliger Begrüßungs-/Login-Screen beim ersten Start (wenn nicht eingeloggt).
// onClose wird nach einer Wahl aufgerufen (Login erfolgreich oder „ohne Konto").
export default function Welcome({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000, background: 'var(--paper)',
      overflowY: 'auto',
    }}>
      <div style={{
        minHeight: '100%', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 'calc(40px + env(safe-area-inset-top, 0px)) 26px 40px',
        maxWidth: 460, margin: '0 auto', width: '100%',
      }}>
        <div style={{ marginBottom: 18 }}>
          <Wordmark size={34} color="var(--green)" />
        </div>

        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--espresso)', lineHeight: 1.15, margin: '0 0 8px' }}>
          Willkommen!
        </h1>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--cocoa)', lineHeight: 1.5, margin: '0 0 24px' }}>
          Sammle, organisiere und teile deine Rezepte. Wie möchtest du starten?
        </p>

        {/* Login-Optionen (Google + Name) mit ihren Hinweisen */}
        <JoinCommunity onDone={onClose} />

        {/* Ohne Konto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }} />
          <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--mute)' }}>oder</span>
          <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }} />
        </div>

        <button onClick={onClose} style={{
          width: '100%', background: 'var(--paper-2)', color: 'var(--espresso)',
          border: '1px solid var(--line-2)', borderRadius: 12, padding: '12px 16px',
          fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>
          Erstmal ohne Konto
        </button>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--mute)', fontStyle: 'italic', margin: '10px 2px 0', lineHeight: 1.4 }}>
          Ohne Konto bleiben deine Rezepte nur auf diesem Gerät. Du kannst dich jederzeit in den Einstellungen anmelden.
        </p>
      </div>
    </div>
  )
}
