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

  return (
    <div>
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
          background: 'var(--green)', color: 'var(--paper)', border: 'none',
          borderRadius: 12, padding: '0 18px', fontFamily: 'var(--serif)',
          fontSize: 15, fontWeight: 700,
          cursor: (!name.trim() || busy) ? 'default' : 'pointer',
          opacity: (!name.trim() || busy) ? 0.5 : 1,
        }}>
          {busy ? '…' : 'Beitreten'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }} />
        <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--mute)' }}>oder</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }} />
      </div>

      <button onClick={google} style={{
        width: '100%', background: 'var(--card)', color: 'var(--espresso)',
        border: '1px solid var(--line-2)', borderRadius: 12, padding: '11px 16px',
        fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
      }}>
        Mit Google anmelden
      </button>

      <div style={{ padding: '10px 2px 0', fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--mute)', fontStyle: 'italic' }}>
        Mit Namen beizutreten ist am schnellsten. Hinweis: Dein Konto gilt dann nur auf diesem Gerät.
      </div>
    </div>
  )
}
