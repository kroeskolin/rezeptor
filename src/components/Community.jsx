import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getFeed } from '../db/community'
import CommunityRecipeDetail from './CommunityRecipeDetail'

export default function Community({ onLocalSave }) {
  const { user, signInWithGoogle, logout } = useAuth()
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFeedRecipe, setSelectedFeedRecipe] = useState(null)

  useEffect(() => {
    getFeed()
      .then(setFeed)
      .catch(err => console.error('Feed laden fehlgeschlagen:', err))
      .finally(() => setLoading(false))
  }, [])

  // Auth lädt noch
  if (user === undefined) {
    return (
      <div style={{ padding: '80px 22px', textAlign: 'center', color: 'var(--mute)', fontFamily: 'var(--serif)' }}>
        Lädt…
      </div>
    )
  }

  // Ein Feed-Rezept ist geöffnet → Detailansicht statt Feed
  if (selectedFeedRecipe) {
    return (
      <CommunityRecipeDetail
        recipe={selectedFeedRecipe}
        onBack={() => setSelectedFeedRecipe(null)}
        onLocalSave={onLocalSave}
      />
    )
  }

  return (
    <div style={{ padding: '60px 22px 0' }}>
      {/* Kopf: Titel + Login-Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 30, color: 'var(--espresso)', lineHeight: 1.1, margin: 0 }}>
          Community
        </h1>
        {user === null ? (
          <button
            onClick={() => signInWithGoogle().catch(err => alert('Login-Fehler: ' + err.message))}
            style={{
              background: 'var(--green)', color: 'var(--paper)', border: 'none',
              borderRadius: 12, padding: '10px 16px', fontSize: 14, fontWeight: 700,
              fontFamily: 'var(--serif)', cursor: 'pointer',
            }}>
            Anmelden
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user.photoURL && (
              <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            )}
            <button
              onClick={() => logout()}
              style={{
                background: 'var(--card)', color: 'var(--cocoa)', border: '1px solid var(--line-2)',
                borderRadius: 12, padding: '8px 14px', fontSize: 13,
                fontFamily: 'var(--serif)', cursor: 'pointer',
              }}>
              Abmelden
            </button>
          </div>
        )}
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--mute)', fontFamily: 'var(--serif)', padding: '40px 0' }}>
          Lädt Rezepte…
        </div>
      ) : feed.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--mute)', fontFamily: 'var(--serif)', padding: '40px 0' }}>
          Noch keine Rezepte veröffentlicht.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feed.map(recipe => (
            <div key={recipe.id}
              onClick={() => setSelectedFeedRecipe(recipe)}
              style={{
                background: 'var(--card)', border: '1.5px solid var(--line-2)',
                borderRadius: 16, padding: 16, cursor: 'pointer',
              }}>
              <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 18, color: 'var(--espresso)' }}>
                {recipe.title}
              </div>
              {recipe.subtitle && (
                <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--mute)', fontStyle: 'italic', marginTop: 2 }}>
                  {recipe.subtitle}
                </div>
              )}
              <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--cocoa)', marginTop: 8 }}>
                {recipe.ingredients?.length || 0} Zutaten
                {(recipe.prepTime || recipe.cookTime) ? ` · ${(recipe.prepTime || 0) + (recipe.cookTime || 0)} Min.` : ''}
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--mute)', marginTop: 8 }}>
                von {recipe.authorName || 'Unbekannt'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}