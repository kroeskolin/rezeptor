import { useState, useEffect } from 'react'
import { getAllTags, addTag } from '../db/recipes'
import './TagPicker.css'

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

function CreateTagSheet({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[10])

  const handleSave = async () => {
    if (!name.trim()) return
    await addTag({ name: name.trim(), color })
    onSave()
  }

  return (
    <div className="tag-sheet-overlay" onClick={onClose}>
      <div className="tag-sheet" onClick={e => e.stopPropagation()}>
        <div className="tag-sheet-handle" />
        <input
          className="tag-sheet-input"
          type="text"
          placeholder="Tag-Name …"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          autoFocus
        />
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

function TagPicker({ selectedTags, onChange }) {
  const [tags, setTags] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [loadingStarter, setLoadingStarter] = useState(false)

  const reload = () => getAllTags().then(setTags)
  useEffect(() => { reload() }, [])

  const toggleTag = (tag) => {
    const isSelected = selectedTags.some(t => t.id === tag.id)
    if (isSelected) {
      onChange(selectedTags.filter(t => t.id !== tag.id))
    } else {
      onChange([...selectedTags, tag])
    }
  }

  const handleLoadStarter = async () => {
    setLoadingStarter(true)
    for (const tag of STARTER_TAGS) {
      await addTag(tag)
    }
    await reload()
    setLoadingStarter(false)
  }

  return (
    <div className="tag-picker-wrap">
      <div className="tag-picker">
        {tags.map(tag => {
          const isSelected = selectedTags.some(t => t.id === tag.id)
          return (
            <button key={tag.id}
              className={`tag-badge ${isSelected ? 'selected' : ''}`}
              style={{
                background: isSelected ? tag.color : 'transparent',
                border: `1.5px solid ${tag.color}`,
                color: isSelected ? '#fff' : tag.color,
              }}
              onClick={() => toggleTag(tag)}>
              {tag.name}
            </button>
          )
        })}
        <button className="tag-badge tag-badge-add" onClick={() => setShowCreate(true)}>
          + Tag
        </button>
      </div>

      {tags.length === 0 && (
        <div className="tag-starter">
          <p className="tag-starter-hint">Diese Tags sind im Starterpaket enthalten:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '4px 0 12px' }}>
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
          <button className="tag-starter-btn" onClick={handleLoadStarter} disabled={loadingStarter}>
            {loadingStarter ? 'Wird geladen …' : '✨ Starterpaket laden'}
          </button>
          <p className="tag-starter-hint" style={{ marginTop: 10 }}>
            Alternativ kannst du dir über „+ Tag" oder in den Einstellungen eigene Tags anlegen.
          </p>
        </div>
      )}

      {showCreate && (
        <CreateTagSheet
          onSave={async () => { await reload(); setShowCreate(false) }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}

export default TagPicker
