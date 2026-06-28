import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { addRecipe } from '../db/recipes'
import { extractRecipeFromUrl, extractRecipesFromImages, extractRecipeFromText, extractRecipeFromYoutube, extractYouTubeId, extractInstagramId, extractRecipeFromInstagram } from '../db/ai'
import VoiceInput from './VoiceInput'
import IngredientsInput from './IngredientsInput'
import RichTextEditor from './RichTextEditor'
import TagPicker from './TagPicker'
import { Icon, Monogram } from './DesignTokens'
import './AddRecipe.css'

const emptyRecipe = {
  title: '', subtitle: '', servings: '', prepTime: '', cookTime: '',
  ingredients: [], steps: '', tags: [], image: null,
}

async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = async () => {
      const img = new Image()
      img.src = reader.result
      await new Promise(r => img.onload = r)
      const canvas = document.createElement('canvas')
      const maxSize = 1024
      const ratio = Math.min(maxSize / img.width, maxSize / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    reader.readAsDataURL(file)
  })
}

export default function AddRecipe({ onSave, onClose, initialUrl }) {
  const [mode, setMode] = useState('hub')
  const [url, setUrl] = useState('')
  const [form, setForm] = useState(emptyRecipe)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [youtubeNoRecipe, setYoutubeNoRecipe] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [showLinkInfo, setShowLinkInfo] = useState(false)
  const [multiRecipes, setMultiRecipes] = useState(null)
  const [selectedRecipes, setSelectedRecipes] = useState(new Set())
  const photoInputRef = useRef(null)

  // Per Teilen-Funktion (z.B. Reel aus Instagram) geöffnet → Link sofort laden
  useEffect(() => {
    if (initialUrl && initialUrl.startsWith('http')) {
      setUrl(initialUrl)
      handleUrlLoad(initialUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl])

  const handleSave = async () => {
    if (!form.title.trim()) { alert('Bitte gib einen Titel ein.'); return }
    await addRecipe({
      title: form.title, subtitle: form.subtitle,
      servings: Number(form.servings), prepTime: Number(form.prepTime),
      cookTime: Number(form.cookTime), ingredients: form.ingredients,
      steps: form.steps, tags: form.tags, source: form.source || '', image: form.image || null,
    })
    onSave()
  }

  const handleSaveMultiple = async () => {
    if (selectedRecipes.size === 0) { alert('Bitte mindestens ein Rezept auswählen.'); return }
    setIsLoading(true)
    setLoadingMsg(`${selectedRecipes.size} Rezept${selectedRecipes.size > 1 ? 'e' : ''} werden gespeichert …`)
    try {
      for (const idx of selectedRecipes) {
        const r = multiRecipes[idx]
        await addRecipe({
          title: r.title || '', subtitle: r.subtitle || '',
          servings: Number(r.servings) || 0, prepTime: Number(r.prepTime) || 0,
          cookTime: Number(r.cookTime) || 0, ingredients: r.ingredients || [],
          steps: r.steps || '', tags: r.tags || [], source: r.source || '', image: r.image || null,
        })
      }
      onSave()
    } finally {
      setIsLoading(false)
      setLoadingMsg('')
    }
  }

  const handleUrlLoad = async (urlArg) => {
    const link = (typeof urlArg === 'string' ? urlArg : url).trim()
    if (!link) return

    // Instagram-Reels separat behandeln
    if (extractInstagramId(link)) {
      setIsLoading(true); setLoadingMsg('Instagram-Caption wird analysiert … ✨')
      try {
        const result = await extractRecipeFromInstagram(link)
        if (result.noRecipeFound) {
          setYoutubeNoRecipe(result)
          setUrl('')
        } else {
          setForm({
            title: result.title || '', subtitle: result.subtitle || '',
            servings: result.servings || '', prepTime: result.prepTime || '',
            cookTime: result.cookTime || '', ingredients: result.ingredients || [],
            steps: result.steps || '', tags: [], image: result.imageBase64,
            source: result.sourceUrl,
          })
          setUrl(''); setMode('manual')
        }
      } catch (error) {
        alert('Instagram-Rezept konnte nicht geladen werden: ' + error.message)
      } finally {
        setIsLoading(false); setLoadingMsg('')
      }
      return
    }

    // YouTube-URLs separat behandeln
    if (extractYouTubeId(link)) {
      setIsLoading(true); setLoadingMsg('YouTube-Beschreibung wird analysiert … ✨')
      try {
        const result = await extractRecipeFromYoutube(link)
        if (result.noRecipeFound) {
          setYoutubeNoRecipe(result)
          setUrl('')
        } else {
          setForm({
            title: result.title || '', subtitle: result.subtitle || '',
            servings: result.servings || '', prepTime: result.prepTime || '',
            cookTime: result.cookTime || '', ingredients: result.ingredients || [],
            steps: result.steps || '', tags: [], image: result.imageBase64,
            source: result.sourceUrl,
          })
          setUrl(''); setMode('manual')
        }
      } catch (error) {
        alert('YouTube-Rezept konnte nicht geladen werden: ' + error.message)
      } finally {
        setIsLoading(false); setLoadingMsg('')
      }
      return
    }

    // Normale URL
    setIsLoading(true); setLoadingMsg('Rezept wird geladen …')
    try {
      const proxyUrl = `https://rezeptor-proxy.brr-kroeske.workers.dev/fetch?url=${encodeURIComponent(link)}`
      const response = await fetch(proxyUrl)
      const html = await response.text()

      // Bild-URL aus HTML extrahieren
      let imageUrl = null
      const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
      const twitterMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
      console.log('og:image gefunden:', ogMatch?.[1])
      console.log('twitter:image gefunden:', twitterMatch?.[1])
      if (ogMatch) imageUrl = ogMatch[1]
      else if (twitterMatch) imageUrl = twitterMatch[1]

      // Bild laden und als Base64 speichern
      let imageBase64 = null
      if (imageUrl) {
        try {
          if (imageUrl.startsWith('/')) {
            const urlObj = new URL(link)
            imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`
          }
          const imgProxy = `https://rezeptor-proxy.brr-kroeske.workers.dev/?url=${encodeURIComponent(imageUrl)}`
          const imgResponse = await fetch(imgProxy)
          const blob = await imgResponse.blob()
          imageBase64 = await new Promise(resolve => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.readAsDataURL(blob)
          })
        } catch (e) {
          console.log('Bild konnte nicht geladen werden:', e)
        }
      }

      const recipe = await extractRecipeFromUrl(link)
      setForm({
        title: recipe.title || '', subtitle: recipe.subtitle || '',
        servings: recipe.servings || '', prepTime: recipe.prepTime || '',
        cookTime: recipe.cookTime || '', ingredients: recipe.ingredients || [],
        steps: recipe.steps || '', tags: [], image: imageBase64,
        source: link,
      })
      setUrl(''); setMode('manual')
    } catch (error) {
      alert('Fehler: ' + error.message)
    } finally {
      setIsLoading(false); setLoadingMsg('')
    }
  }

  const handlePhotoLoad = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    setIsLoading(true)
    setLoadingMsg(files.length > 1
      ? `${files.length} Fotos werden analysiert … ✨`
      : 'Rezept wird erkannt … ✨')
    try {
      const compressed = await Promise.all(files.map(compressImage))
      const recipes = await extractRecipesFromImages(compressed)

      if (recipes.length === 1) {
        const r = recipes[0]
        setForm({
          title: r.title || '', subtitle: r.subtitle || '',
          servings: r.servings || '', prepTime: r.prepTime || '',
          cookTime: r.cookTime || '', ingredients: r.ingredients || [],
          steps: r.steps || '', tags: [], image: compressed[0],
        })
        setMode('manual')
      } else {
        setMultiRecipes(recipes)
        setSelectedRecipes(new Set(recipes.map((_, i) => i)))
        setMode('multi-select')
      }
    } catch (error) {
      console.error(error)
      alert('Rezept konnte nicht aus dem Foto gelesen werden.')
    } finally {
      setIsLoading(false); setLoadingMsg('')
    }
  }

  const handleVoiceTranscript = async (transcript) => {
    setIsLoading(true); setLoadingMsg('Rezept wird erstellt … ✨')
    try {
      const recipe = await extractRecipeFromText(transcript)
      setForm({
        title: recipe.title || '', subtitle: recipe.subtitle || '',
        servings: recipe.servings || '', prepTime: recipe.prepTime || '',
        cookTime: recipe.cookTime || '', ingredients: recipe.ingredients || [],
        steps: recipe.steps || '', tags: [], image: null,
      })
      setMode('manual')
    } catch (error) {
      throw error // an VoiceInput weiterreichen, damit der Transcript erhalten bleibt
    } finally {
      setIsLoading(false); setLoadingMsg('')
    }
  }

  // ── Loading overlay ──
  if (isLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 200 }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--line-2)', borderTop: '3px solid var(--espresso)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--cocoa)', fontStyle: 'italic' }}>{loadingMsg}</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Multi-Rezept Auswahl ──
  if (mode === 'multi-select' && multiRecipes) {
    return (
      <div className="add-recipe">
        <div className="add-recipe-header">
          <button className="add-close-btn" onClick={() => { setMode('hub'); setMultiRecipes(null) }}>
            <Icon name="x" size={16} color="var(--cocoa)" />
          </button>
        </div>
        <div className="add-recipe-title">
          <h1 className="display" style={{ fontSize: 30, color: 'var(--espresso)', lineHeight: 1.0 }}>
            {multiRecipes.length} Rezepte <span style={{ fontStyle: 'italic', fontWeight: 600 }}>gefunden</span>
          </h1>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--mute)', fontStyle: 'italic', marginTop: 6 }}>
            Welche möchtest du importieren?
          </p>
        </div>
        <div style={{ padding: '16px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {multiRecipes.map((r, i) => {
            const selected = selectedRecipes.has(i)
            return (
              <button
                key={i}
                onClick={() => {
                  const next = new Set(selectedRecipes)
                  selected ? next.delete(i) : next.add(i)
                  setSelectedRecipes(next)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 13,
                  background: selected ? 'var(--sage)' : 'var(--card)',
                  border: `1.5px solid ${selected ? 'var(--sage-2)' : 'var(--line-2)'}`,
                  borderRadius: 16, padding: 12, cursor: 'pointer',
                  transition: 'all 0.15s', textAlign: 'left',
                }}
              >
                <Monogram recipe={r} size={50} radius={12} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 16, color: 'var(--espresso)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.title || 'Unbekanntes Rezept'}
                  </div>
                  {r.subtitle && (
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 12.5, color: 'var(--mute)', fontStyle: 'italic', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.subtitle}
                    </div>
                  )}
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--cocoa)', marginTop: 3 }}>
                    {r.ingredients?.length || 0} Zutaten
                    {r.prepTime || r.cookTime ? ` · ${(r.prepTime || 0) + (r.cookTime || 0)} Min.` : ''}
                  </div>
                </div>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: selected ? 'var(--green)' : 'var(--line-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}>
                  {selected && <Icon name="check" size={14} color="#F9FBF8" strokeWidth={2.5} />}
                </div>
              </button>
            )
          })}
        </div>
        <div style={{ padding: '20px 22px 0' }}>
          <button className="form-save-btn" onClick={handleSaveMultiple}
            disabled={selectedRecipes.size === 0}
            style={{ opacity: selectedRecipes.size === 0 ? 0.4 : 1 }}>
            {selectedRecipes.size === 1 ? '1 Rezept importieren' : `${selectedRecipes.size} Rezepte importieren`}
          </button>
        </div>
        <div style={{ height: 32 }} />
      </div>
    )
  }

  // ── YouTube: kein Rezept gefunden ──
  if (youtubeNoRecipe) {
    return (
      <div className="add-recipe">
        <div className="add-recipe-header">
          <button className="add-close-btn" onClick={() => { setYoutubeNoRecipe(null); setPasteText('') }}>
            <Icon name="x" size={16} color="var(--cocoa)" />
          </button>
        </div>
        <div className="add-recipe-title">
          <h1 className="display" style={{ fontSize: 30, color: 'var(--espresso)', lineHeight: 1.1 }}>
            Kein Rezept <span style={{ fontStyle: 'italic', fontWeight: 600 }}>gefunden</span>
          </h1>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--mute)', fontStyle: 'italic', marginTop: 8 }}>
            Es wurden keine erkennbaren Zutaten oder Zubereitungsschritte gefunden.
          </p>
          <button
            onClick={() => setShowLinkInfo(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <Icon name="info" size={16} color="var(--green)" />
            <span style={{ fontFamily: 'var(--serif)', fontSize: 13.5, color: 'var(--green)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
              Warum manche Links funktionieren und manche nicht
            </span>
          </button>
        </div>
        {youtubeNoRecipe.imageBase64 && (
          <div style={{ padding: '0 22px 16px' }}>
            <img src={youtubeNoRecipe.imageBase64} alt="Thumbnail"
              style={{ width: '100%', borderRadius: 16, objectFit: 'cover', maxHeight: 180 }} />
            <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--cocoa)', fontStyle: 'italic', marginTop: 6 }}>
              {youtubeNoRecipe.title}
            </div>
          </div>
        )}
        <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="add-method-card" onClick={async () => {
            if (!youtubeNoRecipe.description) {
              alert('Keine Beschreibung vorhanden.')
              return
            }
            setIsLoading(true); setLoadingMsg('Gemini versucht sein Glück … ✨')
            try {
              const result = await extractRecipeFromText(
                `Videotitel: ${youtubeNoRecipe.title}\n\n${youtubeNoRecipe.description}`
              )
              setForm({
                title: result.title || youtubeNoRecipe.title || '',
                subtitle: result.subtitle || '',
                servings: result.servings || '', prepTime: result.prepTime || '',
                cookTime: result.cookTime || '', ingredients: result.ingredients || [],
                steps: result.steps || '', tags: [],
                image: youtubeNoRecipe.imageBase64,
                source: youtubeNoRecipe.sourceUrl,
              })
              setYoutubeNoRecipe(null); setMode('manual')
            } catch {
              alert('Auch Gemini konnte kein Rezept erkennen.')
            } finally {
              setIsLoading(false); setLoadingMsg('')
            }
          }}>
            <div className="add-method-icon" style={{ background: 'var(--sage)' }}>
              <Icon name="sparkles" size={22} color="var(--espresso)" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="add-method-title">Trotzdem versuchen</div>
              <div className="add-method-hint">Gemini interpretiert die Beschreibung</div>
            </div>
            <Icon name="chev" size={18} color="var(--line-2)" />
          </button>
          <button className="add-method-card" onClick={() => {
            setForm({
              ...emptyRecipe,
              title: youtubeNoRecipe.title || '',
              image: youtubeNoRecipe.imageBase64,
              source: youtubeNoRecipe.sourceUrl,
            })
            setYoutubeNoRecipe(null); setMode('manual')
          }}>
            <div className="add-method-icon" style={{ background: 'var(--rose)' }}>
              <Icon name="pen" size={22} color="var(--espresso)" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="add-method-title">Manuell eingeben</div>
              <div className="add-method-hint">Titel und Thumbnail werden übernommen</div>
            </div>
            <Icon name="chev" size={18} color="var(--line-2)" />
          </button>

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 2 }}>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="… oder Caption / Rezepttext hier einfügen"
              rows={4}
              style={{ width: '100%', boxSizing: 'border-box', borderRadius: 14, border: '1px solid var(--line-2)', padding: '12px 14px', fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)', background: 'var(--paper)', resize: 'vertical' }}
            />
            <button className="add-method-card" disabled={!pasteText.trim()} style={{ marginTop: 10, opacity: pasteText.trim() ? 1 : 0.5 }}
              onClick={async () => {
                setIsLoading(true); setLoadingMsg('Rezept wird aus Text erstellt … ✨')
                try {
                  const result = await extractRecipeFromText(pasteText)
                  setForm({
                    title: result.title || youtubeNoRecipe.title || '',
                    subtitle: result.subtitle || '',
                    servings: result.servings || '', prepTime: result.prepTime || '',
                    cookTime: result.cookTime || '', ingredients: result.ingredients || [],
                    steps: result.steps || '', tags: [],
                    image: youtubeNoRecipe.imageBase64,
                    source: youtubeNoRecipe.sourceUrl,
                  })
                  setYoutubeNoRecipe(null); setPasteText(''); setMode('manual')
                } catch {
                  alert('Aus dem Text konnte kein Rezept erkannt werden.')
                } finally {
                  setIsLoading(false); setLoadingMsg('')
                }
              }}>
              <div className="add-method-icon" style={{ background: 'var(--tint-3-bg)' }}>
                <Icon name="sparkles" size={22} color="var(--espresso)" />
              </div>
              <div style={{ flex: 1 }}>
                <div className="add-method-title">Aus Text erstellen</div>
                <div className="add-method-hint">Caption oder Rezept einfügen</div>
              </div>
              <Icon name="chev" size={18} color="var(--line-2)" />
            </button>
          </div>
        </div>
        <div style={{ height: 32 }} />

        {showLinkInfo && createPortal((
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }} onClick={() => setShowLinkInfo(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'var(--paper)', borderRadius: '20px 20px 0 0',
              width: '100%', maxWidth: 640, padding: '20px 22px 40px', maxHeight: '82vh', overflowY: 'auto',
            }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line-2)', margin: '0 auto 18px' }} />
              <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700, color: 'var(--espresso)', marginBottom: 14 }}>
                Welche Links <span style={{ fontStyle: 'italic' }}>funktionieren</span>?
              </div>
              {[
                ['Webseiten & Foodblogs', 'Klappt fast immer — Zutaten und Schritte stehen direkt im Seitentext.'],
                ['YouTube', 'Klappt, wenn das Rezept in der Videobeschreibung oder einem der Top-Kommentare steht. Wird es nur im Video gesprochen, lässt es sich nicht auslesen.'],
                ['Instagram-Reels', 'Klappt, wenn das Rezept in der Bildunterschrift (Caption) steht. Nicht möglich, wenn dort nur „Rezept auf meiner Website" verlinkt ist, das Rezept ausschließlich im Video gezeigt wird oder das Profil privat ist.'],
              ].map(([t, d]) => (
                <div key={t} style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 700, color: 'var(--espresso)', marginBottom: 2 }}>{t}</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 13.5, color: 'var(--cocoa)', lineHeight: 1.5 }}>{d}</div>
                </div>
              ))}
              <div style={{ fontFamily: 'var(--serif)', fontSize: 12.5, color: 'var(--mute)', fontStyle: 'italic', marginTop: 4 }}>
                Kurz gesagt: Steht das Rezept irgendwo als Text, klappt's. Steckt es nur im gesprochenen oder gezeigten Video, leider nicht.
              </div>
              <button onClick={() => setShowLinkInfo(false)} style={{
                marginTop: 20, width: '100%', padding: '13px', borderRadius: 14, border: 'none',
                background: 'var(--green)', color: '#F9FBF8', fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}>
                Verstanden
              </button>
            </div>
          </div>
        ), document.body)}
      </div>
    )
  }

  // ── Hub ──
  if (mode === 'hub') {
    const methods = [
      { icon: 'camera', title: 'Foto', hint: 'Ein oder mehrere Fotos auswählen', tone: 'sage', onClick: () => photoInputRef.current?.click() },
      { icon: 'mic', title: 'Diktieren', hint: 'Einfach einsprechen', tone: 'rose', onClick: () => setMode('voice') },
      { icon: 'pen', title: 'Manuell', hint: 'Von Hand eintippen', tone: 'paper-2', onClick: () => setMode('manual') },]
    const tileBg = { sage: 'var(--sage)', rose: 'var(--rose)', 'paper-2': 'var(--paper-2)', tint: 'var(--tint-3-bg)' }
    return (
      <div className="add-recipe">
        <div className="add-recipe-header">
          <button className="add-close-btn" onClick={onClose}>
            <Icon name="x" size={16} color="var(--cocoa)" />
          </button>
        </div>
        <div className="add-recipe-title">
          <h1 className="display" style={{ fontSize: 40, color: 'var(--espresso)', lineHeight: 1.0 }}>
            Rezept <span style={{ fontStyle: 'italic', fontWeight: 600 }}>hinzufügen</span>
          </h1>
        </div>
        <div className="add-link-section">
          <div className="add-link-row">
            <Icon name="link" size={20} color="var(--mute)" />
            <input className="add-link-input" placeholder="Link einfügen …" value={url}
              onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUrlLoad()} />
            <button className="add-link-submit" onClick={handleUrlLoad} disabled={!url.trim()}>
              <Icon name="chev" size={20} color="#F9FBF8" strokeWidth={2} />
            </button>
          </div>
          <div className="add-link-caption">Webseite, YouTube oder Instagram-Reel</div>
        </div>
        <div className="add-divider">oder</div>
        <div className="add-methods">
          {methods.map(m => (
            <button key={m.title} className="add-method-card" onClick={m.onClick}>
              <div className="add-method-icon" style={{ background: tileBg[m.tone] }}>
                <Icon name={m.icon} size={22} color="var(--espresso)" />
              </div>
              <div style={{ flex: 1 }}>
                <div className="add-method-title">{m.title}</div>
                <div className="add-method-hint">{m.hint}</div>
              </div>
              <Icon name="chev" size={18} color="var(--line-2)" />
            </button>
          ))}
        </div>
        <input ref={photoInputRef} type="file" accept="image/*" multiple
          style={{ display: 'none' }} onChange={handlePhotoLoad} />
      </div>

    )
  }

  // ── Voice ──
  if (mode === 'voice') {
    return (
      <div className="add-recipe">
        <div className="add-recipe-header">
          <button className="add-close-btn" onClick={() => setMode('hub')}>
            <Icon name="chev-left" size={18} color="var(--cocoa)" />
          </button>
        </div>
        <div className="add-recipe-title">
          <h1 className="display" style={{ fontSize: 34, color: 'var(--espresso)', lineHeight: 1.0 }}>
            Rezept <span style={{ fontStyle: 'italic', fontWeight: 600 }}>diktieren</span>
          </h1>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--mute)', fontStyle: 'italic', marginTop: 8 }}>
            Sprich dein Rezept einfach ein — die KI strukturiert es für dich.
          </p>
        </div>
        <div style={{ padding: '24px 22px 0' }}>
          <VoiceInput onTranscript={handleVoiceTranscript} />
        </div>
      </div>
    )
  }

  // ── Manuelles Formular ──
  return (
    <div className="add-recipe">
      <div className="add-recipe-header">
        <button className="add-close-btn" onClick={() => setMode('hub')}>
          <Icon name="chev-left" size={18} color="var(--cocoa)" />
        </button>
      </div>
      <div className="add-recipe-title">
        <h1 className="display" style={{ fontSize: 34, color: 'var(--espresso)', lineHeight: 1.0 }}>
          {form.title
            ? <span style={{ fontStyle: 'italic', fontWeight: 600 }}>{form.title}</span>
            : <>Rezept <span style={{ fontStyle: 'italic', fontWeight: 600 }}>eingeben</span></>
          }
        </h1>
      </div>
      <div className="manual-form">
        <div className="form-section">
          <label className="form-label">Titel</label>
          <input className="form-input" type="text" placeholder="z.B. Spaghetti Carbonara"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="form-section">
          <label className="form-label">Untertitel <span className="form-label-opt">optional</span></label>
          <input className="form-input" type="text" placeholder="z.B. nach Tante Erika"
            value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} />
        </div>
        <div className="form-section">
          <label className="form-label">Foto <span className="form-label-opt">optional</span></label>
          <input className="form-input-file" type="file" accept="image/*"
            onChange={e => {
              const file = e.target.files[0]; if (!file) return
              const reader = new FileReader()
              reader.onloadend = () => setForm({ ...form, image: reader.result })
              reader.readAsDataURL(file)
            }} />
          {form.image && <img src={form.image} alt="Vorschau" style={{ marginTop: 10, borderRadius: 12, width: '100%', maxHeight: 200, objectFit: 'cover' }} />}
        </div>
        <div className="form-row-3">
          <div className="form-section">
            <label className="form-label">Portionen</label>
            <input className="form-input" type="number" placeholder="4" value={form.servings}
              onChange={e => setForm({ ...form, servings: e.target.value })} />
          </div>
          <div className="form-section">
            <label className="form-label">Vorbereitung</label>
            <input className="form-input" type="number" placeholder="10 Min." value={form.prepTime}
              onChange={e => setForm({ ...form, prepTime: e.target.value })} />
          </div>
          <div className="form-section">
            <label className="form-label">Kochen</label>
            <input className="form-input" type="number" placeholder="30 Min." value={form.cookTime}
              onChange={e => setForm({ ...form, cookTime: e.target.value })} />
          </div>
        </div>
        <div className="form-section">
          <label className="form-label">Zutaten</label>
          <IngredientsInput ingredients={form.ingredients}
            onChange={ingredients => setForm({ ...form, ingredients })} />
        </div>
        <div className="form-section">
          <label className="form-label">Zubereitung</label>
          <RichTextEditor key={form.steps ? 'loaded' : 'empty'}
            content={form.steps} onChange={steps => setForm({ ...form, steps })} />
        </div>
        <div className="form-section">
          <label className="form-label">Quelle <span className="form-label-opt">optional</span></label>
          <input className="form-input" type="text" placeholder="z.B. essen.de oder Oma"
            value={form.source || ''} onChange={e => setForm({ ...form, source: e.target.value })} />
        </div>
        <div className="form-section">
          <label className="form-label">Tags</label>
          <TagPicker selectedTags={form.tags} onChange={tags => setForm({ ...form, tags })} />
        </div>
        <button className="form-save-btn" onClick={handleSave}>Rezept speichern</button>
        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}
