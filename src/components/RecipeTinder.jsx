import { useState, useRef } from 'react'
import './RecipeTinder.css'
import { Icon, Monogram, totalTime } from './DesignTokens'

const SWIPE_THRESHOLD = 90 // px bis zur Entscheidung

export default function RecipeTinder({ recipes, onSelectRecipe, onBack }) {
  const [deck, setDeck] = useState(() => shuffle(recipes || []))
  const [matches, setMatches] = useState([])
  const [round, setRound] = useState(1)
  const [showMatchPop, setShowMatchPop] = useState(false)
  const [flyToStack, setFlyToStack] = useState(null)
  const [leaving, setLeaving] = useState(null) // { recipe, direction } — Karte die gerade rausfliegt

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
    if (drag.x > SWIPE_THRESHOLD) {
      swipe('right')
    } else if (drag.x < -SWIPE_THRESHOLD) {
      swipe('left')
    } else {
      setDrag({ x: 0, y: 0, active: false })
    }
  }

  const swipe = (direction) => {
    const card = deck[0]
    if (!card || leaving) return

    // Karte aus dem Deck nehmen UND als "leaving" markieren — die nächste Karte
    // wird dadurch sofort sauber zur aktiven Karte (ohne geerbten Transform)
    setLeaving({ recipe: card, direction, startX: drag.x, startY: drag.y })
    setDeck(d => d.slice(1))
    setDrag({ x: 0, y: 0, active: false })

    if (direction === 'right') {
      setMatches(m => [...m, card])
      setShowMatchPop(true)
      setFlyToStack(card)
      setTimeout(() => setShowMatchPop(false), 1200)
      setTimeout(() => setFlyToStack(null), 600)
    }

    // Nach der Fly-out-Animation den leaving-State löschen
    setTimeout(() => setLeaving(null), 300)
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

  // ── Finale: genau 1 Match übrig ──
  if (finished && matches.length === 1) {
    const winner = matches[0]
    return (
      <div className="tinder">
        <TinderHeader onBack={onBack} />
        <div className="tinder-final">
          <div className="tinder-final-label">It's a Match! 💚</div>
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
          <div className="tinder-final-label">
            {matches.length} Matches in Runde {round}!
          </div>
          <div className="tinder-stack-preview">
            {matches.slice(0, 5).map((r, i) => (
              <div key={r.id || i} className="tinder-stack-mini" style={{
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
          <div className="tinder-final-label">Heute war kein Match dabei. 🥲</div>
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

      {/* Jetzt-kochen-Button über der Karte */}
      <div className="tinder-cook-row">
        <button className="tinder-cook-btn" onClick={() => onSelectRecipe(current)}>
          <Icon name="arrow-down" size={15} color="var(--green)" strokeWidth={2.2} />
          Das jetzt kochen!
        </button>
      </div>

      {/* Kartenbereich */}
      <div className="tinder-card-area">
        {/* Zweite Karte dahinter (Stapel-Andeutung) */}
        {deck[2] && (
          <div className="tinder-card tinder-card-behind-2">
            <CardContent recipe={deck[2]} />
          </div>
        )}
        {/* Erste Karte dahinter */}
        {deck[1] && (
          <div className="tinder-card tinder-card-behind-1">
            <CardContent recipe={deck[1]} />
          </div>
        )}

        {/* Wegfliegende Karte */}
        {leaving && (
          <div
            className="tinder-card tinder-card-leaving"
            style={{
              transform: `translate(${leaving.direction === 'right' ? window.innerWidth : -window.innerWidth}px, ${leaving.startY}px) rotate(${leaving.direction === 'right' ? 22 : -22}deg)`,
            }}
          >
            <CardContent recipe={leaving.recipe} />
          </div>
        )}

        {/* Aktive Karte */}
        {current && (
          <div
            ref={cardRef}
            className="tinder-card tinder-card-active"
            style={{
              transform: `translate(${drag.x}px, ${drag.y * 0.4}px) rotate(${rotation}deg)`,
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

        {/* It's a Match Popup — fliegt aus der Mitte auf den Nutzer zu */}
        {showMatchPop && (
          <div className="tinder-match-pop">It's a Match! 💚</div>
        )}
      </div>

      {/* Mini-Anleitung mit handgemalten Pfeilen */}
      <div className="tinder-help-row">
        <span className="tinder-help-item">
          <HandArrow dir="left" /> kein Match
        </span>
        <span className="tinder-help-divider">·</span>
        <span className="tinder-help-item">
          Match <HandArrow dir="right" />
        </span>
      </div>

      {/* Match-Stapel */}
      <div className="tinder-matches-bar">
        <div className="tinder-matches-stack">
          {matches.slice(-5).map((r, i, arr) => (
            <div key={r.id || i} className="tinder-matches-mini" style={{
              transform: `translateX(${i * -10}px) rotate(${(i - arr.length / 2) * 4}deg)`,
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

// Handgemalt wirkender, leicht gebogener Pfeil
function HandArrow({ dir }) {
  const flip = dir === 'left'
  return (
    <svg width="26" height="14" viewBox="0 0 26 14" fill="none"
      style={{ transform: flip ? 'scaleX(-1)' : 'none', verticalAlign: 'middle', display: 'inline-block' }}>
      <path d="M2 7.5 C 8 6, 15 6.2, 21 7" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" fill="none" />
      <path d="M16.5 3 C 18.5 4.8, 20 6, 21.5 7 C 20 8, 18.5 9.5, 17 11.5" stroke="currentColor"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
