import { useState, useEffect } from 'react'
import { getAllTags } from '../db/recipes'
import './TagPicker.css'

function TagPicker({ selectedTags, onChange }) {
  const [tags, setTags] = useState([])

  useEffect(() => {
    getAllTags().then(setTags)
  }, [])

  const toggleTag = (tag) => {
    const isSelected = selectedTags.some(t => t.id === tag.id)
    if (isSelected) {
      onChange(selectedTags.filter(t => t.id !== tag.id))
    } else {
      onChange([...selectedTags, tag])
    }
  }

  if (tags.length === 0) return (
    <p style={{ fontSize: '0.85rem', color: '#aaa' }}>
      Noch keine Tags vorhanden. Erstelle Tags unter Einstellungen.
    </p>
  )

  return (
    <div className="tag-picker">
      {tags.map(tag => {
        const isSelected = selectedTags.some(t => t.id === tag.id)
        return (
          <button
            key={tag.id}
            className={`tag-badge ${isSelected ? 'selected' : ''}`}
            style={{
              background: isSelected ? tag.color : 'transparent',
              border: `2px solid ${tag.color}`,
              color: isSelected ? 'white' : tag.color,
            }}
            onClick={() => toggleTag(tag)}
          >
            {tag.name}
          </button>
        )
      })}
    </div>
  )
}

export default TagPicker