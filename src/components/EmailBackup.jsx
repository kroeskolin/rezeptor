import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

function friendly(code) {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'E-Mail oder Passwort stimmt nicht.'
    case 'auth/user-not-found': return 'Zu dieser E-Mail gibt es noch kein Backup.'
    case 'auth/email-already-in-use': return 'Für diese E-Mail gibt es schon ein Backup — wechsle zu „Anmelden".'
    case 'auth/weak-password': return 'Das Passwort ist zu kurz (mindestens 6 Zeichen).'
    case 'auth/invalid-email': return 'Diese E-Mail sieht nicht gültig aus.'
    case 'auth/too-many-requests': return 'Zu viele Versuche — bitte später nochmal.'
    case 'auth/network-request-failed': return 'Keine Verbindung. Bist du online?'
    default: return null
  }
}

// Backup per E-Mail + Passwort: einrichten ODER auf neuem Gerät wiederherstellen.
export default function EmailBackup({ onDone }) {
  const { signUpWithEmail, signInWithEmail, resetPassword } = useAuth()
  const [mode, setMode] = useState('signup') // 'signup' = einrichten, 'signin' = wiederherstellen
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { ok: boolean, text }

  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 6

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true); setMsg(null)
    try {
      if (mode === 'signup') await signUpWithEmail(email, password)
      else await signInWithEmail(email, password)
      setMsg({ ok: true, text: mode === 'signup' ? 'Backup ist eingerichtet! 🎉' : 'Angemeldet — deine Rezepte werden geladen.' })
      if (onDone) setTimeout(onDone, 1100)
    } catch (e) {
      setMsg({ ok: false, text: friendly(e?.code) || ('Fehler: ' + (e?.message || 'unbekannt')) })
    } finally {
      setBusy(false)
    }
  }

  const forgot = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) { setMsg({ ok: false, text: 'Bitte zuerst deine E-Mail eintragen.' }); return }
    try { await resetPassword(email); setMsg({ ok: true, text: 'E-Mail zum Zurücksetzen ist unterwegs.' }) }
    catch (e) { setMsg({ ok: false, text: friendly(e?.code) || 'Konnte keine E-Mail senden.' }) }
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', border: '1px solid var(--line-2)', borderRadius: 12,
    padding: '11px 14px', fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--espresso)',
    background: 'var(--card)', outline: 'none', marginTop: 10,
  }

  return (
    <div>
      <input type="email" inputMode="email" autoComplete="email" placeholder="E-Mail"
        value={email} onChange={e => setEmail(e.target.value)} style={{ ...inputStyle, marginTop: 0 }} />
      <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        placeholder="Passwort (mind. 6 Zeichen)" value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }} style={inputStyle} />

      <button onClick={submit} disabled={!valid || busy} style={{
        marginTop: 14, width: '100%', padding: '13px', borderRadius: 14, border: 'none',
        background: 'var(--green)', color: '#F9FBF8', fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600,
        cursor: 'pointer', opacity: (!valid || busy) ? 0.5 : 1,
      }}>
        {busy ? 'Einen Moment …' : (mode === 'signup' ? 'Backup sichern' : 'Anmelden')}
      </button>

      {msg && (
        <div style={{
          marginTop: 12, padding: '10px 12px', borderRadius: 10,
          background: msg.ok ? 'var(--sage)' : 'var(--rose)',
          border: `1px solid ${msg.ok ? 'var(--sage-2)' : 'var(--rose-2)'}`,
          fontFamily: 'var(--serif)', fontSize: 13.5, color: 'var(--espresso)',
        }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, gap: 10 }}>
        <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMsg(null) }}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--green)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
          {mode === 'signup' ? 'Schon ein Backup? Anmelden' : 'Neu? Backup einrichten'}
        </button>
        {mode === 'signin' && (
          <button onClick={forgot}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--mute)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
            Passwort vergessen?
          </button>
        )}
      </div>
    </div>
  )
}
