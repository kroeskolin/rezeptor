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
        const trimmed = text.slice(0, 40000)
        return await extractRecipeFromText(trimmed)
    } catch (error) {
        console.error('Detaillierter Fehler:', error)
        throw new Error('URL konnte nicht geladen werden.')
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