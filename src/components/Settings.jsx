import { useState, useEffect, useRef } from 'react'
import { getAllTags, addTag, updateTag, deleteTag, exportRecipes, importRecipes } from '../db/recipes'
import { Icon } from './DesignTokens'
import { THEMES, applyTheme } from '../useTheme'
import { useAuth } from '../contexts/AuthContext'
import JoinCommunity from './JoinCommunity'
import './Settings.css'

// Web3Forms Access-Key — kostenlos auf web3forms.com mit brr.kroeske@gmail.com anlegen.
// Solange der Platzhalter steht, weist das Formular freundlich darauf hin.
const WEB3FORMS_ACCESS_KEY = 'DEIN_WEB3FORMS_ACCESS_KEY'

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
  { name: 'Snack', color: '#FFA726' },
  { name: 'Dessert', color: '#F06292' },
  { name: 'Partyessen', color: '#F44336' },
  { name: 'Festlich', color: '#D32F2F' },
  { name: 'Vegetarisch', color: '#66BB6A' },
  { name: 'Vegan', color: '#2E7D32' },
  { name: 'Fleisch', color: '#A1665A' },
  { name: 'Fisch', color: '#26C6DA' },
  { name: 'Super easy', color: '#64B5F6' },
  { name: 'Herausfordernd', color: '#1976D2' },
  { name: 'Suppe', color: '#26C6DA' },
  { name: 'Auflauf', color: '#FFA726' },
  { name: 'Backen süß', color: '#F06292' },
  { name: 'Backen herzhaft', color: '#A1665A' },
  { name: 'Schmoren', color: '#6D4C41' },
  { name: 'Salat', color: '#66BB6A' },
  { name: 'Pfannengericht', color: '#FFEE58' },
  { name: 'Familienrezept', color: '#9C27B0' },
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
  const { user, logout } = useAuth()
  const [tags, setTags] = useState([])
  const [importStatus, setImportStatus] = useState(null)
  const [showTagManager, setShowTagManager] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [editingTag, setEditingTag] = useState(null) // null = create, tag object = edit
  const [showSheet, setShowSheet] = useState(false)
  const [activeTheme, setActiveTheme] = useState('default')
  const [loadingStarter, setLoadingStarter] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [contactMsg, setContactMsg] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactBusy, setContactBusy] = useState(false)
  const [contactSent, setContactSent] = useState(false)
  const fileInputRef = useRef(null)

  const reload = () => getAllTags().then(setTags)

  useEffect(() => {
    reload()
    const saved = localStorage.getItem('rezeptor-theme') || 'default'
    setActiveTheme(saved)
  }, [])

  // Tag-Liste live nachladen, wenn der Cloud-Sync neue Tags bringt
  useEffect(() => {
    const onTagsUpdated = () => reload()
    window.addEventListener('rezeptor:tags-updated', onTagsUpdated)
    return () => window.removeEventListener('rezeptor:tags-updated', onTagsUpdated)
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
              <p style={{ fontFamily: 'var(--serif)', fontSize: 13.5, color: 'var(--cocoa)', margin: '0 0 8px' }}>
                Diese Tags sind im Starterpaket enthalten:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {STARTER_TAGS.map(t => (
                  <span key={t.name} style={{
                    border: `1.5px solid ${t.color}`, color: t.color,
                    borderRadius: 20, padding: '3px 11px', fontSize: 13,
                    fontFamily: 'var(--serif)', fontWeight: 600,
                  }}>
                    {t.name}
                  </span>
                ))}
              </div>
              <button className="tag-starter-btn" onClick={handleLoadStarter}
                disabled={loadingStarter} style={{ width: '100%' }}>
                {loadingStarter ? 'Wird geladen …' : '✨ Starterpaket laden'}
              </button>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 12.5, color: 'var(--mute)', fontStyle: 'italic', margin: '10px 0 0' }}>
                Alternativ kannst du dir unten eigene Tags anlegen.
              </p>
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

  const handleSendContact = async () => {
    const msg = contactMsg.trim()
    const mail = contactEmail.trim()
    if (!msg) return
    if (WEB3FORMS_ACCESS_KEY === 'DEIN_WEB3FORMS_ACCESS_KEY') {
      alert('Das Kontaktformular ist noch nicht eingerichtet (Access-Key fehlt).')
      return
    }
    setContactBusy(true)
    try {
      const payload = {
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: 'Nutzer-Feedback Rezeptor',
        from_name: 'Rezeptor-Feedback',
        message: msg + '\n\n' + (mail ? `Antwortadresse des Nutzers: ${mail}` : 'Keine Antwortadresse angegeben.'),
      }
      // Wenn der Nutzer eine Mail angibt, als Reply-To setzen (direkt antwortbar).
      if (mail) payload.email = mail
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || 'Unbekannter Fehler')
      setContactSent(true)
      setContactMsg('')
      setContactEmail('')
    } catch (e) {
      alert('Senden fehlgeschlagen: ' + e.message)
    } finally {
      setContactBusy(false)
    }
  }

  // ── Kontakt ──
  if (showContact) {
    return (
      <div className="settings">
        <div className="settings-header" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="settings-back-btn" onClick={() => { setShowContact(false); setContactSent(false) }}>
            <Icon name="chev-left" size={18} color="var(--cocoa)" />
          </button>
          <h1 className="display" style={{ fontSize: 30, color: 'var(--espresso)' }}>
            Kon<span style={{ fontStyle: 'italic', fontWeight: 600 }}>takt</span>
          </h1>
        </div>

        {contactSent ? (
          <div className="settings-group">
            <div className="settings-group-card" style={{ padding: '24px 18px', textAlign: 'center' }}>
              <div style={{ marginBottom: 10 }}>
                <Icon name="check" size={34} color="var(--green)" strokeWidth={2.2} />
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 700, color: 'var(--espresso)', marginBottom: 4 }}>
                Danke für deine Nachricht!
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 13.5, color: 'var(--cocoa)' }}>
                Sie ist angekommen. Wenn du eine Antwortadresse angegeben hast, melde ich mich.
              </div>
            </div>
          </div>
        ) : (
          <div className="settings-group">
            <div className="settings-group-card" style={{ padding: '18px' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 14.5, color: 'var(--cocoa)', lineHeight: 1.5, marginBottom: 16 }}>
                Fragen? Fehlt dir eine Funktion oder funktioniert etwas nicht? Schreib mir!
              </div>
              <textarea
                value={contactMsg}
                onChange={e => setContactMsg(e.target.value)}
                placeholder="Deine Nachricht …"
                rows={6}
                style={{
                  width: '100%', boxSizing: 'border-box', borderRadius: 14, border: '1px solid var(--line-2)',
                  padding: '12px 14px', fontFamily: 'var(--serif)', fontSize: 14.5, color: 'var(--ink)',
                  background: 'var(--paper)', resize: 'vertical',
                }}
              />
              <input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="Deine E-Mail (optional, für eine Antwort)"
                style={{
                  width: '100%', boxSizing: 'border-box', borderRadius: 14, border: '1px solid var(--line-2)',
                  padding: '12px 14px', fontFamily: 'var(--serif)', fontSize: 14.5, color: 'var(--ink)',
                  background: 'var(--paper)', marginTop: 10,
                }}
              />
              <button
                onClick={handleSendContact}
                disabled={!contactMsg.trim() || contactBusy}
                style={{
                  marginTop: 14, width: '100%', padding: '13px', borderRadius: 14, border: 'none',
                  background: 'var(--green)', color: '#F9FBF8', fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600,
                  cursor: 'pointer', opacity: (!contactMsg.trim() || contactBusy) ? 0.5 : 1,
                }}
              >
                {contactBusy ? 'Wird gesendet …' : 'Absenden'}
              </button>
            </div>
          </div>
        )}
        <div style={{ height: 20 }} />
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
                  <span style={{
                    fontFamily: 'var(--serif)', fontSize: 15.5,
                    fontWeight: activeTheme === theme.id ? 700 : 400, color: 'var(--espresso)'
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

      {user !== undefined && (
        <SettingsGroup title="Community-Konto">
          {user ? (
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--green)', color: 'var(--paper)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 17,
                }}>
                  {(user.displayName || '?').trim().charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 15, color: 'var(--espresso)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.displayName || 'Angemeldet'}
                </div>
                {user.email && (
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 12.5, color: 'var(--mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </div>
                )}
              </div>
              <button onClick={() => logout()}
                style={{
                  background: 'var(--card)', color: 'var(--cocoa)', border: '1px solid var(--line-2)',
                  borderRadius: 10, padding: '8px 14px', fontSize: 13,
                  fontFamily: 'var(--serif)', cursor: 'pointer', flexShrink: 0,
                }}>
                Abmelden
              </button>
            </div>
          ) : (
            <div style={{ padding: '12px 16px' }}>
              <JoinCommunity />
            </div>
          )}
        </SettingsGroup>
      )}

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

      <SettingsGroup title="Hilfe">
        <SettingRow icon="help" label="Kontakt" onClick={() => setShowContact(true)} />
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
