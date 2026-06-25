import './RecipeList.css';
import { Icon, Monogram, LoveDot, coverTint, totalTime } from './DesignTokens';

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
  const sorted = [...(recipes || [])].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  const filtered = favOnly ? sorted.filter(r => r.favorite) : sorted;
  const featured = filtered[0];
  const collection = filtered.slice(1).sort((a, b) =>
    (a.title || '').localeCompare(b.title || '', 'de')
  );

  return (
    <div className="recipe-list">
      <div className="recipe-list-headline">
        <h1 className="display" style={{ fontSize: 34, color: 'var(--espresso)' }}>
          {favOnly
            ? <span style={{ fontStyle: 'italic', fontWeight: 600 }}>Favoriten</span>
            : <>Meine <span style={{ fontStyle: 'italic', fontWeight: 600 }}>Rezepte</span></>
          }
        </h1>
        {favOnly && filtered.length === 0 && (
          <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--mute)', fontStyle: 'italic', marginTop: 6 }}>
            Noch keine Favoriten — tippe das Herz bei einem Rezept.
          </div>
        )}
      </div>

      {recipes?.length === 0 ? (
        <div className="recipe-list-empty" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
          minHeight: '56vh', padding: '24px 20px 4px', fontStyle: 'normal',
        }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--cocoa)', lineHeight: 1.45, maxWidth: 260 }}>
            Tippe hier, um dein erstes Rezept anzulegen.
          </div>
          <svg className="empty-arrow" width="30" height="48" viewBox="0 0 30 48" fill="none" aria-hidden="true" style={{ marginTop: 16 }}>
            <path d="M15 4v36M15 40l-8-8M15 40l8-8" stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ) : (
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
    </div>
  );
}
