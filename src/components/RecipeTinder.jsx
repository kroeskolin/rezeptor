import { useState } from 'react';
import './RecipeTinder.css';
import { Icon, Monogram, LoveDot, coverTint, totalTime } from './DesignTokens';

export default function RecipeTinder({ recipes, onBack, onSelectRecipe }) {
  const deck = (recipes || []).slice();
  const [idx, setIdx] = useState(0);
  const [fly, setFly] = useState(null); // 'like' | 'nope'
  const [history, setHistory] = useState([]);

  const advance = (dir) => {
    if (idx >= deck.length) return;
    setFly(dir);
    setHistory(h => [...h, idx]);
    setTimeout(() => {
      setIdx(v => Math.min(v + 1, deck.length));
      setFly(null);
    }, 240);
  };

  const back = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setIdx(prev);
    setFly(null);
  };

  if (deck.length === 0) {
    return (
      <div className="tinder">
        <div className="tinder-header">
          <button className="tinder-back" onClick={onBack}>‹ Zurück</button>
          <span className="label-caps" style={{ color: 'var(--mute)' }}>REZEPTE-TINDER</span>
          <div style={{ width: 60 }} />
        </div>
        <div className="tinder-done">Noch keine Rezepte vorhanden.</div>
      </div>
    );
  }

  const done = idx >= deck.length;

  const TinderCard = ({ recipe, depth }) => {
    const t = coverTint(recipe);
    const initial = (recipe.title || '?').trim().charAt(0).toUpperCase();
    const scale = 1 - depth * 0.05;
    const ty = depth * 14;
    const tags = recipe.tags || [];
    const time = totalTime(recipe);

    const cardStyle = depth === 0 && fly ? {
      transform: `translateY(${ty}px) scale(${scale}) translateX(${fly === 'like' ? 340 : -340}px) rotate(${fly === 'like' ? 16 : -16}deg)`,
      opacity: 0,
      transition: 'transform 0.24s ease, opacity 0.24s ease',
    } : {
      transform: `translateY(${ty}px) scale(${scale})`,
    };

    return (
      <div className="tinder-card" style={{ zIndex: 10 - depth, ...cardStyle }}>
        <div className="tinder-card-inner">
          <div className="tinder-card-cover" style={{ background: recipe.image ? undefined : t.bg }}>
            {recipe.image
              ? <img src={recipe.image} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span className="tinder-card-initial" style={{ color: t.ink }}>{initial}</span>
            }
            <div className="tinder-card-tags">
              {tags.slice(0, 2).map((tg, i) => (
                <span key={i} className="tinder-tag-pill" style={{ color: t.ink }}>
                  {tg.name || tg}
                </span>
              ))}
            </div>
          </div>
          <div className="tinder-card-body">
            <h2 className="tinder-card-title">{recipe.title}</h2>
            {recipe.subtitle && (
              <div style={{ fontSize: 14.5, color: 'var(--cocoa)', marginTop: 7, fontStyle: 'italic' }}>
                {recipe.subtitle}
              </div>
            )}
            <div className="tinder-card-meta">
              {time > 0 && <>
                <Icon name="clock" size={15} color="var(--mute)" />
                <span className="num" style={{ fontSize: 12.5, color: 'var(--cocoa)' }}>{time} Min.</span>
              </>}
              {recipe.servings > 0 && <>
                <span style={{ color: 'var(--line-2)', margin: '0 2px' }}>·</span>
                <span className="num" style={{ fontSize: 12.5, color: 'var(--cocoa)' }}>{recipe.servings} Port.</span>
              </>}
            </div>
          </div>
        </div>
        {/* Stamp */}
        {depth === 0 && fly && (
          <div className="tinder-stamp" style={{
            [fly === 'like' ? 'left' : 'right']: 20,
            transform: `rotate(${fly === 'like' ? -14 : 14}deg)`,
            borderColor: fly === 'like' ? 'var(--green)' : 'var(--rose-ink)',
            color: fly === 'like' ? 'var(--green)' : 'var(--rose-ink)',
          }}>
            {fly === 'like' ? 'Ja!' : 'Nein'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="tinder">
      <div className="tinder-header">
        <button className="tinder-back" onClick={onBack}>‹ Zurück</button>
        <span className="label-caps" style={{ color: 'var(--mute)' }}>REZEPTE-TINDER</span>
        <span className="tinder-counter">{Math.min(idx + 1, deck.length)}/{deck.length}</span>
      </div>

      {done ? (
        <div className="tinder-done">Das war's für heute 🎉</div>
      ) : (
        <div className="tinder-card-stack">
          {[2, 1, 0].map(depth => {
            const r = deck[idx + depth];
            if (!r) return null;
            return <TinderCard key={deck[idx + depth]?.id || depth} recipe={r} depth={depth} />;
          })}
        </div>
      )}

      <div className="tinder-actions">
        <button className="tinder-btn tinder-btn-sm" onClick={back} disabled={history.length === 0}
          style={{ opacity: history.length === 0 ? 0.4 : 1 }}>
          <Icon name="undo" size={20} color="var(--cocoa)" />
        </button>
        <button className="tinder-btn tinder-btn-nope" onClick={() => advance('nope')} disabled={done}>
          <Icon name="x" size={24} color="var(--rose-ink)" strokeWidth={2} />
        </button>
        <button className="tinder-btn tinder-btn-like" onClick={() => advance('like')} disabled={done}>
          <Icon name="heart" size={24} color="#F9FBF8" fill strokeWidth={0} />
        </button>
        <button className="tinder-btn tinder-btn-sm" onClick={() => !done && onSelectRecipe && onSelectRecipe(deck[idx])}>
          <Icon name="star" size={20} color="var(--cocoa)" />
        </button>
      </div>
    </div>
  );
}
