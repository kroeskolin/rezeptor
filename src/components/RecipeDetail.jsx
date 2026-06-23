import { useState } from 'react';
import { createPortal } from 'react-dom';
import './RecipeDetail.css';
import { Icon, coverTint, totalTime } from './DesignTokens';
import { publishRecipe, createSharedRecipe } from '../db/community'
import { useAuth } from '../contexts/AuthContext'
import JoinCommunity from './JoinCommunity'

function HeartBtn({ recipe, onToggle, glass = false }) {
  const isFav = !!recipe.favorite;
  if (glass) {
    return (
      <button className="detail-ctrl-btn-glass"
        onClick={e => { e.stopPropagation(); onToggle(recipe); }}
        aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}>
        <Icon name="heart" size={16} color={isFav ? '#ffb3b3' : '#fff'}
          fill={isFav} strokeWidth={isFav ? 0 : 1.8} />
      </button>
    );
  }
  return (
    <button className="detail-ctrl-btn-white"
      onClick={e => { e.stopPropagation(); onToggle(recipe); }}
      aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
      style={{ background: isFav ? 'var(--rose)' : 'var(--card)', borderColor: isFav ? 'var(--rose-2)' : 'var(--line-2)' }}>
      <Icon name="heart" size={16} color={isFav ? 'var(--rose-ink)' : 'var(--mute)'}
        fill={isFav} strokeWidth={isFav ? 0 : 1.8} />
    </button>
  );
}

function PhotoFullscreen({ src, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
      zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 20, right: 20,
        width: 38, height: 38, borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }}>
        <Icon name="x" size={18} color="#fff" strokeWidth={2} />
      </button>
      <img src={src} alt="Foto"
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        onClick={e => e.stopPropagation()} />
    </div>
  );
}

export default function RecipeDetail({ recipe, onBack, onEdit, onStartCook, onToggleFavorite }) {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showCaptionOverlay, setShowCaptionOverlay] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [publishBusy, setPublishBusy] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const { user, signInWithGoogle } = useAuth();

  if (!recipe) return null;

  const [servings, setServings] = useState(recipe.servings || 1);
  const t = coverTint(recipe);
  const initial = (recipe.title || '?').trim().charAt(0).toUpperCase();
  const time = totalTime(recipe);
  const hasPhoto = !!recipe.image;
  const ingredients = recipe.ingredients || [];
  const tags = recipe.tags || [];
  const category = recipe.category;

  const getSteps = () => {
    if (!recipe.steps) return [];
    const html = recipe.steps;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const items = tempDiv.querySelectorAll('li, p');
    const result = [];
    items.forEach(el => {
      const text = el.textContent.trim();
      if (text) result.push(text);
    });
    return result.length > 0 ? result : [html.replace(/<[^>]*>/g, ' ').trim()].filter(Boolean);
  };

  const steps = getSteps();

  const scaleAmount = (amount) => {
    if (!amount || !recipe.servings) return amount;
    const base = parseFloat(amount);
    if (isNaN(base)) return amount;
    const scaled = base * servings / recipe.servings;
    return scaled % 1 === 0 ? String(scaled) : scaled.toFixed(1).replace(/\.0$/, '');
  };

  const handleShareText = async () => {
    const ingredientLines = ingredients
      .map(ing => `• ${ing.name}${ing.amount ? `: ${ing.amount}${ing.unit ? ' ' + ing.unit : ''}` : ''}`)
      .join('\n')

    const stepLines = steps.map((s, i) => `${i + 1}. ${s}`).join('\n\n')

    const text = [
      `Sieh dir dieses Rezept aus meiner Rezeptor-App an: ${recipe.title}. Viel Spaß beim Ausprobieren! 🍳`,
      '',
      recipe.subtitle ? `(${recipe.subtitle})` : null,
      '',
      time > 0 ? `⏱ ${time} Min.` : null,
      recipe.servings > 0 ? `🍽 ${recipe.servings} Portionen` : null,
      '',
      '── Zutaten ──',
      ingredientLines,
      '',
      '── Zubereitung ──',
      stepLines,
      '',
      recipe.source ? `Quelle: ${recipe.source}` : null,
    ].filter(Boolean).join('\n')

    await navigator.share({ title: recipe.title, text })
    setShowShareSheet(false)
  }

  const handleSharePdf = async () => {
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')

    const escape = (str) => String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    const ingredientRows = ingredients.map(ing =>
      `<tr><td>${escape(ing.name)}</td><td style="text-align:right;color:#9A8C7E;padding-left:16px;white-space:nowrap">${escape(ing.amount)}${ing.unit ? ' ' + escape(ing.unit) : ''}</td></tr>`
    ).join('')

    const stepRows = steps.map((step, i) =>
      `<div style="display:flex;gap:16px;margin-bottom:12px"><span style="font-weight:700;color:#C8D9BF;font-size:18px;flex-shrink:0;min-width:24px">${i + 1}</span><span>${escape(step)}</span></div>`
    ).join('')

    // Container off-screen rendern
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.top = '-99999px'
    container.style.left = '0'
    container.style.width = '700px'
    container.style.background = '#fff'
    container.innerHTML = `
      <div style="font-family: Georgia, serif; padding: 40px; color: #473528; box-sizing: border-box; width: 700px;">
        ${recipe.image ? `<img src="${recipe.image}" style="width:100%;max-height:320px;object-fit:cover;border-radius:12px;margin-bottom:24px;display:block" />` : ''}
        <h1 style="font-size:32px;margin-bottom:4px">${escape(recipe.title)}</h1>
        ${recipe.subtitle ? `<div style="font-style:italic;color:#6A5546;margin-bottom:16px">${escape(recipe.subtitle)}</div>` : ''}
        <div style="color:#9A8C7E;font-size:14px;margin-bottom:24px">${[time > 0 ? `${time} Min.` : null, recipe.servings > 0 ? `${recipe.servings} Portionen` : null].filter(Boolean).join(' · ')}</div>
        <h2 style="font-size:18px;border-bottom:1px solid #E9EBE3;padding-bottom:6px;margin-top:28px">Zutaten</h2>
        <table style="width:100%;border-collapse:collapse">${ingredientRows.replace(/<td/g, '<td style="padding:7px 0;border-bottom:1px solid #E9EBE3;font-size:15px;vertical-align:top"')}</table>
        <h2 style="font-size:18px;border-bottom:1px solid #E9EBE3;padding-bottom:6px;margin-top:28px">Zubereitung</h2>
        ${stepRows}
        ${recipe.source ? `<div style="margin-top:32px;font-size:13px;color:#9A8C7E;font-style:italic">Quelle: ${escape(recipe.source)}</div>` : ''}
        <div style="margin-top:40px;font-size:12px;color:#C8D9BF;text-align:center">Erstellt mit Rezeptor</div>
      </div>
    `
    document.body.appendChild(container)

    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/jpeg', 0.92)

      const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] })
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height)

      const blob = pdf.output('blob')
      const file = new File([blob], `${recipe.title}.pdf`, { type: 'application/pdf' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: recipe.title })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${recipe.title}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      document.body.removeChild(container)
      setShowShareSheet(false)
    }
  }

  const handleShareLink = async () => {
    if (!user) {
      // Kurzlink erfordert Login → Beitreten-Sheet zeigen
      setShowShareSheet(false)
      setShowJoin(true)
      return
    }
    if (shareBusy) return
    setShareBusy(true)
    let link
    try {
      const id = await createSharedRecipe(recipe, user)
      link = `https://kroeskolin.github.io/rezeptor/#s=${id}`
    } catch (err) {
      alert('Teilen fehlgeschlagen: ' + err.message)
      setShareBusy(false)
      return
    }
    const text = `Ich teile mein Rezept "${recipe.title}" mit dir aus Rezeptor! 🍳\nTipp einfach auf den Link:\n${link}`
    // navigator.share kann nach dem await die Nutzergeste „verlieren“ → robust mit Fallback
    try {
      if (navigator.share) {
        await navigator.share({ title: recipe.title, text })
      } else {
        throw new Error('share-not-supported')
      }
    } catch (e) {
      try {
        await navigator.clipboard.writeText(link)
        alert('Link in Zwischenablage kopiert:\n' + link)
      } catch {
        prompt('Link zum Kopieren:', link)
      }
    }
    setShareBusy(false)
    setShowShareSheet(false)
  }

  const handlePublish = async () => {
    if (!user) {
      try {
        await signInWithGoogle();
      } catch (err) {
        alert('Login nötig zum Veröffentlichen: ' + err.message);
        return;
      }
    }
    // Statt sofort zu posten: Overlay für den Textbeitrag öffnen
    setShowShareSheet(false);
    setCaptionText('');
    setShowCaptionOverlay(true);
  };

  const handleConfirmPublish = async () => {
    if (publishBusy) return;
    setPublishBusy(true);
    try {
      const res = await publishRecipe(recipe, user, captionText);
      setShowCaptionOverlay(false);
      if (res?.photoError) {
        alert('Veröffentlicht! 🎉 Aber das Foto konnte nicht hochgeladen werden:\n' + res.photoError);
      } else {
        alert('Rezept in der Community veröffentlicht! 🎉');
      }
    } catch (err) {
      alert('Fehler beim Veröffentlichen: ' + err.message);
    } finally {
      setPublishBusy(false);
    }
  };

  return (
    <div className="recipe-detail">
      {hasPhoto ? (
        <div className="recipe-detail-hero" onClick={() => setShowFullscreen(true)}
          style={{ cursor: 'zoom-in' }}>
          <img className="recipe-detail-hero-img" src={recipe.image} alt={recipe.title} />
          <div className="recipe-detail-hero-scrim" />
          <div className="recipe-detail-controls" onClick={e => e.stopPropagation()}>
            <div className="detail-ctrl-group">
              <button className="detail-ctrl-btn-glass" onClick={onBack}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2L4 7l5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="detail-ctrl-btn-glass" onClick={onEdit}>
                <Icon name="pencil" size={15} color="#fff" strokeWidth={1.8} />
              </button>
            </div>
            <div className="detail-ctrl-group">
              <button className="detail-ctrl-btn-glass" onClick={e => { e.stopPropagation(); setShowShareSheet(true); }}>
                <Icon name="share" size={15} color="#fff" strokeWidth={1.8} />
              </button>
              <HeartBtn recipe={recipe} onToggle={onToggleFavorite} glass />
            </div>
          </div>
          <div className="recipe-detail-title-overlay">
            <h1 className="recipe-detail-title-photo">{recipe.title}</h1>
            {recipe.subtitle && (
              <div style={{ fontStyle: 'italic', fontSize: 16, marginTop: 6, opacity: 0.94 }}>
                {recipe.subtitle}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="recipe-detail-tint-header" style={{ background: t.bg }}>
          <span className="recipe-detail-tint-initial" style={{ color: t.ink }}>{initial}</span>
          <div className="recipe-detail-controls">
            <div className="detail-ctrl-group">
              <button className="detail-ctrl-btn-white" onClick={onBack}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2L4 7l5 5" stroke="var(--espresso)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="detail-ctrl-btn-white" onClick={onEdit}>
                <Icon name="pencil" size={15} color="var(--espresso)" strokeWidth={1.8} />
              </button>
            </div>
            <div className="detail-ctrl-group">
              <button className="detail-ctrl-btn-white" onClick={e => { e.stopPropagation(); setShowShareSheet(true); }}>
                <Icon name="share" size={15} color="var(--espresso)" strokeWidth={1.8} />
              </button>
              <HeartBtn recipe={recipe} onToggle={onToggleFavorite} />
            </div>
          </div>
          {(category || tags[0]) && (
            <div className="recipe-detail-eyebrow" style={{ color: t.ink }}>
              {category || tags[0]?.name}
            </div>
          )}
          <h1 className="recipe-detail-title-tint">{recipe.title}</h1>
          {recipe.subtitle && (
            <div style={{ fontStyle: 'italic', fontSize: 14, marginTop: 4, color: t.ink, opacity: 0.75, position: 'relative', zIndex: 1 }}>
              {recipe.subtitle}
            </div>
          )}
        </div>
      )}

      {/* Meta row */}
      <div className="recipe-detail-meta">
        {time > 0 && (
          <>
            <div className="detail-stat">
              <span className="detail-stat-value num">{time}</span>
              <span className="detail-stat-unit">Min.</span>
            </div>
            <div className="detail-divider-v" />
          </>
        )}
        {recipe.servings > 0 && (
          <div className="detail-stat">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setServings(s => Math.max(1, s - 1))}
                style={{ background: 'var(--line-2)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--espresso)' }}>
                −
              </button>
              <span className="detail-stat-value num">{servings}</span>
              <button onClick={() => setServings(s => s + 1)}
                style={{ background: 'var(--line-2)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--espresso)' }}>
                +
              </button>
            </div>
            <span className="detail-stat-unit">Port.</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 20px 4px' }}>
          {tags.map((tag, i) => (
            <span key={i} style={{
              background: tag.color ? `${tag.color}33` : 'var(--sage)',
              color: tag.color || 'var(--espresso)',
              borderRadius: 20,
              padding: '5px 13px',
              fontSize: 13,
              fontFamily: 'var(--serif)',
              fontWeight: 600,
            }}>
              {tag.name || tag}
            </span>
          ))}
        </div>
      )}

      {/* Quelle + Datum */}
      {(recipe.source || recipe.createdAt) && (
        <div style={{ padding: '0 22px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {recipe.source && (
            <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--mute)', fontStyle: 'italic' }}>
              Quelle: {recipe.source}
            </div>
          )}
          {recipe.createdAt && (
            <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--mute)' }}>
              Hinzugefügt am {new Date(recipe.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>
      )}

      {/* Ingredients */}
      {ingredients.length > 0 && (
        <div className="recipe-detail-section">
          <div className="section-head">Zutaten</div>
          <div>
            {ingredients.map((ing, i) => (
              <div key={i} className="ingredient-row">
                <span className="ingredient-name">{ing.name}</span>
                <span className="ingredient-amount num">
                  {scaleAmount(ing.amount)}{ing.unit ? ` ${ing.unit}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <div className="recipe-detail-section">
          <div className="section-head">Zubereitung</div>
          <div>
            {steps.map((step, i) => (
              <div key={i} className="step-row">
                <span className="step-num">{i + 1}</span>
                <span className="step-text">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {steps.length > 0 && (
        <div className="recipe-detail-cta">
          <button className="recipe-detail-cta-btn" onClick={onStartCook}>
            Kochmodus starten
            <span style={{ color: 'var(--rose)', fontSize: 20, fontStyle: 'normal' }}>→</span>
          </button>
        </div>
      )}

      <div style={{ height: 20 }} />

      {/* Vollbild-Foto */}
      {showFullscreen && (
        <PhotoFullscreen src={recipe.image} onClose={() => setShowFullscreen(false)} />
      )}

      {/* Share Sheet */}
      {showShareSheet && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 300, display: 'flex', alignItems: 'flex-end',
        }} onClick={() => setShowShareSheet(false)}>
          <div style={{
            background: 'var(--paper)', borderRadius: '20px 20px 0 0',
            padding: '20px 20px 40px', width: '100%',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line-2)', margin: '0 auto 20px' }} />
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, color: 'var(--espresso)', marginBottom: 16 }}>
              Rezept <span style={{ fontStyle: 'italic' }}>teilen</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handlePublish} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--green)', border: 'none',
                borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
              }}>
                <Icon name="globe" size={20} color="var(--paper)" />
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 700, color: 'var(--paper)' }}>In der Community veröffentlichen</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--paper)', opacity: 0.85, fontStyle: 'italic' }}>Für alle Rezeptor-Nutzenden sichtbar</div>
                </div>
              </button>
              <button onClick={handleShareLink} disabled={shareBusy} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--sage)', border: '1px solid var(--sage-2)',
                borderRadius: 14, padding: '14px 16px',
                cursor: shareBusy ? 'default' : 'pointer', textAlign: 'left',
                opacity: shareBusy ? 0.6 : 1,
              }}>
                <Icon name="link" size={20} color="var(--espresso)" />
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 700, color: 'var(--espresso)' }}>
                    {shareBusy ? 'Erstellt Link…' : 'Kurzlink an Rezeptor senden'}
                  </div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--green)', fontStyle: 'italic' }}>Kurzer Link mit Foto, zum Importieren</div>
                </div>
              </button>
              <button onClick={handleShareText} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--paper-2)', border: '1px solid var(--line-2)',
                borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
              }}>
                <Icon name="share" size={20} color="var(--espresso)" />
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 700, color: 'var(--espresso)' }}>Als Text teilen</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--mute)', fontStyle: 'italic' }}>WhatsApp, Mail, Notizen…</div>
                </div>
              </button>
              <button onClick={handleSharePdf} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--paper-2)', border: '1px solid var(--line-2)',
                borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
              }}>
                <Icon name="globe" size={20} color="var(--espresso)" />
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 700, color: 'var(--espresso)' }}>Als PDF teilen</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--mute)', fontStyle: 'italic' }}>Zum Ausdrucken oder Versenden</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Beitreten-Sheet (Kurzlink erfordert Login) */}
      {showJoin && createPortal((
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setShowJoin(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--paper)', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 640, padding: '20px 22px 40px',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line-2)', margin: '0 auto 18px' }} />
            <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700, color: 'var(--espresso)', marginBottom: 6 }}>
              Zum Teilen <span style={{ fontStyle: 'italic' }}>beitreten</span>
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--mute)', marginBottom: 16 }}>
              Für den Kurzlink brauchst du ein Konto (Name reicht).
            </div>
            <JoinCommunity onDone={() => setShowJoin(false)} />
          </div>
        </div>
      ), document.body)}

      {/* Textbeitrag-Overlay vor dem Veröffentlichen */}
      {showCaptionOverlay && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 320, display: 'flex', alignItems: 'flex-end',
        }} onClick={() => { if (!publishBusy) setShowCaptionOverlay(false); }}>
          <div style={{
            background: 'var(--paper)', borderRadius: '20px 20px 0 0',
            padding: '20px 20px 40px', width: '100%',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line-2)', margin: '0 auto 20px' }} />
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, color: 'var(--espresso)', marginBottom: 6 }}>
              Dein <span style={{ fontStyle: 'italic' }}>Textbeitrag</span>
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--mute)', fontStyle: 'italic', marginBottom: 14 }}>
              Erzähl etwas zu „{recipe.title}" – das steht im Feed ganz oben.
            </div>
            <textarea
              value={captionText}
              onChange={e => setCaptionText(e.target.value)}
              autoFocus
              rows={4}
              placeholder="Wie schmeckt es? Wann gibt's das bei dir? Tipps?"
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'none',
                border: '1px solid var(--line-2)', borderRadius: 14,
                padding: '12px 14px', fontFamily: 'var(--serif)', fontSize: 15,
                color: 'var(--espresso)', background: 'var(--card)', outline: 'none',
                lineHeight: 1.5,
              }}
            />
            <button onClick={handleConfirmPublish} disabled={publishBusy} style={{
              width: '100%', marginTop: 16, background: 'var(--green)', border: 'none',
              borderRadius: 14, padding: '14px 16px', cursor: publishBusy ? 'default' : 'pointer',
              fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 700, color: 'var(--paper)',
              opacity: publishBusy ? 0.6 : 1,
            }}>
              {publishBusy ? 'Wird veröffentlicht…' : 'Veröffentlichen'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}