import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { getFeed, getRecipeById } from '../db/community'
import CommunityRecipeDetail from './CommunityRecipeDetail'

// Sprechblasen-Icon (gleiches wie im Header)
function SpeechBubble({ size = 14, color = 'var(--mute)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.8-5.9A8.5 8.5 0 1 1 21 11.5z"
        stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Community({ onLocalSave, activities = [], unreadCount = 0, lastSeen = 0, onSeen }) {
  const { user, signInWithGoogle } = useAuth()
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFeedRecipe, setSelectedFeedRecipe] = useState(null)
  const [showActivities, setShowActivities] = useState(false)
  const [seenThreshold, setSeenThreshold] = useState(0)

  useEffect(() => {
    getFeed()
      .then(setFeed)
      .catch(err => console.error('Feed laden fehlgeschlagen:', err))
      .finally(() => setLoading(false))
  }, [])

  // Aktivitätsliste öffnen: Schwelle für „neu"-Hervorhebung merken, dann als gesehen markieren
  const openActivities = () => {
    setSeenThreshold(lastSeen)
    setShowActivities(true)
    if (onSeen) onSeen()
  }

  // Aus einer Aktivität zum zugehörigen Beitrag springen
  const openActivityRecipe = async (recipeId) => {
    setShowActivities(false)
    const inFeed = feed.find(r => r.id === recipeId)
    if (inFeed) { setSelectedFeedRecipe(inFeed); return }
    const fetched = await getRecipeById(recipeId)
    if (fetched) setSelectedFeedRecipe(fetched)
  }

  // Text einer Aktivität
  const activityText = (a) => {
    if (a.type === 'like') return `${a.actorName} gefällt dein Rezept „${a.recipeTitle}"!`
    if (a.type === 'comment') return `${a.actorName} hat dein Rezept „${a.recipeTitle}" kommentiert!`
    return `${a.actorName} hat ebenfalls das Rezept „${a.recipeTitle}" kommentiert!`
  }

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
        onBack={(updated) => {
          // Aktuelle Like-/Kommentarzahlen in den Feed übernehmen
          if (updated) {
            setFeed(f => f.map(r => r.id === selectedFeedRecipe.id ? { ...r, ...updated } : r))
          }
          setSelectedFeedRecipe(null)
        }}
        onDeleted={() => {
          setFeed(f => f.filter(r => r.id !== selectedFeedRecipe.id))
          setSelectedFeedRecipe(null)
        }}
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
          // Aktivitäten-Sprechblase (ganz rechts); Account-Verwaltung liegt in den Einstellungen
          <button
            onClick={openActivities}
            aria-label="Aktivitäten"
            style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: unreadCount > 0 ? 'var(--rose)' : 'var(--card)',
              border: `1px solid ${unreadCount > 0 ? 'var(--rose-2)' : 'var(--line-2)'}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {unreadCount > 0 ? (
              <span style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, color: 'var(--rose-ink)' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : (
              <SpeechBubble size={18} />
            )}
          </button>
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
              {/* Autor oben */}
              <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--mute)', marginBottom: 10 }}>
                {recipe.authorName || 'Unbekannt'}
              </div>

              {/* Textbeitrag – die Hauptsache */}
              {recipe.caption ? (
                <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--espresso)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {recipe.caption}
                </div>
              ) : (
                <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--espresso)', lineHeight: 1.5 }}>
                  hat ein Rezept geteilt.
                </div>
              )}

              {/* Rezept nur angedeutet */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginTop: 12,
                background: 'var(--paper-2)', border: '1px solid var(--line-2)',
                borderRadius: 12, padding: '10px 12px',
              }}>
                {recipe.image && (
                  <img src={recipe.image} alt=""
                    style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 15, color: 'var(--espresso)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {recipe.title}
                  </div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>
                    {recipe.ingredients?.length || 0} Zutaten
                    {(recipe.prepTime || recipe.cookTime) ? ` · ${(recipe.prepTime || 0) + (recipe.cookTime || 0)} Min.` : ''}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>
                  Ansehen →
                </span>
              </div>

              {/* Likes/Kommentare – immer sichtbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--mute)', marginTop: 10 }}>
                <span>♥ {recipe.likeCount || 0}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <SpeechBubble size={14} /> {recipe.commentCount || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aktivitäten-Panel (per Portal an document.body, sonst iOS-fixed-Bug) */}
      {showActivities && createPortal((
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setShowActivities(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--paper)', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 640, maxHeight: '80vh', overflowY: 'auto',
            padding: '20px 22px 40px',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line-2)', margin: '0 auto 18px' }} />
            <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700, color: 'var(--espresso)', marginBottom: 16 }}>
              Aktivitäten
            </div>

            {activities.length === 0 ? (
              <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--mute)', fontStyle: 'italic' }}>
                Noch keine Aktivitäten.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activities.map(a => {
                  const isNew = a.createdAtMs > seenThreshold
                  return (
                    <button key={a.id} onClick={() => openActivityRecipe(a.recipeId)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                      background: isNew ? 'var(--rose)' : 'var(--card)',
                      border: `1px solid ${isNew ? 'var(--rose-2)' : 'var(--line-2)'}`,
                      borderRadius: 14, padding: '12px 14px', cursor: 'pointer',
                    }}>
                      <span style={{ flexShrink: 0, display: 'flex', color: a.type === 'like' ? 'var(--rose-ink)' : 'var(--green)' }}>
                        {a.type === 'like'
                          ? <span style={{ fontSize: 18, lineHeight: 1 }}>♥</span>
                          : <SpeechBubble size={17} color="var(--green)" />}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--espresso)', lineHeight: 1.4 }}>
                        {activityText(a)}
                      </span>
                      {isNew && (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C24B33', flexShrink: 0 }} />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ), document.body)}
    </div>
  )
}