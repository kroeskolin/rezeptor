import { useState } from 'react';
import './Community.css';
import { Monogram, Icon, LoveDot, totalTime } from './DesignTokens';

const MOCK_FEED = [
  { who: 'Mara',  when: 'vor 2 Std.', verb: 'hat ein Rezept hinzugefügt', likes: 12, idx: 0 },
  { who: 'Jonas', when: 'gestern',     verb: 'kocht gerade',               likes: 8,  idx: 1 },
  { who: 'Elif',  when: 'vor 2 Tagen', verb: 'empfiehlt',                  likes: 21, idx: 2 },
];

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

export default function Community({ recipes }) {
  const [activeTab, setActiveTab] = useState('Freunde');
  const tabs = ['Freunde', 'Entdecken'];

  // Use real recipes for mock feed
  const feedRecipes = (recipes || []).slice(0, 3);

  return (
    <div className="community">
      <div className="community-header">
        <h1 className="display" style={{ fontSize: 34, color: 'var(--espresso)' }}>
          Comm<span style={{ fontStyle: 'italic', fontWeight: 600 }}>un</span>ity
        </h1>
        <CircleMono name="Du" size={38} idx={3} />
      </div>

      {/* Toggle */}
      <div className="community-toggle-row">
        {tabs.map((t, i) => (
          <button
            key={t}
            className="community-toggle-pill"
            style={{
              background: activeTab === t ? 'var(--sage)' : 'var(--card)',
              borderColor: activeTab === t ? 'var(--sage-2)' : 'var(--line-2)',
              color: 'var(--espresso)',
              fontWeight: activeTab === t ? 700 : 500,
            }}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="community-feed">
        {MOCK_FEED.map((item, i) => {
          const recipe = feedRecipes[i] || null;
          return (
            <div key={i} className="community-card">
              <div className="community-card-top">
                <CircleMono name={item.who} size={38} idx={item.idx} />
                <div style={{ flex: 1 }}>
                  <div className="community-card-name">{item.who}</div>
                  <div className="community-card-action">{item.verb}</div>
                </div>
                <span className="community-card-time">{item.when}</span>
              </div>

              {recipe && (
                <div className="community-recipe-mini">
                  <Monogram recipe={recipe} size={42} radius={10} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 14.5, color: 'var(--espresso)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {recipe.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2, fontStyle: 'italic' }}>
                      {totalTime(recipe) > 0 ? `${totalTime(recipe)} Min.` : 'Kein Zeitangabe'}
                    </div>
                  </div>
                </div>
              )}

              {!recipe && (
                <div className="community-recipe-mini">
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--line)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 14, background: 'var(--line)', borderRadius: 6, marginBottom: 6, width: '60%' }} />
                    <div style={{ height: 10, background: 'var(--line)', borderRadius: 4, width: '40%' }} />
                  </div>
                </div>
              )}

              <div className="community-card-footer">
                <div className="community-likes">
                  <Icon name="heart" size={15} color="var(--rose-ink)" fill strokeWidth={0} />
                  <span>{item.likes}</span>
                </div>
                <button className="community-save-btn">
                  <Icon name="bookmark" size={14} color="var(--paper)" />
                  Speichern
                </button>
              </div>
            </div>
          );
        })}

        {/* Coming soon note */}
        <div style={{
          textAlign: 'center', padding: '20px', color: 'var(--mute)',
          fontFamily: 'var(--serif)', fontSize: 13, fontStyle: 'italic',
          background: 'var(--paper-2)', borderRadius: 14, border: '1px solid var(--line)',
        }}>
          Community-Features kommen bald! 🌱
        </div>
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
}
