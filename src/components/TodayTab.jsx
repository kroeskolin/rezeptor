import './TodayTab.css';
import { Icon } from './DesignTokens';

function InspoTile({ icon, title, sub, tone, onClick }) {
  const isDark = tone === 'green';
  const bg = tone === 'green'
    ? 'var(--green-grad)'
    : tone === 'sage' ? 'var(--sage)'
      : tone === 'rose' ? 'var(--rose)'
        : 'var(--card)';

  const ink = isDark ? 'var(--paper)' : 'var(--espresso)';
  const subInk = isDark ? 'rgba(249,251,248,0.75)' : 'var(--cocoa)';
  const iconBg = isDark ? 'rgba(249,251,248,0.16)' : 'var(--paper)';
  const iconColor = isDark ? 'var(--paper)' : 'var(--espresso)';
  const chevColor = isDark ? 'rgba(249,251,248,0.5)' : 'var(--line-2)';

  return (
    <div
      className="inspo-tile"
      style={{
        background: bg,
        border: isDark ? 'none' : '1px solid var(--line)',
        boxShadow: isDark ? '0 16px 30px -18px rgba(60,82,50,0.6)' : 'var(--shadow-card)',
      }}
      onClick={onClick}
    >
      <div className="inspo-tile-icon" style={{ background: iconBg }}>
        <Icon name={icon} size={24} color={iconColor} strokeWidth={1.7} />
      </div>
      <div className="inspo-tile-body">
        <div className="inspo-tile-title" style={{ color: ink }}>{title}</div>
        <div className="inspo-tile-sub" style={{ color: subInk }}>{sub}</div>
      </div>
      <Icon name="chev" size={18} color={chevColor} />
    </div>
  );
}

export default function TodayTab({ onSelectMode }) {
  return (
    <div className="inspiration-tab">
      <div className="inspiration-header">
        <h1 className="display" style={{ fontSize: 34, color: 'var(--espresso)' }}>
          Inspir<span style={{ fontStyle: 'italic', fontWeight: 600 }}>at</span>ion
        </h1>
      </div>

      <div className="inspiration-tools">
        <InspoTile
          icon="cards"
          title="Rezepte-Tinder"
          sub="Da will man reinbeißen!"
          tone="green"
          onClick={() => onSelectMode('tinder')}
        />
        <InspoTile
          icon="recycle"
          title="Resteverwertung"
          sub="Neuer Lebenssinn für traurige Schrumpelmöhren"
          tone="sage"
          onClick={() => onSelectMode('ingredients')}
        />
        <InspoTile
          icon="dice"
          title="Glücksrad"
          sub="Leben am Limit"
          tone="rose"
          onClick={() => onSelectMode('wheel')}
        />
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}
