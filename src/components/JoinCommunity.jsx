import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

// Beitritts-UI für die Community: Name eingeben (anonym) oder mit Google.
// onDone wird nach erfolgreichem Beitritt aufgerufen (z. B. um ein Sheet zu schließen).
export default function JoinCommunity({ onDone }) {
  const { signInWithName, signInWithGoogle } = useAuth()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const join = async () => {
    const clean = name.trim()
    if (!clean || busy) return
    setBusy(true)
    try {
      await signInWithName(clean)
      if (onDone) onDone()
    } catch (e) {
      alert('Beitritt fehlgeschlagen: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  const google = async () => {
    try {
      await signInWithGoogle()
      if (onDone) onDone()
    } catch (e) {
      alert('Login-Fehler: ' + e.message)
    }
  }

  const hintStyle = { padding: '8px 2px 0', fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--mute)', fontStyle: 'italic', lineHeight: 1.4 }

  return (
    <div>
      {/* Google zuerst */}
      <button onClick={google} style={{
        width: '100%', background: 'var(--card)', color: 'var(--green)',
        border: '1.5px solid var(--green)', borderRadius: 12, padding: '12px 16px',
        fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
      }}>
        Mit Google anmelden
      </button>
      <div style={hintStyle}>
        Mit deinem Google-Konto kannst du dich auf verschiedenen Geräten bei Rezeptor einloggen und den Account „mitnehmen".
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }} />
        <span style={{ fontFamily: 'var(--serif)', fontSize: 12, fontWeight: 700, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>oder</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }} />
      </div>

      {/* Name darunter */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') join() }}
          placeholder="Dein Name…"
          maxLength={30}
          style={{
            flex: 1, border: '1px solid var(--line-2)', borderRadius: 12,
            padding: '11px 14px', fontFamily: 'var(--serif)', fontSize: 15,
            color: 'var(--espresso)', background: 'var(--card)', outline: 'none',
          }}
        />
        <button onClick={join} disabled={!name.trim() || busy} style={{
          background: 'var(--card)', color: 'var(--espresso)',
          border: '1px solid var(--line-2)',
          borderRadius: 12, padding: '0 18px', fontFamily: 'var(--serif)',
          fontSize: 15, fontWeight: 700,
          cursor: (!name.trim() || busy) ? 'default' : 'pointer',
          opacity: (!name.trim() || busy) ? 0.5 : 1,
        }}>
          {busy ? '…' : 'Beitreten'}
        </button>
      </div>
      <div style={hintStyle}>
        Bei Login mit deinem Namen gilt das Konto nur auf diesem Gerät.
      </div>
    </div>
  )
}
