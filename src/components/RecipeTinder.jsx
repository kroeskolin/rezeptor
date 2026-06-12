import { useState, useRef, useEffect } from 'react'
import './RecipeTinder.css'
import { Icon, Monogram, totalTime } from './DesignTokens'

const SWIPE_THRESHOLD = 90 // px bis zur Entscheidung

export default function RecipeTinder({ recipes, onSelectRecipe, onBack }) {
  // Karten der aktuellen Runde (Reihenfolge: Index 0 = oberste Karte)
  const [deck, setDeck] = useState(() => shuffle(recipes || []))
  const [matches, setMatches] = useState([])
  const [round, setRound] = useState(1)
  const [showMatchPop, setShowMatchPop] = useState(false)
  const [flyToStack, setFlyToStack] = useState(null) // Rezept das gerade zum Stapel fliegt

  // Drag-State
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false })
  const startPos = useRef({ x: 0, y: 0 })
  const cardRef = useRef(null)

  const current = deck[0] || null
  const finished = deck.length === 0

  function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const handlePointerDown = (e) => {
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
      setDrag({ x: 0, y: 0, active: false }) // zurückschnappen
    }
  }

  const swipe = (direction) => {
    const card = deck[0]
    if (!card) return

    // Karte rausfliegen lassen
    setDrag({
      x: direction === 'right' ? window.innerWidth : -window.innerWidth,
      y: drag.y,
      active: false,
    })

    setTimeout(() => {
      if (direction === 'right') {
        setMatches(m => [...m, card])
        setFlyToStack(card)
        setShowMatchPop(true)
        setTimeout(() => setShowMatchPop(false), 600)
        setTimeout(() => setFlyToStack(null), 500)
      }
      setDeck(d => d.slice(1))
      setDrag({ x: 0, y: 0, active: false })
    }, 250)
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

  // ── Finale: genau 1 Match übrig nach einer Runde ──
  if (finished && matches.length === 1) {
    const winner = matches[0]
    return (
      <div className="tinder">
        <TinderHeader onBack={onBack} round={round} />
        <div className="tinder-final">
          <div className="tinder-final-label">It's a Match! 💚</div>
          <div className="tinder-card tinder-card-final">
            <CardContent recipe={winner} />
          </div>
          <button className="tinder-cook-btn-big" onClick={() => onSelectRecipe(winner)}>
            Jetzt kochen
            <span style={{ color: 'var(--rose)', fontSize: 20 }}>→</span>
          </button>
          <button className="tinder-retry-link" onClick={restart}>
            Von vorne beginnen
          </button>
        </div>
      </div>
    )
  }

  // ── Runde fertig, mehrere Matches: nächste Runde anbieten ──
  if (finished && matches.length > 1) {
    return (
      <div className="tinder">
        <TinderHeader onBack={onBack} round={round} />
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
        <TinderHeader onBack={onBack} round={round} />
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

  // ── Aktives Swipen ──
  const rotation = drag.x / 18
  const likeOpacity = Math.min(1, Math.max(0, drag.x / SWIPE_THRESHOLD))
  const nopeOpacity = Math.min(1, Math.max(0, -drag.x / SWIPE_THRESHOLD))

  return (
    <div className="tinder">
      <TinderHeader onBack={onBack} round={round} />

      {round > 1 && (
        <div className="tinder-round-hint">Runde {round} — sei wählerisch! 🔥</div>
      )}

      {/* Jetzt-kochen-Button über der Karte */}
      <div className="tinder-cook-row">
        <button className="tinder-cook-btn" onClick={() => onSelectRecipe(current)}>
          <Icon name="chef" size={14} color="var(--green)" strokeWidth={2} />
          Jetzt kochen
        </button>
      </div>

      {/* Kartenstapel */}
      <div className="tinder-card-area">
        {/* Nächste Karte (dahinter) */}
        {deck[1] && (
          <div className="tinder-card tinder-card-behind">
            <CardContent recipe={deck[1]} />
          </div>
        )}
        {/* Aktive Karte */}
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
          {/* Like/Nope-Stempel */}
          <div className="tinder-stamp tinder-stamp-like" style={{ opacity: likeOpacity }}>MATCH</div>
          <div className="tinder-stamp tinder-stamp-nope" style={{ opacity: nopeOpacity }}>NOPE</div>
        </div>

        {/* It's a Match Popup */}
        {showMatchPop && (
          <div className="tinder-match-pop">It's a Match! 💚</div>
        )}
      </div>

      {/* Mini-Anleitung */}
      <div className="tinder-help-row">
        <span className="tinder-help-item">← kein Match</span>
        <span className="tinder-help-divider">·</span>
        <span className="tinder-help-item">Match →</span>
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

function TinderHeader({ onBack, round }) {
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
