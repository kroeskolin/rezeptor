import { Wordmark } from './DesignTokens'
import JoinCommunity from './JoinCommunity'

// Einmaliger Begrüßungs-/Login-Screen beim ersten Start (Overlay).
// X bzw. Hintergrund-Tippen = „erstmal ohne Konto". onClose nach jeder Wahl.
export default function Welcome({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', background: 'var(--paper)', borderRadius: 24,
          width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto',
          padding: '30px 22px 26px',
        }}
      >
        {/* Schließen (= ohne Konto) */}
        <button onClick={onClose} aria-label="Schließen" style={{
          position: 'absolute', top: 14, right: 14, width: 34, height: 34,
          borderRadius: '50%', background: 'var(--card)', border: '1px solid var(--line-2)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, color: 'var(--espresso)', lineHeight: 1,
        }}>
          ✕
        </button>

        {/* Logo mittig */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Wordmark size={30} color="var(--green)" />
        </div>

        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--espresso)', lineHeight: 1.15, margin: '0 0 6px', textAlign: 'center' }}>
          Willkommen!
        </h1>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--cocoa)', lineHeight: 1.5, margin: '0 0 22px', textAlign: 'center' }}>
          Wie möchtest du starten?
        </p>

        {/* Methode 1 + 2 (Google / Name), getrennt durch „oder" */}
        <JoinCommunity onDone={onClose} />

        {/* Trenner zur 3. Methode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }} />
          <span style={{ fontFamily: 'var(--serif)', fontSize: 12, fontWeight: 700, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>oder</span>
          <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }} />
        </div>

        {/* Methode 3: ohne Konto */}
        <button onClick={onClose} style={{
          width: '100%', background: 'var(--paper-2)', color: 'var(--espresso)',
          border: '1px solid var(--line-2)', borderRadius: 12, padding: '12px 16px',
          fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>
          Erstmal ohne Konto
        </button>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--mute)', fontStyle: 'italic', margin: '8px 2px 0', lineHeight: 1.4 }}>
          Deine Rezepte bleiben nur auf diesem Gerät. Du kannst dich jederzeit in den Einstellungen anmelden.
        </p>
      </div>
    </div>
  )
}
