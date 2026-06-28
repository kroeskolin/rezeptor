// ─────────────────────────────────────────────────────────────────────────────
// /reelinfo?code=SHORTCODE  →  { caption, username, thumbnail, source }
//
// Gehört in den Cloudflare-Worker (rezeptor-proxy), NICHT ins Rezeptor-App-Repo.
// Holt die öffentliche Instagram-Embed-Seite eines Reels/Posts und parst die
// Caption. KEIN Login, KEIN API-Key, keine Secrets nötig.
//
// EINBAU: In deinem fetch-Handler dort, wo du schon /videoinfo, /comment, /fetch
// nach url.pathname unterscheidest, diese Zeile ergänzen:
//
//     if (url.pathname === '/reelinfo') {
//       return handleReelInfo(url.searchParams.get('code'))
//     }
//
// Die Funktionen unten irgendwo im Worker-Modul-Scope einfügen.
// (Getestet am Reel DYHbtVytpxS: volle Caption + Username + Thumbnail, Umlaute korrekt.)
// ─────────────────────────────────────────────────────────────────────────────

async function handleReelInfo(code) {
  const cors = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  }
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: cors })

  if (!code || !/^[A-Za-z0-9_-]+$/.test(code)) {
    return json({ caption: '', username: '', thumbnail: null, error: 'bad-code' }, 400)
  }

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
             '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

  // /reel/ zuerst, dann /p/ (Foto-Posts) – der Shortcode allein verrät den Typ nicht.
  const urls = [
    `https://www.instagram.com/reel/${code}/embed/captioned/`,
    `https://www.instagram.com/p/${code}/embed/captioned/`,
  ]

  let html = ''
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'de,en;q=0.8' } })
      if (!r.ok) continue
      const body = await r.text()
      if (body.includes('class="Caption"') || body.includes('og:description')) { html = body; break }
    } catch (_) { /* nächste URL versuchen */ }
  }

  if (!html) return json({ caption: '', username: '', thumbnail: null, error: 'no-caption' })

  // ── Parsen (reines Regex, kein DOM) ──
  let username = '', caption = '', source = ''

  const block = html.match(/<div class="Caption">([\s\S]*?)<\/div>/)
  if (block) {
    let inner = block[1]
    const u = inner.match(/<a class="CaptionUsername"[^>]*>([\s\S]*?)<\/a>/)
    if (u) { username = stripTags(u[1]).trim(); inner = inner.slice(inner.indexOf('</a>') + 4) }
    caption = cleanCaption(inner)
    source = 'embed'
  }
  // Fallback: gekürzte Caption aus og:description, falls Markup mal anders ist
  if (!caption) {
    const og = html.match(/<meta property="og:description" content="([^"]*)"/)
    if (og) { caption = decodeEntities(og[1]).trim(); source = 'og-description' }
  }

  // Thumbnail: das Post-Bild (nicht das Profilbild)
  let thumbnail = null
  let m = html.match(/<img class="EmbeddedMediaImage"[^>]*\ssrc="([^"]+)"/)
  if (!m) m = html.match(/<meta property="og:image" content="([^"]+)"/)
  if (m) thumbnail = decodeEntities(m[1])

  // abschließendes "View all N comments" / "View N comments" wegschneiden
  caption = caption.replace(/\s*View (?:all )?[\d.,]+ comments?\s*$/i, '').trim()

  if (!caption) return json({ caption: '', username, thumbnail, error: 'no-caption' })
  return json({ caption, username, thumbnail, source })
}

function stripTags(s) { return s.replace(/<[^>]+>/g, '') }

function cleanCaption(s) {
  return decodeEntities(
    s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
  ).replace(/\n{3,}/g, '\n\n').trim()
}

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&') // zuletzt, sonst Doppel-Decode
}
