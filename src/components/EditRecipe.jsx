import { useState } from 'react'
import IngredientsInput from './IngredientsInput'
import RichTextEditor from './RichTextEditor'
import TagPicker from './TagPicker'
import { updateRecipe, deleteRecipe } from '../db/recipes'
import { Icon } from './DesignTokens'
import ImageCropper from './ImageCropper'
import './AddRecipe.css'

function EditRecipe({ recipe, onSave, onClose, onDelete }) {
    const [form, setForm] = useState({
        title: recipe.title || '',
        subtitle: recipe.subtitle || '',
        servings: recipe.servings || '',
        prepTime: recipe.prepTime || '',
        cookTime: recipe.cookTime || '',
        ingredients: recipe.ingredients || [],
        steps: recipe.steps || '',
        tags: recipe.tags || [],
        image: recipe.image || null,
        source: recipe.source || '', // NEU
    })
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showCropper, setShowCropper] = useState(false)

    const handleSave = async () => {
        if (!form.title.trim()) {
            alert('Bitte gib einen Titel ein.')
            return
        }
        await updateRecipe({
            ...recipe,
            ...form,
            servings: Number(form.servings),
            prepTime: Number(form.prepTime),
            cookTime: Number(form.cookTime),
        })
        onSave()
    }

    const handleDelete = async () => {
        await deleteRecipe(recipe.id)
        onDelete()
    }

    return (
        <div className="add-recipe">
            <div className="add-recipe-header">
                <button className="add-close-btn" onClick={onClose}>
                    <Icon name="x" size={16} color="var(--cocoa)" />
                </button>
            </div>

            <div className="add-recipe-title">
                <h1 className="display" style={{ fontSize: 34, color: 'var(--espresso)', lineHeight: 1.0 }}>
                    Rezept <span style={{ fontStyle: 'italic', fontWeight: 600 }}>bearbeiten</span>
                </h1>
            </div>

            <div className="manual-form">

                <div className="form-section">
                    <label className="form-label">Titel</label>
                    <textarea className="form-input" rows={2} placeholder="z.B. Spaghetti Carbonara"
                        style={{ resize: 'vertical', minHeight: 46, lineHeight: 1.35 }}
                        value={form.title} onChange={e => setForm({ ...form, title: e.target.value.replace(/\n/g, '') })} />
                </div>

                <div className="form-section">
                    <label className="form-label">Untertitel <span className="form-label-opt">optional</span></label>
                    <textarea className="form-input" rows={2} placeholder="z.B. nach Tante Erika"
                        style={{ resize: 'vertical', minHeight: 46, lineHeight: 1.35 }}
                        value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value.replace(/\n/g, '') })} />
                </div>

                <div className="form-section">
                    <label className="form-label">Foto <span className="form-label-opt">optional</span></label>
                    <input className="form-input-file" type="file" accept="image/*"
                        onChange={e => {
                            const file = e.target.files[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onloadend = () => setForm({ ...form, image: reader.result })
                            reader.readAsDataURL(file)
                        }} />
                    {form.image && (
                        <img src={form.image} alt="Vorschau" style={{ marginTop: 10, borderRadius: 12, width: '100%', maxHeight: 200, objectFit: 'cover' }} />
                    )}
                    {form.image && (
                        <button onClick={() => setShowCropper(true)} style={{
                            marginTop: 10, background: 'none', border: '1.5px solid var(--green)', color: 'var(--green)',
                            borderRadius: 12, padding: '9px 18px', fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        }}>
                            Bildausschnitt anpassen
                        </button>
                    )}
                    {showCropper && form.image && (
                        <ImageCropper src={form.image}
                            onDone={(img) => { setForm({ ...form, image: img }); setShowCropper(false) }}
                            onClose={() => setShowCropper(false)} />
                    )}
                </div>

                <div className="form-row-3">
                    <div className="form-section">
                        <label className="form-label">Portionen</label>
                        <input className="form-input" type="number" placeholder="4"
                            value={form.servings} onChange={e => setForm({ ...form, servings: e.target.value })} />
                    </div>
                    <div className="form-section">
                        <label className="form-label">Vorbereitung</label>
                        <input className="form-input" type="number" placeholder="10 Min."
                            value={form.prepTime} onChange={e => setForm({ ...form, prepTime: e.target.value })} />
                    </div>
                    <div className="form-section">
                        <label className="form-label">Kochen</label>
                        <input className="form-input" type="number" placeholder="30 Min."
                            value={form.cookTime} onChange={e => setForm({ ...form, cookTime: e.target.value })} />
                    </div>
                </div>

                <div className="form-section">
                    <label className="form-label">Tags</label>
                    <TagPicker selectedTags={form.tags} onChange={tags => setForm({ ...form, tags })} />
                </div>

                <div className="form-section">
                    <label className="form-label">Zutaten</label>
                    <IngredientsInput ingredients={form.ingredients}
                        onChange={ingredients => setForm({ ...form, ingredients })} />
                </div>

                <div className="form-section">
                    <label className="form-label">Zubereitung</label>
                    <RichTextEditor content={form.steps} onChange={steps => setForm({ ...form, steps })} />
                </div>
                <div className="form-section">
                    <label className="form-label">Quelle <span className="form-label-opt">optional</span></label>
                    <input className="form-input" type="text" placeholder="z.B. essen.de oder Oma"
                        value={form.source || ''} onChange={e => setForm({ ...form, source: e.target.value })} />
                </div>

                <button className="form-save-btn" onClick={handleSave}>
                    Änderungen speichern
                </button>

                <button className="form-delete-btn" onClick={() => setShowDeleteConfirm(true)}>
                    Rezept löschen
                </button>

                <div style={{ height: 32 }} />
            </div>

            {/* Bestätigungsdialog */}
            {showDeleteConfirm && (
                <div className="delete-overlay">
                    <div className="delete-dialog">
                        <div className="delete-dialog-title">Rezept löschen</div>
                        <div className="delete-dialog-text">
                            Bist du sicher, dass du <em>„{recipe.title}"</em> unwiderruflich löschen möchtest?
                        </div>
                        <div className="delete-dialog-actions">
                            <button className="delete-dialog-cancel" onClick={() => setShowDeleteConfirm(false)}>
                                Abbrechen
                            </button>
                            <button className="delete-dialog-confirm" onClick={handleDelete}>
                                Ja, löschen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default EditRecipe
