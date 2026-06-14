import { useState, useRef } from 'react'
import './RecipeTinder.css'
import { Icon, Monogram, totalTime } from './DesignTokens'

const SWIPE_THRESHOLD = 90 // px bis zur Entscheidung

// stabile ID pro Rezept (für React-keys) — fällt auf Titel zurück
const cardKey = (r, i) => r?.id ?? `${r?.title || 'recipe'}-${i}`

export default function RecipeTinder({ recipes, onSelectRecipe, onBack }) {
  const [deck, setDeck] = useState(() => shuffle(recipes || []))
  const [matches, setMatches] = useState([])
  const [round, setRound] = useState(1)
  const [showMatchPop, setShowMatchPop] = useState(false)
  const [showNopePop, setShowNopePop] = useState(false)
  const [flyToStack, setFlyToStack] = useState(null)
  const [leaving, setLeaving] = useState(null)

  const [drag, setDrag] = useState({ x: 0, y: 0, active: false })
  const startPos = useRef({ x: 0, y: 0 })
  const cardRef = useRef(null)

  const current = deck[0] || null
  const finished = deck.length === 0 && !leaving

  function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const handlePointerDown = (e) => {
    if (leaving) return
    startPos.current = { x: e.clientX, y: e.clientY }
    setDrag({ x: 0, y: 0, active: true })
    cardRef.current?.setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e) => {
    if (!drag.active) return
    setDrag(d => ({ ...d, x: e.clientX - startPos.current.x, y: e.clientY - startPos.current.y }))
  }

  const handlePointerUp = () => {
    if (!drag.active) return
    if (drag.x > SWIPE_THRESHOLD) swipe('right')
    else if (drag.x < -SWIPE_THRESHOLD) swipe('left')
    else setDrag({ x: 0, y: 0, active: false })
  }

  const swipe = (direction) => {
    const card = deck[0]
    if (!card || leaving) return

    setLeaving({ recipe: card, direction, startY: drag.y, key: cardKey(card, 0) })
    setDeck(d => d.slice(1))
    setDrag({ x: 0, y: 0, active: false })

    if (direction === 'right') {
      setMatches(m => [...m, card])
      setShowMatchPop(true)
      setFlyToStack(card)
      setTimeout(() => setShowMatchPop(false), 1200)
      setTimeout(() => setFlyToStack(null), 600)
    } else {
      setShowNopePop(true)
      setTimeout(() => setShowNopePop(false), 900)
    }
    setTimeout(() => setLeaving(null), 320)
  }

  const startNextRound = () => {
    setDeck(shuffle(matches))
    setMatches([])
    setRound(r => r + 1)
  }

  const restart = () => {
    setDeck(shuffle(recipes || []))
    setMatches([])
    setRound(1)
  }

  // ── Finale: genau 1 Match ──
  if (finished && matches.length === 1) {
    const winner = matches[0]
    return (
      <div className="tinder">
        <TinderHeader onBack={onBack} />
        <div className="tinder-final">
          <div className="tinder-final-label game-font">It's a Match!</div>
          <div className="tinder-card tinder-card-final">
            <CardContent recipe={winner} />
          </div>
          <button className="tinder-cook-btn-big" onClick={() => onSelectRecipe(winner)}>
            Das jetzt kochen!
            <span style={{ color: 'var(--rose)', fontSize: 20 }}>→</span>
          </button>
          <button className="tinder-retry-link" onClick={restart}>
            Von vorne beginnen
          </button>
        </div>
      </div>
    )
  }

  // ── Runde fertig, mehrere Matches ──
  if (finished && matches.length > 1) {
    return (
      <div className="tinder">
        <TinderHeader onBack={onBack} />
        <div className="tinder-final">
          <div className="tinder-final-label game-font">
            {matches.length} Matches!
          </div>
          <div className="tinder-final-sub">Runde {round} geschafft 🎉</div>
          <div className="tinder-stack-preview">
            {matches.slice(0, 5).map((r, i) => (
              <div key={cardKey(r, i)} className="tinder-stack-mini" style={{
                transform: `translateX(${i * 14}px) rotate(${(i - 2) * 3}deg)`,
                zIndex: i,
              }}>
                <Monogram recipe={r} size={64} radius={14} />
              </div>
            ))}
          </div>
          <button className="tinder-cook-btn-big" onClick={startNextRound}>
            Finale ausswipen
            <span style={{ fontSize: 20 }}>🔥</span>
          </button>
        </div>
      </div>
    )
  }

  // ── Runde fertig, keine Matches ──
  if (finished) {
    return (
      <div className="tinder">
        <TinderHeader onBack={onBack} />
        <div className="tinder-final">
          <div className="tinder-final-label game-font">Kein Match dabei 🥲</div>
          <div className="tinder-final-sub">Nochmal probieren?</div>
          <button className="tinder-cook-btn-big" onClick={restart}>
            Neu mischen
            <span style={{ fontSize: 20 }}>🔄</span>
          </button>
        </div>
      </div>
    )
  }

  const rotation = drag.x / 18
  const likeOpacity = Math.min(1, Math.max(0, drag.x / SWIPE_THRESHOLD))
  const nopeOpacity = Math.min(1, Math.max(0, -drag.x / SWIPE_THRESHOLD))

  return (
    <div className="tinder">
      <TinderHeader onBack={onBack} />

      {round > 1 && (
        <div className="tinder-round-hint">Runde {round} — sei wählerisch! 🔥</div>
      )}

      <div className="tinder-cook-row">
        <button className="tinder-cook-btn" onClick={() => onSelectRecipe(current)}>
          <DownArrow />
          Das jetzt kochen!
        </button>
      </div>

      <div className="tinder-card-area">
        {/* Hintere Karten — stabile keys, damit React sie nicht "umwidmet" */}
        {deck[2] && (
          <div key={cardKey(deck[2], 2)} className="tinder-card tinder-card-behind-2">
            <CardContent recipe={deck[2]} />
          </div>
        )}
        {deck[1] && (
          <div key={cardKey(deck[1], 1)} className="tinder-card tinder-card-behind-1">
            <CardContent recipe={deck[1]} />
          </div>
        )}

        {/* Wegfliegende Karte — eigenes Element mit eigenem key */}
        {leaving && (
          <div
            key={leaving.key}
            className="tinder-card tinder-card-leaving"
            style={{
              transform: `translateX(${leaving.direction === 'right' ? window.innerWidth : -window.innerWidth}px) rotate(${leaving.direction === 'right' ? 22 : -22}deg)`,
            }}
          >
            <CardContent recipe={leaving.recipe} />
          </div>
        )}

        {/* Aktive Karte — eigener stabiler key */}
        {current && (
          <div
            key={cardKey(current, 0)}
            ref={cardRef}
            className="tinder-card tinder-card-active"
            style={{
              transform: `translateX(${drag.x}px) rotate(${rotation}deg)`,
              transition: drag.active ? 'none' : 'transform 0.25s ease-out',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <CardContent recipe={current} />
            <div className="tinder-stamp tinder-stamp-like" style={{ opacity: likeOpacity }}>MATCH</div>
            <div className="tinder-stamp tinder-stamp-nope" style={{ opacity: nopeOpacity }}>NOPE</div>
          </div>
        )}

        {showMatchPop && (
          <div className="tinder-match-pop game-font">It's a Match! 💚</div>
        )}
        {showNopePop && (
          <div className="tinder-nope-pop game-font">Nope! 🙅</div>
        )}
      </div>

      {/* Mini-Anleitung — direkt unter dem Stapel, Game-Optik */}
      <div className="tinder-help-row game-font">
        <span className="tinder-help-item tinder-help-nope">
          <HandArrow dir="left" /> kein Match
        </span>
        <span className="tinder-help-item tinder-help-like">
          Match <HandArrow dir="right" />
        </span>
      </div>

      {/* Match-Stapel */}
      <div className="tinder-matches-bar">
        <div className="tinder-matches-stack">
          {matches.slice(-5).map((r, i, arr) => (
            <div key={cardKey(r, i)} className="tinder-matches-mini" style={{
              transform: `translateX(${i * 10}px) rotate(${(i - arr.length / 2) * 4}deg)`,
              zIndex: i,
            }}>
              <Monogram recipe={r} size={48} radius={11} />
            </div>
          ))}
          {flyToStack && (
            <div className="tinder-matches-mini tinder-fly-in" style={{ zIndex: 99 }}>
              <Monogram recipe={flyToStack} size={48} radius={11} />
            </div>
          )}
        </div>
        <div className="tinder-matches-count">
          {matches.length === 0 ? 'Noch keine Matches' : `${matches.length} Match${matches.length > 1 ? 'es' : ''}`}
        </div>
      </div>
    </div>
  )
}

function TinderHeader({ onBack }) {
  return (
    <div className="tinder-header">
      <button className="tinder-back-btn" onClick={onBack}>
        <Icon name="chev-left" size={18} color="var(--cocoa)" />
      </button>
      <h1 className="display tinder-title">
        Rezept-<span style={{ fontStyle: 'italic', fontWeight: 600 }}>Tinder</span>
      </h1>
      <div style={{ width: 38 }} />
    </div>
  )
}

// Pfeil nach unten (für "Das jetzt kochen!")
function DownArrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 2 L7.5 12" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M3 8 L7.5 12.5 L12 8" stroke="var(--green)" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// Handgemalt wirkender, gebogener Pfeil
function HandArrow({ dir }) {
  const flip = dir === 'left'
  return (
    <svg width="30" height="16" viewBox="0 0 30 16" fill="none"
      style={{ transform: flip ? 'scaleX(-1)' : 'none', verticalAlign: 'middle', display: 'inline-block' }}>
      <path d="M2 9 C 9 6.5, 17 7, 24 8.5" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" fill="none" />
      <path d="M18.5 3 C 21 5.5, 22.5 7, 24.5 8.5 C 22.5 10, 21 11.5, 19 13.5" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function CardContent({ recipe }) {
  if (!recipe) return null
  const time = totalTime(recipe)
  return (
    <>
      {recipe.image ? (
        <img className="tinder-card-img" src={recipe.image} alt={recipe.title} draggable={false} />
      ) : (
        <div className="tinder-card-img-placeholder">
          <Monogram recipe={recipe} size={90} radius={20} />
        </div>
      )}
      <div className="tinder-card-info">
        <div className="tinder-card-title">{recipe.title}</div>
        {recipe.subtitle && <div className="tinder-card-subtitle">{recipe.subtitle}</div>}
        <div className="tinder-card-meta">
          {time > 0 ? `${time} Min.` : ''}
          {time > 0 && recipe.servings > 0 ? ' · ' : ''}
          {recipe.servings > 0 ? `${recipe.servings} Portionen` : ''}
        </div>
      </div>
    </>
  )
}
