import { useState, useEffect, useRef } from 'react'
import { getAllTags, addTag, updateTag, deleteTag, exportRecipes, importRecipes } from '../db/recipes'
import { Icon } from './DesignTokens'
import { THEMES, applyTheme } from '../useTheme'
import './Settings.css'

const COLORS = [
  '#FFCDD2', '#EF9A9A', '#E57373', '#F44336', '#D32F2F',
  '#F8BBD9', '#F06292', '#C2185B',
  '#FFE0B2', '#FFCC80', '#FFA726', '#E65100',
  '#FFF176', '#FFEE58', '#F9A825',
  '#DCEDC8', '#AED581', '#66BB6A', '#2E7D32',
  '#C8D9BF', '#4C6A3E', '#B2EBF2', '#26C6DA',
  '#BBDEFB', '#64B5F6', '#1976D2', '#0D47A1',
  '#E1BEE7', '#CE93D8', '#9C27B0', '#4A148C',
  '#EDD4CF', '#D7A89A', '#A1665A', '#6D4C41',
  '#BDBDBD', '#757575', '#212121'
]

const STARTER_TAGS = [
  { name: 'Snack',               color: '#FFA726' },
  { name: 'Dessert',             color: '#F06292' },
  { name: 'Partyessen',          color: '#F44336' },
  { name: 'Festlich',            color: '#D32F2F' },
  { name: 'Vegetarisch',         color: '#66BB6A' },
  { name: 'Vegan',               color: '#2E7D32' },
  { name: 'Fleisch',             color: '#A1665A' },
  { name: 'Fisch',               color: '#26C6DA' },
  { name: 'Super easy',          color: '#64B5F6' },
  { name: 'Herausfordernd',      color: '#1976D2' },
  { name: 'Suppe',               color: '#26C6DA' },
  { name: 'Auflauf',             color: '#FFA726' },
  { name: 'Backen süß',          color: '#F06292' },
  { name: 'Backen herzhaft',     color: '#A1665A' },
  { name: 'Schmoren',            color: '#6D4C41' },
  { name: 'Salat',               color: '#66BB6A' },
  { name: 'Pfannengericht',      color: '#FFEE58' },
  { name: 'Familienrezept',      color: '#9C27B0' },
  { name: 'Noch nie zubereitet', color: '#CE93D8' },
]

const BUILD_DATE = new Date(document.lastModified).toLocaleDateString('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric'
})

function Toggle({ on, onToggle }) {
  return (
    <button className="settings-toggle"
      style={{ background: on ? 'var(--sage-2)' : 'var(--line-2)' }}
      onClick={onToggle}>
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
            {onClick && <Icon name="chev" size={17} color="var(--line-2)" />}
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

// Sheet für Erstellen UND Bearbeiten
function TagSheet({ tag, onSave, onClose }) {
  const isEdit = !!tag
  const [name, setName] = useState(tag?.name || '')
  const [color, setColor] = useState(tag?.color || COLORS[10])

  const handleSave = async () => {
    if (!name.trim()) return
    if (isEdit) {
      await updateTag({ ...tag, name: name.trim(), color })
    } else {
      await addTag({ name: name.trim(), color })
    }
    onSave()
  }

  return (
    <div className="tag-sheet-overlay" onClick={onClose}>
      <div className="tag-sheet" onClick={e => e.stopPropagation()}>
        <div className="tag-sheet-handle" />
        <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--mute)', fontStyle: 'italic', marginBottom: 8 }}>
          {isEdit ? 'Tag bearbeiten' : 'Neuen Tag erstellen'}
        </div>
        <input className="tag-sheet-input" type="text" placeholder="Tag-Name …"
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()} autoFocus />
        <div className="tag-color-grid">
          {COLORS.map(c => (
            <button key={c} className={`tag-color-dot ${color === c ? 'active' : ''}`}
              style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
        <div className="tag-sheet-actions">
          <button className="tag-create-cancel" onClick={onClose}>Abbrechen</button>
          <button className="tag-create-save" onClick={handleSave}
            disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.4 }}>
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Settings({ onImport, onShowTagManager, onHideTagManager }) {
  const [tags, setTags] = useState([])
  const [importStatus, setImportStatus] = useState(null)
  const [notifications, setNotifications] = useState(false)
  const [showTagManager, setShowTagManager] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [editingTag, setEditingTag] = useState(null) // null = create, tag object = edit
  const [showSheet, setShowSheet] = useState(false)
  const [activeTheme, setActiveTheme] = useState('default')
  const [loadingStarter, setLoadingStarter] = useState(false)
  const fileInputRef = useRef(null)

  const reload = () => getAllTags().then(setTags)

  useEffect(() => {
    reload()
    const saved = localStorage.getItem('rezeptor-theme') || 'default'
    setActiveTheme(saved)
  }, [])

  const openTagManager = () => {
    setShowTagManager(true)
    setEditMode(false)
    onShowTagManager?.()
  }

  const closeTagManager = () => {
    setShowTagManager(false)
    setEditMode(false)
    onHideTagManager?.()
  }

  const handleThemeChange = (themeId) => {
    applyTheme(themeId)
    setActiveTheme(themeId)
  }

  const handleDeleteTag = async (id) => {
    await deleteTag(id)
    await reload()
  }

  const handleLoadStarter = async () => {
    setLoadingStarter(true)
    for (const tag of STARTER_TAGS) await addTag(tag)
    await reload()
    setLoadingStarter(false)
  }

  const handleExport = async () => { await exportRecipes() }

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

  const currentThemeName = THEMES.find(t => t.id === activeTheme)?.name || 'Waldgrün'

  // ── Tag-Manager ──
  if (showTagManager) {
    return (
      <div className="settings tag-manager-page">
        <div className="tag-manager-header">
          <button className="add-close-btn" onClick={closeTagManager}>
            <Icon name="chev-left" size={18} color="var(--cocoa)" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 className="display" style={{ fontSize: 28, color: 'var(--espresso)', lineHeight: 1 }}>
              Tags <span style={{ fontStyle: 'italic', fontWeight: 600 }}>verwalten</span>
            </h1>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--mute)', marginTop: 3 }}>
              {tags.length} {tags.length === 1 ? 'Tag' : 'Tags'}
            </div>
          </div>
          <button className="add-close-btn" onClick={() => setEditMode(v => !v)}>
            {editMode
              ? <Icon name="check" size={16} color="var(--green)" strokeWidth={2.4} />
              : <Icon name="pencil" size={15} color="var(--cocoa)" strokeWidth={1.8} />
            }
          </button>
        </div>

        <div className="tag-manager-scroll">
          {tags.length === 0 ? (
            <div style={{ padding: '24px 20px', fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--mute)', fontStyle: 'italic', textAlign: 'center' }}>
              Noch keine Tags vorhanden.
            </div>
          ) : (
            <div className="tag-manager-grid">
              {tags.map(tag => (
                <div
                  key={tag.id}
                  className="tag-manager-item"
                  onClick={() => {
                    if (editMode) {
                      setEditingTag(tag)
                      setShowSheet(true)
                    }
                  }}
                  style={{ cursor: editMode ? 'pointer' : 'default' }}
                >
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: tag.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 14.5, color: 'var(--espresso)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tag.name}
                  </span>
                  {editMode && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteTag(tag.id) }}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--paper-2)', border: '1px solid var(--line-2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}>
                      <Icon name="x" size={11} color="var(--mute)" strokeWidth={2.2} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {tags.length === 0 && (
            <div style={{ padding: '0 20px' }}>
              <button className="tag-starter-btn" onClick={handleLoadStarter}
                disabled={loadingStarter} style={{ width: '100%' }}>
                {loadingStarter ? 'Wird geladen …' : '✨ Starterpaket laden'}
              </button>
            </div>
          )}

          {editMode && tags.length > 0 && (
            <div style={{ padding: '12px 0 0', fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--mute)', fontStyle: 'italic', textAlign: 'center' }}>
              Tippe auf einen Tag zum Bearbeiten · X zum Löschen
            </div>
          )}
        </div>

        <div className="tag-manager-footer">
          <button className="form-save-btn" onClick={() => { setEditingTag(null); setShowSheet(true) }}>
            + Neuen Tag erstellen
          </button>
        </div>

        {showSheet && (
          <TagSheet
            tag={editingTag}
            onSave={async () => { await reload(); setShowSheet(false); setEditingTag(null) }}
            onClose={() => { setShowSheet(false); setEditingTag(null) }}
          />
        )}
      </div>
    )
  }

  // ── Theme-Picker ──
  if (showThemePicker) {
    return (
      <div className="settings">
        <div className="settings-header" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="settings-back-btn" onClick={() => setShowThemePicker(false)}>
            <Icon name="chev-left" size={18} color="var(--cocoa)" />
          </button>
          <h1 className="display" style={{ fontSize: 30, color: 'var(--espresso)' }}>
            Farb<span style={{ fontStyle: 'italic', fontWeight: 600 }}>schema</span>
          </h1>
        </div>
        <div className="settings-group">
          <div className="settings-group-label">Thema wählen</div>
          <div className="settings-group-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {THEMES.map(theme => (
                <button key={theme.id} onClick={() => handleThemeChange(theme.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: activeTheme === theme.id ? 'var(--paper-2)' : 'none',
                    border: activeTheme === theme.id ? '1.5px solid var(--sage-2)' : '1.5px solid transparent',
                    borderRadius: 14, padding: '10px 12px', cursor: 'pointer',
                    transition: 'all 0.15s', width: '100%', textAlign: 'left',
                  }}>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {theme.colors.map((c, i) => (
                      <div key={i} style={{
                        width: i === 0 ? 28 : 18, height: 28,
                        borderRadius: i === 0 ? 8 : i === theme.colors.length - 1 ? '0 8px 8px 0' : 4,
                        background: c, border: '1px solid rgba(0,0,0,0.06)',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 15.5,
                    fontWeight: activeTheme === theme.id ? 700 : 400, color: 'var(--espresso)' }}>
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

      <SettingsGroup title="Benachrichtigungen">
        <SettingRow icon="bell" label="Benachrichtigungen"
          toggle on={notifications} onToggle={() => setNotifications(v => !v)} />
      </SettingsGroup>

      <SettingsGroup title="Kategorien & Tags">
        <SettingRow icon="bookmark" label="Tags verwalten"
          value={tags.length > 0 ? `${tags.length} Tags` : undefined}
          onClick={openTagManager} />
      </SettingsGroup>

      <SettingsGroup title="Daten">
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

      <SettingsGroup title="Erscheinungsbild">
        <SettingRow icon="sun" label="Farbschema wählen"
          value={currentThemeName} onClick={() => setShowThemePicker(true)} />
      </SettingsGroup>

      <div className="settings-footer">
        <em>Rezeptor</em>
        <div className="settings-footer-version">Version 1.0</div>
        <div className="settings-footer-version" style={{ marginTop: 2 }}>
          Zuletzt aktualisiert am {BUILD_DATE}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".json"
        style={{ display: 'none' }} onChange={handleImportFile} />
      <div style={{ height: 20 }} />
    </div>
  )
}
