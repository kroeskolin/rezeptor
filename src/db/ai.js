const WORKER_URL = 'https://rezeptor-proxy.brr-kroeske.workers.dev'

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
- steps ist HTML mit <p> Tags
- Wenn eine Mengenangabe fehlt oder unklar ist (z.B. "etwas", "nach Gefühl", "ein bisschen"), schätze eine sinnvolle typische Menge für die angegebene Personenzahl und markiere sie mit "ca." im amount Feld, z.B. "ca. 2"
- Nur wenn wirklich keine sinnvolle Schätzung möglich ist, schreibe "nach Geschmack" als unit und lasse amount leer
- Antworte ausschließlich mit dem JSON

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
                        return parseJsonLdRecipe(recipeData)
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

    const ingredients = (data.recipeIngredient || []).map(ing => {
        const match = ing.match(/^([\d\/\.,\s¼½¾⅓⅔⅛]+)?\s*([a-zA-ZäöüÄÖÜg]+\.)?\s*(.+)$/)
        return {
            amount: match?.[1]?.trim() || '',
            unit: match?.[2]?.trim().replace('.', '') || '',
            name: match?.[3]?.trim() || ing,
        }
    })

    const instructions = data.recipeInstructions || []
    const steps = instructions.map(step => {
        const text = typeof step === 'string' ? step : step.text || ''
        return `<p>${text}</p>`
    }).join('')

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
    "subtitle": "Kurze Beschreibung oder leer",
    "servings": 4,
    "prepTime": 10,
    "cookTime": 20,
    "ingredients": [{ "name": "Zutat", "amount": "200", "unit": "g" }],
    "steps": "<p>Schritt 1</p><p>Schritt 2</p>"
  }
]

Regeln:
- Lies den GESAMTEN Text aller Bilder
- steps ist HTML mit <p> Tags
- prepTime und cookTime sind Zahlen in Minuten
- Wenn eine Zutat sowohl eine Stückangabe als auch ein Gewicht in Klammern hat (z.B. "½ kleiner Radicchio (50g)"), nimm die Stückangabe als amount und unit, und lass das Gewicht in Klammern weg. Beispiel: amount: "½", unit: "Stück", name: "kleiner Radicchio"
- Bruchzahlen wie ½, ¼, ⅓ immer als Unicode-Zeichen übernehmen, nicht als Dezimalzahl umrechnen
- Antworte ausschließlich mit dem JSON-Array`
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

    // Videoseite über Worker laden
    const proxyUrl = `https://rezeptor-proxy.brr-kroeske.workers.dev/fetch?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
    )}`
    const response = await fetch(proxyUrl)
    const html = await response.text()

    // Titel aus <title>-Tag
    const titleMatch = html.match(/<title>([^<]*)<\/title>/)
    const pageTitle = titleMatch?.[1]?.replace(' - YouTube', '').trim() || ''

    // Beschreibung
    let description = ''
    const descMatch = html.match(/"description":\{"simpleText":"([\s\S]*?)"\}/)
    console.log('HTML length:', html.length)
    console.log('HTML snippet:', html.slice(0, 2000))
    console.log('contains shortDescription:', html.includes('shortDescription'))
    console.log('contains "description":{"simpleText"', html.includes('"description":{"simpleText"'))
    if (descMatch) {
        description = descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
    }
    if (!description) {
        const shortMatch = html.match(/"shortDescription":"([\s\S]*?)",\s*"isCrawlable"/)
        if (shortMatch) {
            description = shortMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
        }
    }

    console.log('YT description:', description)

    // Thumbnail
    let imageBase64 = null
    try {
        const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        const imgProxy = `https://rezeptor-proxy.brr-kroeske.workers.dev/?url=${encodeURIComponent(thumbUrl)}`
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
            description, // für "Trotzdem versuchen" mit der Beschreibung
            topComments, // falls wir später auch das anbieten wollen
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
- steps ist HTML mit <p> Tags
- prepTime und cookTime sind Zahlen in Minuten
- Antworte ausschließlich mit dem JSON
`
    const result = await generateContent(prompt)
    const clean = result.replace(/```json|```/g, '').trim()
    const recipe = JSON.parse(clean)

    return {
        ...recipe,
        noRecipeFound: recipe.confidence === 'low' && (!recipe.ingredients?.length),
        description, // falls "Trotzdem versuchen" trotzdem noch gebraucht wird
        imageBase64,
        sourceUrl: url,
    }
}