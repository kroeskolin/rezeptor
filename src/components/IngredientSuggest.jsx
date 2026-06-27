import { useState } from 'react';
import './IngredientSuggest.css';
import { Icon, Monogram, totalTime } from './DesignTokens';

const SUGGESTIONS = ['Tomaten', 'Zwiebeln', 'Knoblauch', 'Reis', 'Eier', 'Sahne', 'Zitrone', 'Kichererbsen', 'Feta', 'Spinat', 'Parmesan', 'Kartoffeln'];

export default function IngredientSuggest({ recipes, onBack, onSelectRecipe, onAiSuggest }) {
  const [have, setHave] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResults, setAiResults] = useState(null);

  if ((recipes || []).length === 0) {
    return (
      <div style={{ padding: '60px 22px 0' }}>
        <button onClick={onBack} aria-label="Zurück" style={{
          background: 'var(--card)', border: '1px solid var(--line-2)', borderRadius: '50%',
          width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="chev-left" size={16} color="var(--espresso)" />
        </button>
        <div style={{ textAlign: 'center', marginTop: 90, fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--cocoa)', lineHeight: 1.5, padding: '0 10px' }}>
          Füge Rezepte hinzu, um die Resteverwertung auszuprobieren! 🥕
        </div>
      </div>
    );
  }

  const addIngredient = (name) => {
    const trimmed = name.trim();
    if (trimmed && !have.includes(trimmed)) {
      setHave(h => [...h, trimmed]);
    }
    setInputVal('');
  };

  const removeIngredient = (name) => {
    setHave(h => h.filter(x => x !== name));
  };

  const toggle = (name) => {
    if (have.includes(name)) removeIngredient(name);
    else addIngredient(name);
  };

  // Score recipes by how many "have" ingredients appear
  const getMatches = () => {
    if (have.length === 0) return [];
    return (recipes || [])
      .map(recipe => {
        const ingNames = (recipe.ingredients || []).map(i => (i.name || '').toLowerCase());
        const hits = have.filter(h => ingNames.some(n => n.includes(h.toLowerCase())));
        return { recipe, hit: hits.length, of: recipe.ingredients?.length || 0 };
      })
      .filter(m => m.hit > 0)
      .sort((a, b) => b.hit - a.hit)
      .slice(0, 5);
  };

  const matches = getMatches();

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) {
      e.preventDefault();
      addIngredient(inputVal);
    }
  };

  const handleAiSuggest = async () => {
    if (!onAiSuggest || have.length === 0) return;
    setLoading(true);
    try {
      const result = await onAiSuggest(have);
      setAiResults(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reste">
      <div className="reste-header">
        <button className="reste-back" onClick={onBack}>‹ Zurück</button>
        <span className="label-caps" style={{ color: 'var(--mute)' }}>RESTEVERWERTUNG</span>
        <div style={{ width: 60 }} />
      </div>

      <div className="reste-title">
        <h1 className="display" style={{ fontSize: 32, color: 'var(--espresso)' }}>
          Was muss <span style={{ fontStyle: 'italic', fontWeight: 600 }}>weg</span>?
        </h1>
        <div className="reste-subtitle">Tipp ein, was du da hast — wir finden Rezepte.</div>
      </div>

      {/* Input box with chips */}
      <div className="reste-input-box">
        {have.map(x => (
          <span key={x} className="reste-chip">
            {x}
            <button className="reste-chip-x" onClick={() => removeIngredient(x)}>
              <Icon name="x" size={11} color="var(--espresso)" strokeWidth={2.4} />
            </button>
          </span>
        ))}
        <input
          className="reste-input"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => inputVal.trim() && addIngredient(inputVal)}
          placeholder="hinzufügen …"
        />
      </div>

      {/* Suggestion chips */}
      <div className="reste-suggestions">
        <div className="reste-suggestions-label">Häufig übrig:</div>
        <div className="reste-suggestions-chips">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              className={`reste-sugg-chip ${have.includes(s) ? 'on' : 'off'}`}
              onClick={() => toggle(s)}
            >
              {have.includes(s) ? '✓ ' : '+ '}{s}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {have.length > 0 && (
        <div className="reste-results">
          <div className="subhead" style={{ marginBottom: 14 }}>
            <span className="subhead-text">Passende Rezepte</span>
            <div className="subhead-line" />
          </div>

          {matches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--mute)', fontStyle: 'italic' }}>
              Keine passenden Rezepte gefunden.
            </div>
          ) : (
            matches.map(({ recipe, hit, of }) => (
              <div key={recipe.id} className="reste-result-card" onClick={() => onSelectRecipe && onSelectRecipe(recipe)}>
                <Monogram recipe={recipe} size={54} radius={12} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 16, color: 'var(--espresso)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {recipe.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span className="reste-match-badge">{hit}/{of > 0 ? of : '?'} Zutaten</span>
                    {totalTime(recipe) > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--mute)' }}>{totalTime(recipe)} Min.</span>
                    )}
                  </div>
                </div>
                <Icon name="chev" size={17} color="var(--line-2)" />
              </div>
            ))
          )}

          {onAiSuggest && (
            <button
              style={{
                width: '100%', marginTop: 12, padding: '14px',
                background: 'var(--sage)', border: '1px solid var(--sage-2)',
                borderRadius: 14, fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600,
                color: 'var(--espresso)', cursor: 'pointer', fontStyle: 'italic',
              }}
              onClick={handleAiSuggest}
              disabled={loading}
            >
              {loading ? 'KI sucht Rezepte…' : '✨ KI-Vorschläge generieren'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
