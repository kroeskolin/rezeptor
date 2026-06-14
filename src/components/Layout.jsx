import './Layout.css';
import { Icon, Wordmark } from './DesignTokens';

export default function Layout({ activeTab, onTabChange, onFabClick, children, hideNav, onFavClick, favActive, onSearchClick }) {
  const tabs = [
    { id: 'home', icon: 'book', label: 'Rezepte' },
    { id: 'today', icon: 'plate', label: 'Inspiration' },
    null,
    { id: 'community', icon: 'heartnav', label: 'Community' },
    { id: 'settings', icon: 'wrench', label: 'Einstellungen' },
  ];

  const leftTabs = tabs.slice(0, 2);
  const rightTabs = tabs.slice(3);

  const tabTitles = {
    home: null, // Wordmark
    today: 'Inspiration',
    community: 'Community',
    settings: 'Einstellungen',
  };

  return (
    <div className="app-shell">

      {/* Grüner Header — nur auf Tab-Hauptseiten */}
      {!hideNav && (
        <div className="app-header">
          <div className="app-header-left">
            <Wordmark size={24} color="#F9FBF8" />
          </div>
          <div className="app-header-right">
            {activeTab === 'home' && (
              <>
                <button
                  className="app-header-btn"
                  onClick={onFavClick}
                  style={{ background: favActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)' }}
                  aria-label="Nur Favoriten"
                >
                  <Icon name="heart" size={17} color="#F9FBF8"
                    fill={favActive} strokeWidth={favActive ? 0 : 1.8} />
                </button>
                <button className="app-header-btn" onClick={onSearchClick} aria-label="Suchen">
                  <Icon name="search" size={17} color="#F9FBF8" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div
        className="app-content"
        style={hideNav ? { paddingTop: 'var(--sat, env(safe-area-inset-top, 44px))' } : {}}
      >
        {children}
      </div>

      {!hideNav && (
        <div className="bottom-nav">
          <div className="bottom-nav-row">
            {leftTabs.map(tab => (
              <button
                key={tab.id}
                className={`bottom-nav-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon
                  name={tab.icon}
                  size={23}
                  color={activeTab === tab.id ? 'var(--espresso)' : 'var(--mute)'}
                  strokeWidth={activeTab === tab.id ? 1.95 : 1.5}
                  fill={activeTab === tab.id && tab.icon === 'heartnav'}
                />
                <span>{tab.label}</span>
              </button>
            ))}

            <div className="fab-wrapper">
              <div className="fab-halo" />
              <button className="fab-btn" onClick={onFabClick} aria-label="Rezept hinzufügen">
                <Icon name="plus" size={28} color="#F9FBF8" strokeWidth={2.4} />
              </button>
              <span className="fab-label">Hinzufügen</span>
            </div>

            {rightTabs.map(tab => (
              <button
                key={tab.id}
                className={`bottom-nav-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon
                  name={tab.icon}
                  size={23}
                  color={activeTab === tab.id ? 'var(--espresso)' : 'var(--mute)'}
                  strokeWidth={activeTab === tab.id ? 1.95 : 1.5}
                  fill={activeTab === tab.id && tab.icon === 'heartnav'}
                />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}