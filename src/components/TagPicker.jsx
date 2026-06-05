import { useState, useEffect } from 'react'
import { getAllTags, addTag } from '../db/recipes'
import './TagPicker.css'

const COLORS = [
  '#FFCDD2', '#EF9A9A', '#E57373', '#F44336', '#D32F2F',
  '#F8BBD9', '#F06292', '#C2185B',
  '#FFE0B2', '#FFCC80', '#FFA726', '#E65100',
  '#FFF9C4', '#FFF176', '#FFEE58', '#F9A825',
  '#DCEDC8', '#AED581', '#66BB6A', '#2E7D32',
  '#C8D9BF', '#4C6A3E', '#B2EBF2', '#26C6DA',
  '#BBDEFB', '#64B5F6', '#1976D2', '#0D47A1',
  '#E1BEE7', '#CE93D8', '#9C27B0', '#4A148C',
  '#EDD4CF', '#D7A89A', '#A1665A', '#6D4C41',
  '#F5F5F5', '#BDBDBD', '#757575', '#212121'
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

function TagPicker({ selectedTags, onChange }) {
  const [tags, setTags] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[10])
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

  const handleCreate = async () => {
    if (!newName.trim()) return
    await addTag({ name: newName.trim(), color: newColor })
    await reload()
    setNewName('')
    setNewColor(COLORS[10])
    setShowCreate(false)
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

      {/* Tag-Chips */}
      <div className="tag-picker">
        {tags.map(tag => {
          const isSelected = selectedTags.some(t => t.id === tag.id)
          return (
            <button
              key={tag.id}
              className={`tag-badge ${isSelected ? 'selected' : ''}`}
              style={{
                background: isSelected ? tag.color : 'transparent',
                border: `1.5px solid ${tag.color}`,
                color: isSelected ? '#fff' : tag.color,
              }}
              onClick={() => toggleTag(tag)}
            >
              {tag.name}
            </button>
          )
        })}

        {/* + Neuer Tag Button */}
        <button
          className="tag-badge tag-badge-add"
          onClick={() => setShowCreate(v => !v)}
        >
          + Tag
        </button>
      </div>

      {/* Starterpaket — nur wenn noch keine Tags */}
      {tags.length === 0 && !showCreate && (
        <div className="tag-starter">
          <p className="tag-starter-hint">
            Noch keine Tags vorhanden.
          </p>
          <button
            className="tag-starter-btn"
            onClick={handleLoadStarter}
            disabled={loadingStarter}
          >
            {loadingStarter ? 'Wird geladen …' : '✨ Starterpaket laden'}
          </button>
        </div>
      )}

      {/* Neuen Tag erstellen — Popup */}
      {showCreate && (
        <div className="tag-create-popup">
          <input
            className="tag-create-input"
            type="text"
            placeholder="Tag-Name …"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />

          {/* Farbpalette */}
          <div className="tag-color-grid">
            {COLORS.map(color => (
              <button
                key={color}
                className={`tag-color-dot ${newColor === color ? 'active' : ''}`}
                style={{ background: color }}
                onClick={() => setNewColor(color)}
              />
            ))}
          </div>

          {/* Vorschau + Buttons */}
          <div className="tag-create-actions">
            <span
              className="tag-badge selected"
              style={{ background: newColor, border: `1.5px solid ${newColor}`, color: '#fff' }}
            >
              {newName || 'Vorschau'}
            </span>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <button className="tag-create-cancel" onClick={() => setShowCreate(false)}>
                Abbrechen
              </button>
              <button
                className="tag-create-save"
                onClick={handleCreate}
                disabled={!newName.trim()}
                style={{ opacity: newName.trim() ? 1 : 0.4 }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TagPicker
