// Import-Vorlieben: bevorzugte Sprache + Einheitensystem (lokal pro Gerät).

const KEY = 'rezeptor-import-prefs'

export const LANGUAGES = [
    { id: 'de', label: 'Deutsch' },
    { id: 'en', label: 'Englisch' },
    { id: 'fr', label: 'Französisch' },
    { id: 'it', label: 'Italienisch' },
    { id: 'es', label: 'Spanisch' },
]

export const UNIT_SYSTEMS = [
    { id: 'metric', label: 'Metrisch (g, ml)' },
    { id: 'us', label: 'US-amerikanisch (cups)' },
]

export const DEFAULT_IMPORT_PREFS = {
    language: 'de',
    translate: false, // Rezepte anderer Sprachen automatisch übersetzen
    units: 'metric',
    convert: false,   // abweichende Einheiten automatisch konvertieren
}

export function getImportPrefs() {
    try {
        return { ...DEFAULT_IMPORT_PREFS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }
    } catch {
        return { ...DEFAULT_IMPORT_PREFS }
    }
}

export function saveImportPrefs(prefs) {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch { /* voll/privat */ }
}

export const languageLabel = (id) => LANGUAGES.find(l => l.id === id)?.label || 'Deutsch'
export const unitsLabel = (id) => UNIT_SYSTEMS.find(u => u.id === id)?.label || 'Metrisch'
