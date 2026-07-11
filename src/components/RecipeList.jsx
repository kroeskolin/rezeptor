import { useState } from 'react';
import { createPortal } from 'react-dom';
import './RecipeList.css';
import { Icon, Monogram, LoveDot, coverTint, totalTime } from './DesignTokens';

// Sortierung der Sammlung (Auswahl bleibt pro Gerät gespeichert)
const SORT_OPTIONS = [
  { id: 'newest', label: 'Zuletzt hinzugefügt — neueste zuerst' },
  { id: 'oldest', label: 'Zuletzt hinzugefügt — älteste zuerst' },
  { id: 'alpha-asc', label: 'Alphabetisch — A bis Z' },
  { id: 'alpha-desc', label: 'Alphabetisch — Z bis A' },
];
const SORT_FNS = {
  'newest': (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  'oldest': (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  'alpha-asc': (a, b) => (a.title || '').localeCompare(b.title || '', 'de'),
  'alpha-desc': (a, b) => (b.title || '').localeCompare(a.title || '', 'de'),
};

function SubHead({ children }) {
  return (
    <div className="subhead">
      <span className="subhead-text">{children}</span>
      <div className="subhead-line" />
    </div>
  );
}

function HeartBtn({ recipe, onToggle }) {
  const isFav = !!recipe.favorite;
  return (
    <button
      className="heart-btn"
      onClick={e => { e.stopPropagation(); onToggle(recipe); }}
      aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
    >
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: isFav ? 'var(--rose-2)' : 'transparent',
        border: isFav ? 'none' : '1.5px solid var(--line-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s',
      }}>
        <Icon name="heart" size={14} color={isFav ? 'var(--rose-ink)' : 'var(--line-2)'}
          fill={isFav} strokeWidth={isFav ? 0 : 1.8} />
      </div>
    </button>
  );
}

function FeatureCard({ recipe, onClick, onToggleFavorite }) {
  const t = coverTint(recipe);
  const initial = (recipe.title || '?').trim().charAt(0).toUpperCase();
  const time = totalTime(recipe);
  const tag = recipe.tags?.[0]?.name || recipe.category || '';

  return (
    <div className="feature-card" onClick={() => onClick(recipe)}>
      <div className="feature-card-cover" style={{ background: recipe.image ? undefined : t.bg }}>
        {recipe.image
          ? <img className="feature-card-cover-img" src={recipe.image} alt={recipe.title} />
          : <>
              <span className="feature-card-initial" style={{ color: t.ink }}>{initial}</span>
              <span className="feature-card-eyebrow" style={{ color: t.ink }}>{tag}</span>
            </>
        }
        <div className="feature-card-love">
          <HeartBtn recipe={recipe} onToggle={onToggleFavorite} />
        </div>
      </div>
      <div className="feature-card-body">
        <h2 className="feature-card-title">{recipe.title}</h2>
        {recipe.subtitle && (
          <div style={{ fontSize: 14, color: 'var(--cocoa)', marginTop: 4, fontStyle: 'italic' }}>
            {recipe.subtitle}
          </div>
        )}
        <div className="feature-card-meta">
          {time > 0 && <>
            <Icon name="clock" size={15} color="var(--mute)" />
            <span className="num" style={{ fontSize: 12.5, color: 'var(--cocoa)' }}>{time} Min.</span>
            <span style={{ color: 'var(--line-2)', margin: '0 2px' }}>·</span>
          </>}
          {recipe.servings > 0 &&
            <span className="num" style={{ fontSize: 12.5, color: 'var(--cocoa)' }}>
              {recipe.servings} Portionen
            </span>
          }
        </div>
      </div>
    </div>
  );
}

function RecipeCard({ recipe, onClick, onToggleFavorite }) {
  const time = totalTime(recipe);
  const tag = recipe.tags?.[0]?.name || recipe.category || '';

  return (
    <div className="recipe-card" onClick={() => onClick(recipe)}>
      <Monogram recipe={recipe} size={58} radius={13} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="recipe-card-title">{recipe.title}</div>
        <div className="recipe-card-meta">
          {time > 0 && <>
            <span className="num" style={{ fontSize: 12, color: 'var(--cocoa)' }}>{time} Min.</span>
            <span style={{ color: 'var(--line-2)' }}>·</span>
          </>}
          {tag && <span style={{ fontSize: 12, color: 'var(--mute)', fontStyle: 'italic' }}>{tag}</span>}
        </div>
      </div>
      <HeartBtn recipe={recipe} onToggle={onToggleFavorite} />
    </div>
  );
}

export default function RecipeList({ recipes, onSelectRecipe, onToggleFavorite, favOnly }) {
  const [sortMode, setSortMode] = useState(() => {
    const saved = localStorage.getItem('rezeptor-sort')
    return SORT_FNS[saved] ? saved : 'alpha-asc'
  });
  const [showSortSheet, setShowSortSheet] = useState(false);

  const pickSort = (id) => {
    setSortMode(id)
    localStorage.setItem('rezeptor-sort', id)
    setShowSortSheet(false)
  };

  const sorted = [...(recipes || [])].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  const filtered = favOnly ? sorted.filter(r => r.favorite) : sorted;
  const featured = filtered[0];
  const collection = filtered.slice(1).sort(SORT_FNS[sortMode]);

  return (
    <div className="recipe-list">
      <div className="recipe-list-headline">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <h1 className="display" style={{ fontSize: 34, color: 'var(--espresso)' }}>
            {favOnly
              ? <span style={{ fontStyle: 'italic', fontWeight: 600 }}>Favoriten</span>
              : <>Meine <span style={{ fontStyle: 'italic', fontWeight: 600 }}>Rezepte</span></>
            }
          </h1>
          {filtered.length > 1 && (
            <button onClick={() => setShowSortSheet(true)} aria-label="Sortieren" style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0, marginTop: 4,
              background: 'none', border: '1px solid var(--line-2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="sort" size={16} color="var(--mute)" strokeWidth={1.7} />
            </button>
          )}
        </div>
        {favOnly && filtered.length === 0 && (
          <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--mute)', fontStyle: 'italic', marginTop: 6 }}>
            Noch keine Favoriten — tippe das Herz bei einem Rezept.
          </div>
        )}
      </div>

      {recipes?.length === 0 ? null : (
        <>
          {featured && (
            <div className="recipe-list-section">
              <SubHead>{favOnly ? 'Neuester Favorit' : 'Zuletzt hinzugefügt'}</SubHead>
              <FeatureCard recipe={featured} onClick={onSelectRecipe} onToggleFavorite={onToggleFavorite} />
            </div>
          )}
          {collection.length > 0 && (
            <div className="recipe-list-section">
              <SubHead>{favOnly ? 'Alle Favoriten' : 'Meine Sammlung'}</SubHead>
              <div className="recipe-card-collection">
                {collection.map(r => (
                  <RecipeCard key={r.id} recipe={r} onClick={onSelectRecipe} onToggleFavorite={onToggleFavorite} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <div style={{ height: 24 }} />

      {showSortSheet && createPortal((
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setShowSortSheet(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--paper)', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 640, padding: '20px 22px 40px',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line-2)', margin: '0 auto 18px' }} />
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, color: 'var(--espresso)', marginBottom: 14 }}>
              Sammlung <span style={{ fontStyle: 'italic' }}>sortieren</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SORT_OPTIONS.map(o => {
                const active = sortMode === o.id
                return (
                  <button key={o.id} onClick={() => pickSort(o.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                    background: active ? 'var(--paper-2)' : 'none',
                    border: active ? '1.5px solid var(--sage-2)' : '1.5px solid transparent',
                    borderRadius: 14, padding: '11px 12px', cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${active ? 'var(--green)' : 'var(--line-2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {active && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)' }} />}
                    </div>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 14.5, color: 'var(--espresso)', fontWeight: active ? 700 : 400 }}>
                      {o.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
