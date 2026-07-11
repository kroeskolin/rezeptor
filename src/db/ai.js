import { getImportPrefs } from './prefs'

const WORKER_URL = 'https://rezeptor-proxy.brr-kroeske.workers.dev'

// ── Import-Vorlieben (Sprache/Einheiten) als Prompt-Zusatz ──
// Wird an alle Rezept-Extraktions-Prompts angehängt. Die KI meldet über die
// Flags "translated"/"converted" zurück, was sie wirklich getan hat.
const LANG_NAMES = { de: 'Deutsch', en: 'Englisch (English)', fr: 'Französisch (français)', it: 'Italienisch (italiano)', es: 'Spanisch (español)' }

function importDirectives() {
    const p = getImportPrefs()
    const lines = []
    if (p.translate) {
        const lang = LANG_NAMES[p.language] || 'Deutsch'
        lines.push(`- Wenn das Rezept NICHT auf ${lang} ist: übersetze ALLE Texte (title, subtitle, Zutaten-Namen und -Einheiten, steps) nach ${lang} und setze "translated": true. Ist es bereits auf ${lang}, lass es unverändert und setze "translated": false.`)
    }
    if (p.convert) {
        lines.push(p.units === 'metric'
            ? '- Konvertiere alle Mengenangaben ins metrische System (g, kg, ml, l, EL, TL). Runde sinnvoll (z.B. 1 cup Mehl ≈ 120 g, 1 cup Flüssigkeit ≈ 240 ml, 1 oz ≈ 28 g). Wenn du etwas konvertiert hast, setze "converted": true, sonst false.'
            : '- Konvertiere alle Mengenangaben ins US-System (cups, tablespoons, teaspoons, oz, lb). Runde sinnvoll. Wenn du etwas konvertiert hast, setze "converted": true, sonst false.')
    }
    if (!lines.length) return { active: false, text: '' }
    return {
        active: true,
        text: `\nZusätzlich:\n${lines.join('\n')}\n- Ergänze im JSON die Felder "translated" und "converted" (true/false).`,
    }
}

// Bereits geparste Rezepte (z.B. aus JSON-LD) nachträglich übersetzen/konvertieren.
async function normalizeImportedRecipe(recipe) {
    const dir = importDirectives()
    if (!dir.active) return recipe
    try {
        const prompt = `Du bist ein Kochbuch-Assistent. Hier ist ein Rezept als JSON. Gib es im GLEICHEN Format zurück (gleiche Felder, steps bleibt HTML mit <p>-Tags).${dir.text}
- Ändere inhaltlich sonst NICHTS.
- Antworte NUR mit dem JSON-Objekt, ohne Markdown-Backticks.

${JSON.stringify(recipe)}`
        const result = await generateContent(prompt)
        const clean = result.replace(/```json|```/g, '').trim()
        return { ...recipe, ...JSON.parse(clean) }
    } catch {
        return recipe // Normalisierung ist optional — Original behalten
    }
}

async function generateContent(contents) {
    const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'gemini-2.5-flash',
            contents: typeof contents === 'string'
                ? [{ parts: [{ text: contents }] }]
                : contents,
        }),
    })
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    return data.candidates[0].content.parts[0].text
}

export async function extractRecipeFromText(text) {
    const prompt = `
Du bist ein Kochbuch-Assistent. Extrahiere aus folgendem Text ein strukturiertes Rezept.
Antworte NUR mit einem JSON-Objekt, ohne Markdown-Backticks, ohne Erklärungen.

Das JSON soll exakt dieses Format haben:
{
  "title": "Rezeptname",
  "subtitle": "Untertitel oder leer",
  "servings": 4,
  "prepTime": 10,
  "cookTime": 20,
  "ingredients": [
    { "name": "Zutat", "amount": "200", "unit": "g" }
  ],
  "steps": "<p>Schritt 1</p><p>Schritt 2</p>"
}

Regeln:
- prepTime und cookTime sind Zahlen in Minuten
- servings ist eine Zahl
- steps ist HTML mit <p> Tags; beginne die Schritte NICHT mit Nummerierungen wie "1." oder "Schritt 1:" (die App nummeriert selbst)
- Steht Text im Original KOMPLETT IN GROSSBUCHSTABEN (Titel, Untertitel, Zutaten oder Schritte), wandle ihn in normale Groß-/Kleinschreibung um (deutsche Rechtschreibung: Substantive groß)
- Wenn eine Mengenangabe fehlt oder unklar ist (z.B. "etwas", "nach Gefühl", "ein bisschen"), schätze eine sinnvolle typische Menge für die angegebene Personenzahl und markiere sie mit "ca." im amount Feld, z.B. "ca. 2"
- Nur wenn wirklich keine sinnvolle Schätzung möglich ist, schreibe "nach Geschmack" als unit und lasse amount leer
- Antworte ausschließlich mit dem JSON
${importDirectives().text}
Text:
${text}
`
    const result = await generateContent(prompt)
    const clean = result.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
}

export async function extractRecipeFromUrl(url) {
    try {
        const proxyUrl = `https://rezeptor-proxy.brr-kroeske.workers.dev/fetch?url=${encodeURIComponent(url)}`
        const response = await fetch(proxyUrl)
        const text = await response.text()

        // JSON-LD versuchen
        const jsonLdMatch = text.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
        if (jsonLdMatch) {
            for (const block of jsonLdMatch) {
                try {
                    const inner = block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')
                    const data = JSON.parse(inner)

                    // Direkt oder im @graph suchen
                    const candidates = data['@graph']
                        ? data['@graph']
                        : Array.isArray(data) ? data : [data]

                    const recipeData = candidates.find(d =>
                        d['@type'] === 'Recipe' ||
                        (Array.isArray(d['@type']) && d['@type'].includes('Recipe'))
                    )
                    if (recipeData) {
                        // Ggf. übersetzen/konvertieren (laut Einstellungen)
                        return await normalizeImportedRecipe(parseJsonLdRecipe(recipeData))
                    }
                } catch { }
            }
        }

        // Fallback: Gemini
        const trimmed = text.slice(0, 40000)
        return await extractRecipeFromText(trimmed)
    } catch (error) {
        console.error('Detaillierter Fehler:', error)
        throw new Error('URL konnte nicht geladen werden.')
    }
}

function parseJsonLdRecipe(data) {
    const parseTime = (iso) => {
        if (!iso) return 0
        const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
        if (!match) return 0
        return (parseInt(match[1] || 0) * 60) + parseInt(match[2] || 0)
    }

    // Bekannte Einheiten (dt. + engl.), auch OHNE Punkt — "cup"/"g"/"EL" etc.
    // landen so im unit-Feld statt im Zutaten-Namen.
    const INGREDIENT_RE = /^\s*([\d/.,\s¼½¾⅓⅔⅛]+)?\s*(?:(g|kg|mg|ml|cl|dl|l|EL|TL|Esslöffel|Teelöffel|Msp|Prisen?|Bund|Stück|Zehen?|Dosen?|Packung(?:en)?|Pck|Becher|Tassen?|Scheiben?|Blatt|Blätter|cups?|tbsp|tsp|oz|lb|pounds?|ounces?|cans?|cloves?|teaspoons?|tablespoons?)\b\.?\s+)?(.*)$/i
    const ingredients = (data.recipeIngredient || []).map(ing => {
        const match = ing.match(INGREDIENT_RE)
        return {
            amount: match?.[1]?.trim() || '',
            unit: match?.[2]?.trim() || '',
            name: match?.[3]?.trim() || ing,
        }
    })

    // recipeInstructions kann sein: String, Array von Strings/HowToStep, ODER
    // HowToSection(s) mit verschachtelten itemListElement-Schritten (z.B. Chefkoch).
    const flattenInstructions = (instr) => {
        if (!instr) return []
        if (typeof instr === 'string') {
            return instr.split(/\r?\n+/).map(s => s.trim()).filter(Boolean)
        }
        if (Array.isArray(instr)) return instr.flatMap(flattenInstructions)
        if (instr.itemListElement) return flattenInstructions(instr.itemListElement) // HowToSection
        const t = instr.text || instr.name || ''
        return t ? [String(t).trim()] : []
    }
    const steps = flattenInstructions(data.recipeInstructions)
        .map(t => `<p>${t}</p>`).join('')

    return {
        title: data.name || '',
        subtitle: data.description?.slice(0, 100) || '',
        servings: parseInt(data.recipeYield) || 4,
        prepTime: parseTime(data.prepTime),
        cookTime: parseTime(data.cookTime || data.totalTime),
        ingredients,
        steps,
    }
}

export async function extractRecipeFromImage(base64Image) {
    const data = await generateContent([{
        parts: [
            {
                text: `Du bist ein Kochbuch-Assistent. Lies diese Rezeptseite vollständig – egal wie das Layout aussieht (einspaltig, zweispaltig, Tabelle, etc.).
Extrahiere Titel, alle Zutaten UND die komplette Zubereitung.
Antworte NUR mit einem JSON-Objekt, ohne Markdown-Backticks, ohne Erklärungen.

{
  "title": "Rezeptname",
  "subtitle": "Kurze Beschreibung wenn vorhanden, sonst leer",
  "servings": 4,
  "prepTime": 30,
  "cookTime": 0,
  "ingredients": [{ "name": "Zutat", "amount": "200", "unit": "g" }],
  "steps": "<p>Schritt 1</p><p>Schritt 2</p>"
}

Wichtig:
- Lies den GESAMTEN Text der Seite
- steps muss HTML sein mit <p> Tags pro Absatz
- Antworte ausschließlich mit dem JSON`
            },
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image.split(',')[1]
                }
            }
        ]
    }])
    const clean = data.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
}

export async function suggestUnitWithAI(ingredientName) {
    const prompt = `Was ist die typische Maßeinheit für "${ingredientName}" in einem Kochrezept?
Antworte NUR mit einem dieser Werte: g, kg, ml, l, Stück, Zehe, EL, TL, Prise, Bund, Packung, nach Geschmack
Keine Erklärung, nur die Einheit.`
    const result = await generateContent(prompt)
    return result.trim()
}

export async function transcribeAudio(base64Audio, mimeType) {
    const data = await generateContent([{
        parts: [
            {
                text: `Transkribiere diese Sprachaufnahme vollständig und wörtlich auf Deutsch. 
Antworte NUR mit dem transkribierten Text, ohne Erklärungen oder Formatierungen.`
            },
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Audio
                }
            }
        ]
    }])
    return data.trim()
}

export async function extractRecipesFromImages(base64Images) {
    const parts = [
        {
            text: `Du bist ein Kochbuch-Assistent. Analysiere diese Bilder (es können mehrere Seiten eines Rezepts oder mehrere verschiedene Rezepte sein).

Antworte NUR mit einem JSON-Array, ohne Markdown-Backticks, ohne Erklärungen.

Wenn alle Bilder zusammen EIN Rezept zeigen (z.B. Seite 1 und Seite 2), gib ein Array mit einem Objekt zurück.
Wenn die Bilder MEHRERE verschiedene Rezepte zeigen, gib ein Array mit einem Objekt pro Rezept zurück.

Format:
[
  {
    "title": "Rezeptname",
    "subtitle": "Untertitel / kurze Beschreibung",
    "servings": 4,
    "prepTime": 10,
    "cookTime": 20,
    "ingredients": [{ "name": "Zutat", "amount": "200", "unit": "g" }],
    "steps": "<p>Schritt 1</p><p>Schritt 2</p>",
    "sourceImageIndex": 0
  }
]

sourceImageIndex ist die 0-basierte Nummer des Bildes (in der übergebenen Reihenfolge), auf dem dieses Rezept (hauptsächlich) zu sehen ist.

Regeln:
- Lies den GESAMTEN Text aller Bilder
- subtitle: Übernimm für JEDES Rezept den Untertitel bzw. die Beschreibungszeile WÖRTLICH vom Bild (steht meist unter oder über dem Rezeptnamen). ERFINDE KEINEN eigenen Untertitel — steht wirklich keiner auf dem Bild, lass subtitle leer.
- steps ist HTML mit <p> Tags; beginne die Schritte NICHT mit Nummerierungen wie "1." oder "Schritt 1:" (die App nummeriert selbst)
- Steht Text im Original KOMPLETT IN GROSSBUCHSTABEN (Titel, Untertitel, Zutaten oder Schritte), wandle ihn in normale Groß-/Kleinschreibung um (deutsche Rechtschreibung: Substantive groß)
- prepTime und cookTime sind Zahlen in Minuten
- Wenn eine Zutat sowohl eine Stückangabe als auch ein Gewicht in Klammern hat (z.B. "½ kleiner Radicchio (50g)"), nimm die Stückangabe als amount und unit, und lass das Gewicht in Klammern weg. Beispiel: amount: "½", unit: "Stück", name: "kleiner Radicchio"
- Bruchzahlen wie ½, ¼, ⅓ immer als Unicode-Zeichen übernehmen, nicht als Dezimalzahl umrechnen
- Antworte ausschließlich mit dem JSON-Array
${importDirectives().text}`
        },
        ...base64Images.map(img => ({
            inlineData: {
                mimeType: 'image/jpeg',
                data: img.split(',')[1]
            }
        }))
    ]

    const data = await generateContent([{ parts }])
    const clean = data.replace(/```json|```/g, '').trim()
    const recipes = JSON.parse(clean)
    return Array.isArray(recipes) ? recipes : [recipes]
}

// Hilfsfunktion: YouTube-URL erkennen und Video-ID extrahieren
export function extractYouTubeId(url) {
    const match = url.match(
        /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    )
    return match?.[1] || null
}

export async function extractRecipeFromYoutube(url) {
    const videoId = extractYouTubeId(url)
    if (!videoId) throw new Error('Keine gültige YouTube-URL.')

    // Video-Infos über YouTube Data API (via Worker)
    const infoProxy = `https://rezeptor-proxy.brr-kroeske.workers.dev/videoinfo?videoId=${videoId}`
    const infoResponse = await fetch(infoProxy)
    const info = await infoResponse.json()

    if (info.error) throw new Error('YouTube-Video konnte nicht geladen werden: ' + info.error)

    const pageTitle = info.title || ''
    const description = info.description || ''

    // Thumbnail
    let imageBase64 = null
    if (info.thumbnail) {
        try {
            const imgProxy = `https://rezeptor-proxy.brr-kroeske.workers.dev/?url=${encodeURIComponent(info.thumbnail)}`
            const imgResponse = await fetch(imgProxy)
            const blob = await imgResponse.blob()
            imageBase64 = await new Promise(resolve => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(blob)
            })
        } catch (e) {
            console.log('Thumbnail konnte nicht geladen werden:', e)
        }
    }

    const hasRecipeHints = (text) =>
        /\d+\s*(g|kg|ml|l|EL|TL|tbsp|tsp|Stück|Zehe|Prise|Bund|cup|oz|lb)\b/i.test(text)
        || /zutaten|ingredients|rezept|recipe/i.test(text)

    // Quelle 1: Beschreibung prüfen
    let sourceText = ''
    let sourceLabel = ''
    if (description && hasRecipeHints(description)) {
        sourceText = description
        sourceLabel = 'Videobeschreibung'
    }

    // Quelle 2: Erster Kommentar prüfen, falls Beschreibung nichts brachte
    let topComments = []
    if (!sourceText) {
        try {
            const commentProxy = `https://rezeptor-proxy.brr-kroeske.workers.dev/comment?videoId=${videoId}`
            const commentResponse = await fetch(commentProxy)
            const commentData = await commentResponse.json()
            topComments = commentData.comments || []

            const recipeComment = topComments.find(c => hasRecipeHints(c))
            if (recipeComment) {
                sourceText = recipeComment
                sourceLabel = 'Kommentar'
            }
        } catch (e) {
            console.log('Kommentare konnten nicht geladen werden:', e)
        }
    }

    // Nichts gefunden -> Dialog im Frontend
    if (!sourceText) {
        return {
            noRecipeFound: true,
            title: pageTitle,
            description,
            topComments,
            imageBase64,
            sourceUrl: url,
        }
    }

    // Gemini mit Titel + gefundenem Text
    const prompt = `
Du bist ein Kochbuch-Assistent. Extrahiere aus diesem Text (Quelle: ${sourceLabel} eines YouTube-Videos) ein strukturiertes Rezept.
Videotitel: ${pageTitle}

Text:
${sourceText.slice(0, 8000)}

Antworte NUR mit einem JSON-Objekt, ohne Markdown-Backticks, ohne Erklärungen.
{
  "title": "Rezeptname",
  "subtitle": "Kurze Beschreibung oder leer",
  "servings": 4,
  "prepTime": 10,
  "cookTime": 20,
  "ingredients": [{ "name": "Zutat", "amount": "200", "unit": "g" }],
  "steps": "<p>Schritt 1</p><p>Schritt 2</p>",
  "confidence": "high"
}

Regeln:
- confidence ist "high" wenn Zutaten UND Zubereitung klar erkennbar sind, sonst "low"
- steps ist HTML mit <p> Tags; beginne die Schritte NICHT mit Nummerierungen wie "1." oder "Schritt 1:" (die App nummeriert selbst)
- Steht Text im Original KOMPLETT IN GROSSBUCHSTABEN (Titel, Untertitel, Zutaten oder Schritte), wandle ihn in normale Groß-/Kleinschreibung um (deutsche Rechtschreibung: Substantive groß)
- prepTime und cookTime sind Zahlen in Minuten
- Antworte ausschließlich mit dem JSON
${importDirectives().text}
`
    const result = await generateContent(prompt)
    const clean = result.replace(/```json|```/g, '').trim()
    const recipe = JSON.parse(clean)

    return {
        ...recipe,
        noRecipeFound: recipe.confidence === 'low' && (!recipe.ingredients?.length),
        description,
        imageBase64,
        sourceUrl: url,
    }
}

// ── Instagram-Reel-Import ──
// Shortcode aus allen Formaten (reel/reels/p/tv), Tracking-Parameter werden ignoriert.
export function extractInstagramId(url) {
    const match = url.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/)
    return match?.[1] || null
}

export async function extractRecipeFromInstagram(url) {
    const code = extractInstagramId(url)
    if (!code) throw new Error('Keine gültige Instagram-URL.')

    // Caption über den Worker holen (öffentliche embed/captioned-Seite; kein Login/Key)
    const infoResponse = await fetch(`${WORKER_URL}/reelinfo?code=${code}`)
    const info = await infoResponse.json()

    const caption = info.caption || ''
    const username = info.username || ''

    // Thumbnail (wie bei YouTube über den /?url=-Proxy zu Base64)
    let imageBase64 = null
    if (info.thumbnail) {
        try {
            const imgResponse = await fetch(`${WORKER_URL}/?url=${encodeURIComponent(info.thumbnail)}`)
            const blob = await imgResponse.blob()
            imageBase64 = await new Promise(resolve => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(blob)
            })
        } catch (e) {
            console.log('Thumbnail konnte nicht geladen werden:', e)
        }
    }

    const hasRecipeHints = (text) =>
        /\d+\s*(g|kg|ml|l|EL|TL|tbsp|tsp|Stück|Zehe|Prise|Bund|cup|oz|lb)\b/i.test(text)
        || /zutaten|ingredients|rezept|recipe/i.test(text)

    // Keine (oder geblockte) Caption bzw. keine Rezept-Hinweise → „kein Rezept"-Dialog,
    // dort kann die Caption auch manuell eingefügt werden.
    if (!caption || !hasRecipeHints(caption)) {
        return {
            noRecipeFound: true,
            title: username,
            description: caption,
            imageBase64,
            sourceUrl: url,
        }
    }

    const prompt = `
Du bist ein Kochbuch-Assistent. Extrahiere aus dieser Instagram-Reel-Caption ein strukturiertes Rezept.
Account: ${username}

Caption:
${caption.slice(0, 8000)}

Antworte NUR mit einem JSON-Objekt, ohne Markdown-Backticks, ohne Erklärungen.
{
  "title": "Rezeptname",
  "subtitle": "Kurze Beschreibung oder leer",
  "servings": 4,
  "prepTime": 10,
  "cookTime": 20,
  "ingredients": [{ "name": "Zutat", "amount": "200", "unit": "g" }],
  "steps": "<p>Schritt 1</p><p>Schritt 2</p>",
  "confidence": "high"
}

Regeln:
- confidence ist "high" wenn Zutaten UND Zubereitung klar erkennbar sind, sonst "low"
- steps ist HTML mit <p> Tags; beginne die Schritte NICHT mit Nummerierungen wie "1." oder "Schritt 1:" (die App nummeriert selbst)
- Steht Text im Original KOMPLETT IN GROSSBUCHSTABEN (Titel, Untertitel, Zutaten oder Schritte), wandle ihn in normale Groß-/Kleinschreibung um (deutsche Rechtschreibung: Substantive groß)
- prepTime und cookTime sind Zahlen in Minuten
- Antworte ausschließlich mit dem JSON
${importDirectives().text}
`
    const result = await generateContent(prompt)
    const clean = result.replace(/```json|```/g, '').trim()
    const recipe = JSON.parse(clean)

    return {
        ...recipe,
        noRecipeFound: recipe.confidence === 'low' && (!recipe.ingredients?.length),
        description: caption,
        imageBase64,
        sourceUrl: url,
    }
}

