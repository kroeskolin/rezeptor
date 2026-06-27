import { useState } from 'react';
import './LuckyWheel.css';
import { Icon, LoveDot } from './DesignTokens';

export default function LuckyWheel({ recipes, onBack, onSelectRecipe }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);

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
          Füge Rezepte hinzu, um das Glücksrad zu drehen! 🎲
        </div>
      </div>
    );
  }

  const available = (recipes || []).filter(r => {
    if (!selectedTag) return true;
    return r.tags?.some(t => (t.name || t) === selectedTag);
  });

  const labels = available.length > 0
    ? available.slice(0, 8).map(r => r.title)
    : ['Carbonara', 'Risotto', 'Suppe', 'Salat', 'Pizza', 'Nudeln', 'Curry', 'Omelette'];

  const N = Math.min(labels.length, 8);
  const fills = ['var(--sage)', 'var(--rose)', '#E9DAC4', '#DCE6D2'];
  const cx = 130, cy = 130, r = 124;
  const seg = (Math.PI * 2) / N;
  const start = -Math.PI / 2 - seg / 2;

  const wedge = (a0, a1) => {
    const pt = a => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
  };

  const spin = () => {
    if (spinning || labels.length === 0) return;
    setSpinning(true);
    setResult(null);

    const spins = 5 + Math.random() * 5;
    const extra = Math.random() * 360;
    const totalDeg = spins * 360 + extra;
    const newRotation = rotation + totalDeg;
    setRotation(newRotation);

    setTimeout(() => {
      setSpinning(false);
      const normalised = ((360 - (newRotation % 360)) + (360 / N / 2)) % 360;
      const idx = Math.floor((normalised / 360) * N) % N;
      if (available[idx]) setResult(available[idx]);
    }, 2800);
  };

  // Collect unique tags
  const allTags = [...new Set(
    (recipes || []).flatMap(r => (r.tags || []).map(t => t.name || t))
  )].slice(0, 6);

  return (
    <div className="lucky-wheel">
      <div className="lucky-wheel-header">
        <button className="lucky-wheel-back" onClick={onBack}>‹ Zurück</button>
        <span className="label-caps" style={{ color: 'var(--mute)' }}>GLÜCKSRAD</span>
        <div style={{ width: 60 }} />
      </div>

      <div className="lucky-wheel-title">
        <h1 className="display" style={{ fontSize: 34, color: 'var(--espresso)' }}>
          Was koche ich <span style={{ fontStyle: 'italic', fontWeight: 600 }}>heute</span>?
        </h1>
      </div>

      <div className="lucky-wheel-svg-wrap">
        <div style={{ position: 'relative', width: 260, height: 260 }}>
          {/* Pointer */}
          <svg width="30" height="22" viewBox="0 0 30 22" style={{
            position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', zIndex: 3,
            filter: 'drop-shadow(0 3px 4px rgba(71,53,40,0.3))',
          }}>
            <path d="M15 21 L3 3 Q15 9 27 3 Z" fill="var(--espresso)" />
          </svg>

          <svg width="260" height="260" viewBox="0 0 260 260" style={{
            filter: 'drop-shadow(0 18px 30px rgba(71,53,40,0.22))',
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? `transform ${2.8}s cubic-bezier(0.17,0.67,0.12,1)` : 'none',
          }}>
            <circle cx={cx} cy={cy} r={r + 4} fill="var(--card)" />
            {labels.slice(0, N).map((lab, i) => {
              const a0 = start + i * seg, a1 = a0 + seg;
              const mid = a0 + seg / 2;
              const lx = cx + (r * 0.62) * Math.cos(mid);
              const ly = cy + (r * 0.62) * Math.sin(mid);
              let deg = (mid * 180) / Math.PI;
              if (deg > 90 && deg < 270) deg += 180;
              const shortLabel = lab.length > 9 ? lab.slice(0, 8) + '…' : lab;
              return (
                <g key={i}>
                  <path d={wedge(a0, a1)} fill={fills[i % fills.length]} stroke="var(--paper)" strokeWidth="2" />
                  <text x={lx} y={ly} fill="var(--espresso)"
                    fontFamily="Source Serif 4, serif" fontSize="12" fontWeight="600" fontStyle="italic"
                    textAnchor="middle" dominantBaseline="middle"
                    transform={`rotate(${deg.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})`}>
                    {shortLabel}
                  </text>
                </g>
              );
            })}
            <circle cx={cx} cy={cy} r="30" fill="var(--card)" stroke="var(--line-2)" strokeWidth="1" />
          </svg>

          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%,-50%)', zIndex: 2,
          }}>
            <LoveDot size={34} />
          </div>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="lucky-wheel-tag-chips">
          {['Alle', ...allTags].map(tag => (
            <button
              key={tag}
              className={`search-chip${(tag === 'Alle' ? !selectedTag : selectedTag === tag) ? ' active' : ''}`}
              onClick={() => setSelectedTag(tag === 'Alle' ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <button className="lucky-wheel-spin-btn" onClick={spin} disabled={spinning}>
        {spinning ? 'Dreht sich…' : 'Drehen'}
      </button>

      {result && !spinning && (
        <div className="lucky-wheel-result" onClick={() => onSelectRecipe && onSelectRecipe(result)}>
          <div className="lucky-wheel-result-label">Heute gibt es:</div>
          <div className="lucky-wheel-result-title">{result.title}</div>
          <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 4, fontStyle: 'italic' }}>
            Tippen zum Öffnen →
          </div>
        </div>
      )}
    </div>
  );
}
