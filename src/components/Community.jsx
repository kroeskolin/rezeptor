import { useAuth } from '../contexts/AuthContext'

export default function Community() {
  const { user, signInWithGoogle, logout } = useAuth()

  // user === undefined → Auth lädt noch
  if (user === undefined) {
    return (
      <div style={{ padding: '80px 22px', textAlign: 'center', color: 'var(--mute)', fontFamily: 'var(--serif)' }}>
        Lädt…
      </div>
    )
  }

  return (
    <div style={{ padding: '80px 22px 0', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
      {user === null ? (
        <>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--cocoa)', textAlign: 'center' }}>
            Noch nicht eingeloggt.
          </div>
          <button
            onClick={() => signInWithGoogle().catch(err => alert('Login-Fehler: ' + err.message))}
            style={{
              background: 'var(--green)', color: 'var(--paper)', border: 'none',
              borderRadius: 14, padding: '15px 28px', fontSize: 16, fontWeight: 700,
              fontFamily: 'var(--serif)', cursor: 'pointer',
            }}>
            Mit Google anmelden
          </button>
        </>
      ) : (
        <>
          {user.photoURL && (
            <img src={user.photoURL} alt="" style={{ width: 64, height: 64, borderRadius: '50%' }} />
          )}
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--espresso)', textAlign: 'center' }}>
            Eingeloggt als<br />
            <strong>{user.displayName}</strong>
          </div>
          <button
            onClick={() => logout()}
            style={{
              background: 'var(--card)', color: 'var(--cocoa)', border: '1px solid var(--line-2)',
              borderRadius: 14, padding: '12px 24px', fontSize: 15,
              fontFamily: 'var(--serif)', cursor: 'pointer',
            }}>
            Abmelden
          </button>
        </>
      )}
    </div>
  )
}