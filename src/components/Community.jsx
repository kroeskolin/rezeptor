import './Community.css';
import { Icon } from './DesignTokens';

function CircleMono({ name, size = 40, idx = 0 }) {
  const tints = [
    { bg: '#C8D9BF', ink: '#3C5232' },
    { bg: '#EDD4CF', ink: '#8A4F46' },
    { bg: '#E7DCC6', ink: '#6A5230' },
    { bg: '#DCE7D0', ink: '#46603A' },
  ];
  const t = tints[idx % tints.length];
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="community-card-avatar" style={{ background: t.bg, width: size, height: size }}>
      <span style={{ fontFamily: 'var(--logo)', fontWeight: 600, fontSize: size * 0.46, color: t.ink, lineHeight: 1 }}>
        {initial}
      </span>
    </div>
  );
}

export default function Community() {
  return (
    <div className="community">
      <div className="community-header">
        <h1 className="display" style={{ fontSize: 34, color: 'var(--espresso)' }}>
          Comm<span style={{ fontStyle: 'italic', fontWeight: 600 }}>un</span>ity
        </h1>
        <CircleMono name="Du" size={38} idx={3} />
      </div>

      <div style={{
        margin: '60px 20px 0',
        textAlign: 'center', padding: '40px 24px', color: 'var(--mute)',
        fontFamily: 'var(--serif)', fontSize: 15, fontStyle: 'italic',
        background: 'var(--paper-2)', borderRadius: 16, border: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        <Icon name="heart" size={28} color="var(--sage-2)" />
        <div>Das Community-Feature folgt bald!</div>
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}
