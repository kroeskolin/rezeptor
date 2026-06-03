import { useState, useEffect, useRef } from 'react'
import { getAllTags, addTag, deleteTag, exportRecipes, importRecipes } from '../db/recipes'
import { Icon } from './DesignTokens'
import { THEMES, applyTheme, loadTheme } from '../useTheme'
import './Settings.css'

const COLORS = [
  '#FF6B6B', '#FF9F43', '#FECA57', '#48DBFB',
  '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3',
  '#1DD1A1', '#C8D6E5'
]

function Toggle({ on, onToggle }) {
  return (
    <button
      className="settings-toggle"
      style={{ background: on ? 'var(--sage-2)' : 'var(--line-2)' }}
      onClick={onToggle}
    >
      <div className="settings-toggle-knob" style={{ left: on ? 21 : 3 }} />
    </button>
  )
}

function SettingRow({ icon, label, value, toggle, on, onToggle, onClick }) {
  return (
    <div className="settings-row" style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div className="settings-row-icon">
        <Icon name={icon} size={18} color="var(--cocoa)" />
      </div>
      <span className="settings-row-label">{label}</span>
      {toggle
        ? <Toggle on={on} onToggle={onToggle} />
        : <>
            {value && <span className="settings-row-value">{value}</span>}
            <Icon name="chev" size={17} color="var(--line-2)" />
          </>
      }
    </div>
  )
}

function SettingsGroup({ title, children }) {
  return (
    <div className="settings-group">
      <div className="settings-group-label">{title}</div>
      <div className="settings-group-card">{children}</div>
    </div>
  )
}

export default function Settings({ onImport }) {
  const [tags, setTags] = useState([])
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(COLORS[0])
  const [importStatus, setImportStatus] = useState(null)
  const [notifications, setNotifications] = useState(false)
  const [showTagManager, setShowTagManager] = useState(false)
  const [activeTheme, setActiveTheme] = useState('default')
  const fileInputRef = useRef(null)

  useEffect(() => {
    getAllTags().then(setTags)
    const saved = localStorage.getItem('rezeptor-theme') || 'default'
    setActiveTheme(saved)
  }, [])

  const handleThemeChange = (themeId) => {
    applyTheme(themeId)
    setActiveTheme(themeId)
  }

  const handleAddTag = async () => {
    if (!newTagName.trim()) return
    await addTag({ name: newTagName.trim(), color: newTagColor })
    const updated = await getAllTags()
    setTags(updated)
    setNewTagName('')
    setNewTagColor(COLORS[0])
  }

  const handleDeleteTag = async (id) => {
    if (window.confirm('Tag wirklich löschen?')) {
      await deleteTag(id)
      const updated = await getAllTags()
      setTags(updated)
    }
  }

  const handleExport = async () => {
    await exportRecipes()
  }

  const handleImportFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportStatus(null)
    try {
      const text = await file.text()
      const count = await importRecipes(text)
      setImportStatus({ ok: true, message: `${count} Rezepte erfolgreich importiert!` })
      onImport?.()
    } catch (err) {
      setImportStatus({ ok: false, message: 'Fehler beim Import. Ist die Datei eine gültige Rezeptor-JSON?' })
    }
    e.target.value = ''
  }

  // ── Tag-Manager ──
  if (showTagManager) {
    return (
      <div className="settings">
        <div className="settings-header" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="settings-back-btn" onClick={() => setShowTagManager(false)}>
            <Icon name="chev-left" size={18} color="var(--cocoa)" />
          </button>
          <h1 className="display" style={{ fontSize: 30, color: 'var(--espresso)' }}>
            Tags <span style={{ fontStyle: 'italic', fontWeight: 600 }}>verwalten</span>
          </h1>
        </div>

        <div className="settings-group">
          <div className="settings-group-label">Deine Tags</div>
          <div className="settings-group-card">
            {tags.length === 0 && (
              <div style={{ padding: '16px', fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--mute)', fontStyle: 'italic' }}>
                Noch keine Tags vorhanden.
              </div>
            )}
            {tags.map((tag, i) => (
              <div key={tag.id} className="settings-row"
                style={{ borderBottom: i < tags.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: tag.color, flexShrink: 0 }} />
                <span className="settings-row-label">{tag.name}</span>
                <button onClick={() => handleDeleteTag(tag.id)} style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--paper-2)', border: '1px solid var(--line-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}>
                  <Icon name="x" size={13} color="var(--mute)" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group-label">Neuen Tag erstellen</div>
          <div className="settings-group-card" style={{ padding: '16px' }}>
            <input className="form-input" type="text" placeholder="Tag-Name …"
              value={newTagName} onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTag()}
              style={{ marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {COLORS.map(color => (
                <button key={color} onClick={() => setNewTagColor(color)} style={{
                  width: 30, height: 30, borderRadius: '50%', background: color,
                  border: newTagColor === color ? '3px solid var(--espresso)' : '3px solid transparent',
                  cursor: 'pointer', transition: 'border 0.15s',
                }} />
              ))}
            </div>
            <button className="form-save-btn" onClick={handleAddTag}
              disabled={!newTagName.trim()} style={{ opacity: newTagName.trim() ? 1 : 0.4 }}>
              Tag hinzufügen
            </button>
          </div>
        </div>
        <div style={{ height: 20 }} />
      </div>
    )
  }

  // ── Hauptansicht ──
  return (
    <div className="settings">
      <div className="settings-header">
        <h1 className="display" style={{ fontSize: 34, color: 'var(--espresso)' }}>
          Einstell<span style={{ fontStyle: 'italic', fontWeight: 600 }}>un</span>gen
        </h1>
      </div>

      <div className="settings-profile-card">
        <div className="settings-avatar">
          <span className="settings-avatar-initial">R</span>
        </div>
        <div style={{ flex: 1 }}>
          <div className="settings-profile-name">Meine Rezepte</div>
          <div className="settings-profile-email">Persönliche Sammlung</div>
        </div>
      </div>

      {/* Theme-Auswahl */}
      <div className="settings-group">
        <div className="settings-group-label">Erscheinungsbild</div>
        <div className="settings-group-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: activeTheme === theme.id ? 'var(--paper-2)' : 'none',
                  border: activeTheme === theme.id ? '1.5px solid var(--sage-2)' : '1.5px solid transparent',
                  borderRadius: 14, padding: '10px 12px', cursor: 'pointer',
                  transition: 'all 0.15s', width: '100%', textAlign: 'left',
                }}
              >
                {/* Farbvorschau */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {theme.colors.map((c, i) => (
                    <div key={i} style={{
                      width: i === 0 ? 28 : 18,
                      height: 28,
                      borderRadius: i === 0 ? 8 : i === theme.colors.length - 1 ? '0 8px 8px 0' : 4,
                      background: c,
                      border: '1px solid rgba(0,0,0,0.06)',
                    }} />
                  ))}
                </div>
                {/* Name */}
                <span style={{
                  fontFamily: 'var(--serif)', fontSize: 15.5,
                  fontWeight: activeTheme === theme.id ? 700 : 400,
                  color: 'var(--espresso)',
                }}>
                  {theme.name}
                </span>
                {activeTheme === theme.id && (
                  <div style={{ marginLeft: 'auto' }}>
                    <Icon name="check" size={18} color="var(--green)" strokeWidth={2.2} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tags */}
      <SettingsGroup title="Kategorien & Tags">
        <SettingRow icon="bookmark" label="Tags verwalten"
          value={tags.length > 0 ? `${tags.length} Tags` : undefined}
          onClick={() => setShowTagManager(true)} />
      </SettingsGroup>

      {/* App */}
      <SettingsGroup title="App">
        <SettingRow icon="bell" label="Benachrichtigungen"
          toggle on={notifications} onToggle={() => setNotifications(v => !v)} />
        <SettingRow icon="download" label="Rezepte exportieren" onClick={handleExport} />
        <SettingRow icon="import" label="Rezepte importieren"
          onClick={() => fileInputRef.current?.click()} />
      </SettingsGroup>

      {importStatus && (
        <div style={{
          margin: '16px 20px 0', padding: '14px 16px', borderRadius: 12,
          background: importStatus.ok ? 'var(--sage)' : 'var(--rose)',
          border: `1px solid ${importStatus.ok ? 'var(--sage-2)' : 'var(--rose-2)'}`,
          fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--espresso)',
        }}>
          {importStatus.message}
        </div>
      )}

      <SettingsGroup title="Über">
        <SettingRow icon="help" label="Hilfe & Feedback" />
        <SettingRow icon="shield" label="Datenschutz" />
      </SettingsGroup>

      <div className="settings-footer">
        <em>Rezeptor</em>
        <div className="settings-footer-version">Version 1.0</div>
      </div>

      <input ref={fileInputRef} type="file" accept=".json"
        style={{ display: 'none' }} onChange={handleImportFile} />
      <div style={{ height: 20 }} />
    </div>
  )
}
