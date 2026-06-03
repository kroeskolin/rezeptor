import { useState } from 'react';
import './SearchDrawer.css';
import { Icon, Monogram, totalTime } from './DesignTokens';

export default function SearchDrawer({ recipes, onSelectRecipe, onClose }) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [maxTime, setMaxTime] = useState(0);
  const [favOnly, setFavOnly] = useState(false);

  const allTags = [...new Set(
    (recipes || []).flatMap(r => (r.tags || []).map(t => t.name || t).filter(Boolean))
  )].slice(0, 10);

  const times = [{ l: '≤ 15', v: 15 }, { l: '≤ 30', v: 30 }, { l: '≤ 60', v: 60 }];

  const results = (recipes || []).filter(r => {
    if (favOnly && !r.favorite) return false;
    if (query) {
      const q = query.toLowerCase();
      const inTitle = r.title?.toLowerCase().includes(q);
      const inIngredients = (r.ingredients || []).some(i => i.name?.toLowerCase().includes(q));
      if (!inTitle && !inIngredients) return false;
    }
    if (activeTag) {
      const tags = (r.tags || []).map(t => t.name || t);
      if (!tags.includes(activeTag)) return false;
    }
    if (maxTime && totalTime(r) > maxTime) return false;
    return true;
  });

  return (
    <div className="search-drawer">

      {/* X-Button oben links */}
      <div className="add-recipe-header">
        <button className="add-close-btn" onClick={onClose}>
          <Icon name="x" size={16} color="var(--cocoa)" />
        </button>
      </div>

      {/* Suchleiste */}
      <div className="search-bar-row">
        <div className="search-input-wrap">
          <Icon name="search" size={18} color="var(--mute)" />
          <input
            className="search-input"
            placeholder="Rezepte, Zutaten …"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {/* Favoriten-Toggle */}
      <div className="search-filter-group">
        <div className="search-filter-chips">
          <button
            className={`search-chip${favOnly ? ' active' : ''}`}
            onClick={() => setFavOnly(v => !v)}
            style={favOnly ? { background: 'var(--rose)', borderColor: 'var(--rose-2)' } : {}}
          >
            <span style={{ marginRight: 4 }}>♥</span> Favoriten
          </button>
        </div>
      </div>

      {/* Tag-Filter */}
      {allTags.length > 0 && (
        <div className="search-filter-group">
          <div className="search-filter-label">Tags</div>
          <div className="search-chips-row">
            {allTags.map(tag => (
              <button
                key={tag}
                className={`search-chip${activeTag === tag ? ' active' : ''}`}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Zeitfilter */}
      <div className="search-filter-group">
        <div className="search-filter-label">Zeit</div>
        <div className="search-filter-chips">
          {times.map(t => (
            <button
              key={t.v}
              className={`search-chip${maxTime === t.v ? ' active' : ''}`}
              onClick={() => setMaxTime(maxTime === t.v ? 0 : t.v)}
            >
              {t.l} Min
            </button>
          ))}
        </div>
      </div>

      {/* Ergebnisse */}
      <div className="search-results">
        <div className="search-results-count">
          <span className="search-results-label">
            {results.length} {results.length === 1 ? 'Rezept' : 'Rezepte'}
          </span>
          <div className="subhead-line" />
        </div>
        <div className="search-results-list">
          {results.map(r => (
            <div
              key={r.id}
              className="search-result-card"
              onClick={() => { onSelectRecipe(r); onClose(); }}
            >
              <Monogram recipe={r} size={54} radius={12} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 16,
                  color: 'var(--espresso)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{r.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  {totalTime(r) > 0 && (
                    <span className="num" style={{ fontSize: 12, color: 'var(--cocoa)' }}>{totalTime(r)} Min.</span>
                  )}
                  {(r.tags?.[0]?.name || r.tags?.[0]) && <>
                    <span style={{ color: 'var(--line-2)' }}>·</span>
                    <span style={{ fontSize: 12, color: 'var(--mute)', fontStyle: 'italic' }}>
                      {r.tags[0]?.name || r.tags[0]}
                    </span>
                  </>}
                </div>
              </div>
              {r.favorite && (
                <Icon name="heart" size={14} color="var(--rose-ink)" fill strokeWidth={0} />
              )}
            </div>
          ))}
          {results.length === 0 && (
            <div className="search-empty">Nichts gefunden — Filter lockern?</div>
          )}
        </div>
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
}
