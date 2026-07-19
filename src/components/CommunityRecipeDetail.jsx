import { coverTint, totalTime, Icon } from './DesignTokens'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { toggleLike, hasLiked, listenComments, listenRecipe, addComment, deleteComment, deleteRecipe } from '../db/community'
import { addRecipe } from '../db/recipes'
import JoinCommunity from './JoinCommunity'

export default function CommunityRecipeDetail({ recipe, onBack, onDeleted, onLocalSave }) {
    // Rules of Hooks: keine Rückgabe vor den Hooks. recipe wird vom Parent
    // (App.jsx / Community.jsx) garantiert non-null übergeben.
    const { user } = useAuth()
    const [liked, setLiked] = useState(false)
    const [likeCount, setLikeCount] = useState(recipe?.likeCount || 0)
    const [likeBusy, setLikeBusy] = useState(false)
    const [showJoin, setShowJoin] = useState(false)

    // Beim Öffnen prüfen, ob ich dieses Rezept schon geliked habe
    useEffect(() => {
        if (user) {
            hasLiked(recipe.id, user.uid).then(setLiked).catch(() => { })
        } else {
            setLiked(false)
        }
    }, [user, recipe.id])

    // Like-Zähler live aus dem Rezept-Dokument (auch Likes anderer erscheinen sofort)
    useEffect(() => {
        const unsub = listenRecipe(recipe.id, (r) => setLikeCount(r.likeCount || 0))
        return unsub
    }, [recipe.id])

    const handleLike = async () => {
        if (!user) { setShowJoin(true); return }
        if (likeBusy) return // Doppelklick-Schutz
        setLikeBusy(true)
        // Herz optimistisch umschalten; den Zähler liefert der Live-Listener
        const nextLiked = !liked
        setLiked(nextLiked)
        try {
            await toggleLike(recipe.id, user)
        } catch (err) {
            setLiked(!nextLiked) // bei Fehler zurückdrehen
            alert('Like fehlgeschlagen: ' + err.message)
        } finally {
            setLikeBusy(false)
        }
    }

    const [comments, setComments] = useState([])
    const [commentText, setCommentText] = useState('')
    const [commentBusy, setCommentBusy] = useState(false)

    // Kommentare live abonnieren (eigene und fremde erscheinen sofort)
    useEffect(() => {
        const unsub = listenComments(recipe.id, setComments)
        return unsub
    }, [recipe.id])

    const handleAddComment = async () => {
        if (!user) { setShowJoin(true); return }
        const clean = commentText.trim()
        if (!clean) return
        if (commentBusy) return
        setCommentBusy(true)
        try {
            await addComment(recipe.id, clean, user)
            setCommentText('')
            // Liste aktualisiert sich automatisch über den Live-Listener
        } catch (err) {
            alert('Kommentar fehlgeschlagen: ' + err.message)
        } finally {
            setCommentBusy(false)
        }
    }

    const [saved, setSaved] = useState(false)
    const [saveBusy, setSaveBusy] = useState(false)
    const [showRecipe, setShowRecipe] = useState(false)

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
                image: recipe.image || null,
            })
            setSaved(true)
            if (onLocalSave) onLocalSave()
        } catch (err) {
            alert('Speichern fehlgeschlagen: ' + err.message)
        } finally {
            setSaveBusy(false)
        }
    }

    // Zurück zum Feed – aktuelle Zahlen mitgeben, damit der Feed stimmt
    const handleBack = () => {
        onBack({ likeCount, commentCount: comments.length })
    }

    // Eigenen Kommentar löschen
    const handleDeleteComment = async (commentId) => {
        if (!confirm('Diesen Kommentar löschen?')) return
        try {
            await deleteComment(recipe.id, commentId, user)
            setComments(cs => cs.filter(c => c.id !== commentId))
        } catch (err) {
            alert('Löschen fehlgeschlagen: ' + err.message)
        }
    }

    // Eigenes Rezept aus der Community löschen
    const [deleteBusy, setDeleteBusy] = useState(false)
    const handleDeleteRecipe = async () => {
        if (deleteBusy) return
        if (!confirm(recipe.type === 'announcement'
            ? 'Diesen Beitrag dauerhaft löschen?'
            : 'Dieses Rezept dauerhaft aus der Community löschen?')) return
        setDeleteBusy(true)
        try {
            await deleteRecipe(recipe.id, user)
            if (onDeleted) onDeleted()
        } catch (err) {
            alert('Löschen fehlgeschlagen: ' + err.message)
            setDeleteBusy(false)
        }
    }

    const isOwner = user && recipe.authorId === user.uid
    // Rezeptor-News: Beitrag ohne Rezept — keine Rezeptkarte, kein Overlay
    const isNews = recipe.type === 'announcement'

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
            // <p> innerhalb eines <li> überspringen — sonst zählt der Schritt doppelt
            if (el.tagName === 'P' && el.closest('li')) return
            // Führende Nummerierung entfernen — die Liste nummeriert selbst
            const text = el.textContent.trim().replace(/^(?:Schritt\s+)?\d{1,2}\s*[.):]\s+/i, '')
            if (text) result.push(text)
        })
        return result.length > 0 ? result : [recipe.steps.replace(/<[^>]*>/g, ' ').trim()].filter(Boolean)
    }
    const steps = getSteps()

    return (
        <div style={{ padding: '54px 22px 40px' }}>
            {/* Zurück */}
            <button onClick={handleBack} style={{
                background: 'var(--card)', border: '1px solid var(--line-2)',
                borderRadius: '50%', width: 38, height: 38, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M9 2L4 7l5 5" stroke="var(--espresso)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* Große Beitragskarte */}
            <div style={{
                background: '#E3EDD9', border: '1px solid var(--sage)',
                borderRadius: 24, padding: 18,
            }}>
                {/* 1. Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: '50%', background: 'var(--green)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 19, color: 'var(--paper)',
                    }}>
                        {(recipe.authorName || '?').trim().charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 15, color: 'var(--espresso)' }}>
                            {recipe.authorName || 'Unbekannt'}
                        </div>
                        {formatTime(recipe.createdAt) && (
                            <div style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--cocoa)', opacity: 0.85 }}>
                                {formatTime(recipe.createdAt)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Rezeptor-News: Megafon-Zeile + Überschrift + Text statt Rezeptkarte */}
                {isNews && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 16 }}>
                            <Icon name="megaphone" size={15} color="var(--green)" strokeWidth={1.9} />
                            <span style={{ fontFamily: 'var(--serif)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--green)' }}>
                                Rezeptor-News
                            </span>
                        </div>
                        <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 19, color: 'var(--espresso)', marginTop: 9, lineHeight: 1.25 }}>
                            {recipe.title}
                        </div>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 15.5, color: 'var(--espresso)', lineHeight: 1.55, whiteSpace: 'pre-wrap', marginTop: 8 }}>
                            {recipe.caption}
                        </div>
                    </>
                )}

                {/* 2. Rezeptkarte → öffnet das Overlay */}
                {!isNews && (recipe.image ? (
                    <button onClick={() => setShowRecipe(true)} style={{
                        width: '100%', display: 'block', padding: 0, overflow: 'hidden',
                        background: 'var(--card)', border: '1px solid var(--sage-2)',
                        borderRadius: 16, cursor: 'pointer', marginTop: 14,
                    }}>
                        <img src={recipe.image} alt={recipe.title}
                            style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 16, color: 'var(--espresso)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {recipe.title}
                                </div>
                                <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--mute)', marginTop: 2 }}>
                                    {ingredients.length} Zutaten{time > 0 ? ` · ${time} Min.` : ''}
                                </div>
                            </div>
                            <span style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, color: 'var(--green)', flexShrink: 0 }}>
                                Ansehen →
                            </span>
                        </div>
                    </button>
                ) : (
                    <button onClick={() => setShowRecipe(true)} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 11,
                        background: 'var(--card)', border: '1px solid var(--sage-2)',
                        borderRadius: 16, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', marginTop: 14,
                    }}>
                        <div style={{
                            width: 42, height: 42, borderRadius: 11, background: t.bg, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 18, color: t.ink,
                        }}>
                            {initial}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 16, color: 'var(--espresso)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {recipe.title}
                            </div>
                            <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--mute)', marginTop: 2 }}>
                                {ingredients.length} Zutaten{time > 0 ? ` · ${time} Min.` : ''}
                            </div>
                        </div>
                        <span style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, color: 'var(--green)', flexShrink: 0 }}>
                            Ansehen →
                        </span>
                    </button>
                ))}

                {/* 3. Caption */}
                {!isNews && (recipe.caption ? (
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--espresso)', lineHeight: 1.5, marginTop: 14, whiteSpace: 'pre-wrap' }}>
                        {recipe.caption}
                    </div>
                ) : (
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--cocoa)', opacity: 0.85, marginTop: 14, fontStyle: 'italic' }}>
                        hat ein Rezept geteilt.
                    </div>
                ))}

                {/* 4. Likes-Pille */}
                <div style={{ marginTop: 14 }}>
                    <button onClick={handleLike} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: liked ? 'var(--rose)' : 'var(--card)',
                        border: `1px solid ${liked ? 'var(--rose-2)' : 'var(--line-2)'}`,
                        borderRadius: 22, padding: '8px 16px', cursor: 'pointer',
                        fontFamily: 'var(--serif)',
                    }}>
                        <span style={{ fontSize: 17, color: liked ? 'var(--rose-ink)' : 'var(--mute)' }}>
                            {liked ? '♥' : '♡'}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: liked ? 'var(--rose-ink)' : 'var(--espresso)' }}>
                            {likeCount}
                        </span>
                    </button>
                </div>
            </div>

            {/* Kommentare */}
            <div style={{ padding: '28px 0 0' }}>
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
                                {user && c.authorId === user.uid && (
                                    <button onClick={() => handleDeleteComment(c.id)} style={{
                                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                        marginTop: 8, fontFamily: 'var(--serif)', fontSize: 12,
                                        color: 'var(--mute)', textDecoration: 'underline',
                                    }}>
                                        Löschen
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Eigenes Rezept löschen */}
            {isOwner && (
                <div style={{ padding: '28px 0 0' }}>
                    <button onClick={handleDeleteRecipe} disabled={deleteBusy} style={{
                        width: '100%', background: 'var(--card)', border: '1px solid var(--rose-2)',
                        borderRadius: 14, padding: '13px 16px',
                        cursor: deleteBusy ? 'default' : 'pointer',
                        fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700,
                        color: 'var(--rose-ink)', opacity: deleteBusy ? 0.6 : 1,
                    }}>
                        {deleteBusy ? 'Wird gelöscht…' : isNews ? 'Beitrag löschen' : 'Rezept aus der Community löschen'}
                    </button>
                </div>
            )}

            {/* Rezept-Overlay (per Portal an document.body, sonst iOS-fixed-Bug) */}
            {showRecipe && createPortal((
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                    zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                }} onClick={() => setShowRecipe(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'var(--paper)', borderRadius: '20px 20px 0 0',
                        width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto',
                    }}>
                        {/* Foto-Hero */}
                        {recipe.image && (
                            <img src={recipe.image} alt={recipe.title}
                                style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block', borderRadius: '20px 20px 0 0' }} />
                        )}

                        {/* Sticky Kopf mit X */}
                        <div style={{
                            position: 'sticky', top: 0, zIndex: 1, background: t.bg,
                            padding: '20px 22px', borderRadius: recipe.image ? 0 : '20px 20px 0 0',
                        }}>
                            <button onClick={() => setShowRecipe(false)} aria-label="Schließen" style={{
                                position: 'absolute', top: 14, right: 14, width: 34, height: 34,
                                borderRadius: '50%', background: 'var(--card)', border: '1px solid var(--line-2)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 15, color: 'var(--espresso)', lineHeight: 1,
                            }}>
                                ✕
                            </button>
                            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24, color: t.ink, margin: 0, paddingRight: 44, lineHeight: 1.15 }}>
                                {recipe.title}
                            </h2>
                            {recipe.subtitle && (
                                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: t.ink, opacity: 0.8, marginTop: 6 }}>
                                    {recipe.subtitle}
                                </div>
                            )}
                            {(time > 0 || recipe.servings > 0) && (
                                <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: t.ink, opacity: 0.7, marginTop: 8 }}>
                                    {time > 0 ? `${time} Min.` : ''}
                                    {time > 0 && recipe.servings > 0 ? ' · ' : ''}
                                    {recipe.servings > 0 ? `${recipe.servings} Portionen` : ''}
                                </div>
                            )}
                        </div>

                        {/* Tags */}
                        {tags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '18px 22px 0' }}>
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

                        {/* Speichern */}
                        <div style={{ padding: '28px 22px 32px' }}>
                            <button onClick={handleSave} disabled={saved || saveBusy} style={{
                                width: '100%', background: saved ? 'var(--sage)' : 'var(--green)',
                                border: 'none', borderRadius: 14, padding: '14px 16px',
                                cursor: (saved || saveBusy) ? 'default' : 'pointer',
                                fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 700,
                                color: saved ? 'var(--espresso)' : 'var(--paper)',
                                opacity: saveBusy ? 0.6 : 1,
                            }}>
                                {saved ? '✓ In deinen Rezepten gespeichert' : saveBusy ? 'Speichert…' : '+ In meinen Rezepten speichern'}
                            </button>
                        </div>
                    </div>
                </div>
            ), document.body)}

            {showJoin && createPortal((
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowJoin(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--paper)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 640, padding: '20px 22px 40px' }}>
                        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line-2)', margin: '0 auto 18px' }} />
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, color: 'var(--espresso)', marginBottom: 4 }}>
                            Zum Mitmachen <span style={{ fontStyle: 'italic' }}>beitreten</span>
                        </div>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--mute)', fontStyle: 'italic', marginBottom: 14 }}>
                            Für Likes und Kommentare brauchst du ein Konto (Name reicht).
                        </div>
                        <JoinCommunity onDone={() => setShowJoin(false)} />
                    </div>
                </div>
            ), document.body)}
        </div>
    )
}