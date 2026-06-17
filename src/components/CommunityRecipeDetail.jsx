import { coverTint, totalTime } from './DesignTokens'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { toggleLike, hasLiked, getComments, addComment } from '../db/community'
import { addRecipe } from '../db/recipes'

export default function CommunityRecipeDetail({ recipe, onBack, onLocalSave }) {
    if (!recipe) return null

    const { user } = useAuth()
    const [liked, setLiked] = useState(false)
    const [likeCount, setLikeCount] = useState(recipe.likeCount || 0)
    const [likeBusy, setLikeBusy] = useState(false)

    // Beim Öffnen prüfen, ob ich dieses Rezept schon geliked habe
    useEffect(() => {
        if (user) {
            hasLiked(recipe.id, user.uid).then(setLiked).catch(() => { })
        } else {
            setLiked(false)
        }
    }, [user, recipe.id])

    const handleLike = async () => {
        if (!user) {
            alert('Zum Liken bitte einloggen (im Community-Tab oben).')
            return
        }
        if (likeBusy) return // Doppelklick-Schutz
        setLikeBusy(true)
        // Optimistisch sofort umschalten
        const nextLiked = !liked
        setLiked(nextLiked)
        setLikeCount(c => c + (nextLiked ? 1 : -1))
        try {
            await toggleLike(recipe.id, user)
        } catch (err) {
            // Bei Fehler zurückdrehen
            setLiked(!nextLiked)
            setLikeCount(c => c + (nextLiked ? -1 : 1))
            alert('Like fehlgeschlagen: ' + err.message)
        } finally {
            setLikeBusy(false)
        }
    }

    const [comments, setComments] = useState([])
    const [commentText, setCommentText] = useState('')
    const [commentBusy, setCommentBusy] = useState(false)

    // Kommentare beim Öffnen laden
    useEffect(() => {
        getComments(recipe.id).then(setComments).catch(() => { })
    }, [recipe.id])

    const handleAddComment = async () => {
        if (!user) {
            alert('Zum Kommentieren bitte einloggen (im Community-Tab oben).')
            return
        }
        const clean = commentText.trim()
        if (!clean) return
        if (commentBusy) return
        setCommentBusy(true)
        try {
            await addComment(recipe.id, clean, user)
            setCommentText('')
            // Neu laden, damit der frische Kommentar mit Server-Zeit erscheint
            const fresh = await getComments(recipe.id)
            setComments(fresh)
        } catch (err) {
            alert('Kommentar fehlgeschlagen: ' + err.message)
        } finally {
            setCommentBusy(false)
        }
    }

    const [saved, setSaved] = useState(false)
    const [saveBusy, setSaveBusy] = useState(false)

    const handleSave = async () => {
        if (saveBusy || saved) return
        setSaveBusy(true)
        try {
            await addRecipe({
                title: recipe.title || '',
                subtitle: recipe.subtitle || '',
                servings: Number(recipe.servings) || 0,
                prepTime: Number(recipe.prepTime) || 0,
                cookTime: Number(recipe.cookTime) || 0,
                ingredients: recipe.ingredients || [],
                steps: recipe.steps || '',
                tags: recipe.tags || [],
                source: `Aus der Community von ${recipe.authorName || 'Unbekannt'}`,
                image: null,
            })
            setSaved(true)
            if (onLocalSave) onLocalSave()
        } catch (err) {
            alert('Speichern fehlgeschlagen: ' + err.message)
        } finally {
            setSaveBusy(false)
        }
    }

    // Zeitstempel hübsch formatieren (Firestore Timestamp → lesbar)
    const formatTime = (ts) => {
        if (!ts?.toDate) return ''
        return ts.toDate().toLocaleDateString('de-DE', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        })
    }

    const t = coverTint(recipe)
    const initial = (recipe.title || '?').trim().charAt(0).toUpperCase()
    const time = totalTime(recipe)
    const ingredients = recipe.ingredients || []
    const tags = recipe.tags || []

    // steps kommt als HTML-String (wie in RecipeDetail) — in Schritte zerlegen
    const getSteps = () => {
        if (!recipe.steps) return []
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = recipe.steps
        const items = tempDiv.querySelectorAll('li, p')
        const result = []
        items.forEach(el => {
            const text = el.textContent.trim()
            if (text) result.push(text)
        })
        return result.length > 0 ? result : [recipe.steps.replace(/<[^>]*>/g, ' ').trim()].filter(Boolean)
    }
    const steps = getSteps()

    return (
        <div style={{ paddingBottom: 40 }}>
            {/* Kopf mit Tint-Hintergrund */}
            <div style={{
                background: t.bg, borderRadius: '0 0 24px 24px',
                padding: '60px 22px 28px', position: 'relative',
            }}>
                <button onClick={onBack} style={{
                    background: 'var(--card)', border: '1px solid var(--line-2)',
                    borderRadius: '50%', width: 38, height: 38, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M9 2L4 7l5 5" stroke="var(--espresso)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <h1 style={{ fontFamily: 'var(--serif)', fontSize: 28, color: t.ink, lineHeight: 1.15, margin: 0 }}>
                    {recipe.title}
                </h1>
                {recipe.subtitle && (
                    <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: t.ink, opacity: 0.8, marginTop: 6 }}>
                        {recipe.subtitle}
                    </div>
                )}
                <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: t.ink, opacity: 0.7, marginTop: 12 }}>
                    von {recipe.authorName || 'Unbekannt'}
                    {time > 0 ? ` · ${time} Min.` : ''}
                    {recipe.servings > 0 ? ` · ${recipe.servings} Portionen` : ''}
                </div>
                <button onClick={handleLike} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: liked ? 'var(--rose)' : 'var(--card)',
                    border: `1px solid ${liked ? 'var(--rose-2)' : 'var(--line-2)'}`,
                    borderRadius: 22, padding: '8px 16px', cursor: 'pointer',
                    marginTop: 16, fontFamily: 'var(--serif)',
                }}>
                    <span style={{ fontSize: 17, color: liked ? 'var(--rose-ink)' : 'var(--mute)' }}>
                        {liked ? '♥' : '♡'}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: liked ? 'var(--rose-ink)' : 'var(--espresso)' }}>
                        {likeCount}
                    </span>
                </button>
                <button onClick={handleSave} disabled={saved || saveBusy} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: saved ? 'var(--sage)' : 'var(--card)',
                    border: `1px solid ${saved ? 'var(--sage-2)' : 'var(--line-2)'}`,
                    borderRadius: 22, padding: '8px 16px',
                    cursor: (saved || saveBusy) ? 'default' : 'pointer',
                    marginTop: 16, marginLeft: 10, fontFamily: 'var(--serif)',
                    opacity: saveBusy ? 0.6 : 1,
                }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--espresso)' }}>
                        {saved ? '✓ Gespeichert' : saveBusy ? 'Speichert…' : '+ Speichern'}
                    </span>
                </button>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '16px 22px 0' }}>
                    {tags.map((tag, i) => (
                        <span key={i} style={{
                            background: tag.color ? `${tag.color}33` : 'var(--sage)',
                            color: tag.color || 'var(--espresso)',
                            borderRadius: 20, padding: '5px 13px', fontSize: 13,
                            fontFamily: 'var(--serif)', fontWeight: 600,
                        }}>
                            {tag.name || tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Zutaten */}
            {ingredients.length > 0 && (
                <div style={{ padding: '24px 22px 0' }}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 700, color: 'var(--espresso)', marginBottom: 12 }}>
                        Zutaten
                    </div>
                    {ingredients.map((ing, i) => (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between',
                            padding: '8px 0', borderBottom: '1px solid var(--line-2)',
                            fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--espresso)',
                        }}>
                            <span>{ing.name}</span>
                            <span style={{ color: 'var(--mute)' }}>
                                {ing.amount}{ing.unit ? ` ${ing.unit}` : ''}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Zubereitung */}
            {steps.length > 0 && (
                <div style={{ padding: '24px 22px 0' }}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 700, color: 'var(--espresso)', marginBottom: 12 }}>
                        Zubereitung
                    </div>
                    {steps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                            <span style={{ fontFamily: 'var(--serif)', fontWeight: 700, color: 'var(--green)', fontSize: 17, flexShrink: 0, minWidth: 22 }}>
                                {i + 1}
                            </span>
                            <span style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--espresso)', lineHeight: 1.5 }}>
                                {step}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {/* Kommentare */}
            <div style={{ padding: '32px 22px 0' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 700, color: 'var(--espresso)', marginBottom: 12 }}>
                    Kommentare {comments.length > 0 ? `(${comments.length})` : ''}
                </div>

                {/* Eingabefeld */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <input
                        type="text"
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddComment() }}
                        placeholder={user ? 'Kommentar schreiben…' : 'Zum Kommentieren einloggen'}
                        disabled={!user}
                        style={{
                            flex: 1, border: '1px solid var(--line-2)', borderRadius: 12,
                            padding: '10px 14px', fontFamily: 'var(--serif)', fontSize: 14,
                            color: 'var(--espresso)', background: 'var(--card)', outline: 'none',
                        }}
                    />
                    <button
                        onClick={handleAddComment}
                        disabled={!user || commentBusy}
                        style={{
                            background: 'var(--green)', color: 'var(--paper)', border: 'none',
                            borderRadius: 12, padding: '0 18px', fontFamily: 'var(--serif)',
                            fontSize: 14, fontWeight: 700,
                            cursor: (!user || commentBusy) ? 'default' : 'pointer',
                            opacity: (!user || commentBusy) ? 0.5 : 1,
                        }}>
                        Senden
                    </button>
                </div>

                {/* Liste */}
                {comments.length === 0 ? (
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--mute)', fontStyle: 'italic' }}>
                        Noch keine Kommentare.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {comments.map(c => (
                            <div key={c.id} style={{
                                background: 'var(--card)', border: '1px solid var(--line-2)',
                                borderRadius: 12, padding: '12px 14px',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                                    <span style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 14, color: 'var(--espresso)' }}>
                                        {c.authorName || 'Unbekannt'}
                                    </span>
                                    <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--mute)' }}>
                                        {formatTime(c.createdAt)}
                                    </span>
                                </div>
                                <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--espresso)', lineHeight: 1.4 }}>
                                    {c.text}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}