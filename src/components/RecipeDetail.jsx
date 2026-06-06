import { useState } from 'react';
import './RecipeDetail.css';
import { Icon, coverTint, totalTime } from './DesignTokens';

function HeartBtn({ recipe, onToggle, glass = false }) {
  const isFav = !!recipe.favorite;
  if (glass) {
    return (
      <button className="detail-ctrl-btn-glass"
        onClick={e => { e.stopPropagation(); onToggle(recipe); }}
        aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}>
        <Icon name="heart" size={16} color={isFav ? '#ffb3b3' : '#fff'}
          fill={isFav} strokeWidth={isFav ? 0 : 1.8} />
      </button>
    );
  }
  return (
    <button className="detail-ctrl-btn-white"
      onClick={e => { e.stopPropagation(); onToggle(recipe); }}
      aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
      style={{ background: isFav ? 'var(--rose)' : 'var(--card)', borderColor: isFav ? 'var(--rose-2)' : 'var(--line-2)' }}>
      <Icon name="heart" size={16} color={isFav ? 'var(--rose-ink)' : 'var(--mute)'}
        fill={isFav} strokeWidth={isFav ? 0 : 1.8} />
    </button>
  );
}

function PhotoFullscreen({ src, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
        zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 20,
          width: 38, height: 38, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}
      >
        <Icon name="x" size={18} color="#fff" strokeWidth={2} />
      </button>
      <img
        src={src}
        alt="Foto"
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

export default function RecipeDetail({ recipe, onBack, onEdit, onStartCook, onToggleFavorite }) {
  const [showFullscreen, setShowFullscreen] = useState(false);
  if (!recipe) return null;

  const t = coverTint(recipe);
  const initial = (recipe.title || '?').trim().charAt(0).toUpperCase();
  const time = totalTime(recipe);
  const hasPhoto = !!recipe.image;
  const ingredients = recipe.ingredients || [];
  const tags = recipe.tags || [];
  const category = recipe.category;

  const getSteps = () => {
    if (!recipe.steps) return [];
    const html = recipe.steps;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const items = tempDiv.querySelectorAll('li, p');
    const result = [];
    items.forEach(el => {
      const text = el.textContent.trim();
      if (text) result.push(text);
    });
    return result.length > 0 ? result : [html.replace(/<[^>]*>/g, ' ').trim()].filter(Boolean);
  };

  const steps = getSteps();

  return (
    <div className="recipe-detail">
      {hasPhoto ? (
        <div className="recipe-detail-hero" onClick={() => setShowFullscreen(true)}
          style={{ cursor: 'zoom-in' }}>
          <img className="recipe-detail-hero-img" src={recipe.image} alt={recipe.title} />
          <div className="recipe-detail-hero-scrim" />
          <div className="recipe-detail-controls" onClick={e => e.stopPropagation()}>
            <div className="detail-ctrl-group">
              <button className="detail-ctrl-btn-glass" onClick={onBack}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2L4 7l5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="detail-ctrl-btn-glass" onClick={onEdit}>
                <Icon name="pencil" size={15} color="#fff" strokeWidth={1.8} />
              </button>
            </div>
            <HeartBtn recipe={recipe} onToggle={onToggleFavorite} glass />
          </div>
          <div className="recipe-detail-title-overlay">
            <h1 className="recipe-detail-title-photo">{recipe.title}</h1>
            {recipe.subtitle && (
              <div style={{ fontStyle: 'italic', fontSize: 16, marginTop: 6, opacity: 0.94 }}>
                {recipe.subtitle}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="recipe-detail-tint-header" style={{ background: t.bg }}>
          <span className="recipe-detail-tint-initial" style={{ color: t.ink }}>{initial}</span>
          <div className="recipe-detail-controls">
            <div className="detail-ctrl-group">
              <button className="detail-ctrl-btn-white" onClick={onBack}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2L4 7l5 5" stroke="var(--espresso)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="detail-ctrl-btn-white" onClick={onEdit}>
                <Icon name="pencil" size={15} color="var(--espresso)" strokeWidth={1.8} />
              </button>
            </div>
            <HeartBtn recipe={recipe} onToggle={onToggleFavorite} />
          </div>
          {(category || tags[0]) && (
            <div className="recipe-detail-eyebrow" style={{ color: t.ink }}>
              {category || tags[0]?.name}
            </div>
          )}
          <h1 className="recipe-detail-title-tint">{recipe.title}</h1>
          {recipe.subtitle && (
            <div style={{ fontStyle: 'italic', fontSize: 14, marginTop: 4, color: t.ink, opacity: 0.75, position: 'relative', zIndex: 1 }}>
              {recipe.subtitle}
            </div>
          )}
        </div>
      )}

      {/* Meta row */}
      <div className="recipe-detail-meta">
        {time > 0 && (
          <>
            <div className="detail-stat">
              <span className="detail-stat-value num">{time}</span>
              <span className="detail-stat-unit">Min.</span>
            </div>
            <div className="detail-divider-v" />
          </>
        )}
        {recipe.servings > 0 && (
          <div className="detail-stat">
            <span className="detail-stat-value num">{recipe.servings}</span>
            <span className="detail-stat-unit">Port.</span>
          </div>
        )}
        <div className="detail-meta-spacer" />
        {tags.slice(0, 2).map((tag, i) => (
          <span key={i} className={`detail-chip ${i === 0 ? 'detail-chip-sage' : 'detail-chip-rose'}`}>
            {tag.name || tag}
          </span>
        ))}
      </div>

      {/* Ingredients */}
      {ingredients.length > 0 && (
        <div className="recipe-detail-section">
          <div className="section-head">Zutaten</div>
          <div>
            {ingredients.map((ing, i) => (
              <div key={i} className="ingredient-row">
                <span className="ingredient-name">{ing.name}</span>
                <span className="ingredient-amount num">
                  {ing.amount}{ing.unit ? ` ${ing.unit}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <div className="recipe-detail-section">
          <div className="section-head">Zubereitung</div>
          <div>
            {steps.map((step, i) => (
              <div key={i} className="step-row">
                <span className="step-num">{i + 1}</span>
                <span className="step-text">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {steps.length > 0 && (
        <div className="recipe-detail-cta">
          <button className="recipe-detail-cta-btn" onClick={onStartCook}>
            Kochmodus starten
            <span style={{ color: 'var(--rose)', fontSize: 20, fontStyle: 'normal' }}>→</span>
          </button>
        </div>
      )}

      <div style={{ height: 20 }} />

      {/* Vollbild-Foto */}
      {showFullscreen && (
        <PhotoFullscreen src={recipe.image} onClose={() => setShowFullscreen(false)} />
      )}
    </div>
  );
}
