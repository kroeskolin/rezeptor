import { auth, db } from './firebase'
import { collection, query, onSnapshot } from 'firebase/firestore'
import {
    pushRecipeToCloud, deleteRecipeFromCloud,
    pushTagToCloud, deleteTagFromCloud,
} from './cloudSync'

const DB_NAME = 'rezeptor'
const DB_VERSION = 3
const STORE_NAME = 'recipes'
const TAGS_STORE = 'tags'

// Stabile, geräteunabhängige ID (für die spätere Cloud-Sync).
// Der lokale Integer-Schlüssel (`id`) bleibt unverändert; `cloudId` ist die
// dauerhafte Identität eines Rezepts/Tags über Geräte hinweg.
export function newCloudId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

// Allen vorhandenen Einträgen eines Stores eine cloudId verpassen (einmalige Migration).
function backfillCloudId(store) {
    const req = store.openCursor()
    req.onsuccess = (e) => {
        const cursor = e.target.result
        if (!cursor) return
        const val = cursor.value
        if (val && !val.cloudId) {
            val.cloudId = newCloudId()
            cursor.update(val)
        }
        cursor.continue()
    }
}

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onupgradeneeded = (event) => {
            const db = event.target.result
            const tx = event.target.transaction // versionchange-Transaktion
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
                store.createIndex('title', 'title', { unique: false })
                store.createIndex('category', 'category', { unique: false })
                store.createIndex('createdAt', 'createdAt', { unique: false })
            }
            if (!db.objectStoreNames.contains(TAGS_STORE)) {
                db.createObjectStore(TAGS_STORE, { keyPath: 'id', autoIncrement: true })
            }
            // v3: bestehende Rezepte/Tags mit stabiler cloudId nachrüsten
            if (event.oldVersion < 3) {
                backfillCloudId(tx.objectStore(STORE_NAME))
                backfillCloudId(tx.objectStore(TAGS_STORE))
            }
        }

        request.onsuccess = (event) => resolve(event.target.result)
        request.onerror = (event) => reject(event.target.error)
    })
}

export async function getAllRecipes() {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

export async function addRecipe(recipe) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const newRecipe = {
            ...recipe,
            cloudId: recipe.cloudId || newCloudId(),
            favorite: false,
            createdAt: new Date().toISOString(),
            localUpdatedAt: Date.now(), // für den Sync: lokal ist ab jetzt neuer als die Cloud
        }
        const request = store.add(newRecipe)
        request.onsuccess = () => {
            if (auth.currentUser) pushRecipeToCloud(newRecipe).catch(() => { })
            resolve(request.result)
        }
        request.onerror = () => reject(request.error)
    })
}

export async function updateRecipe(recipe) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const stamped = { ...recipe, localUpdatedAt: Date.now() }
        const request = store.put(stamped)
        request.onsuccess = () => {
            if (auth.currentUser) pushRecipeToCloud(stamped).catch(() => { })
            resolve(request.result)
        }
        request.onerror = () => reject(request.error)
    })
}

export async function toggleFavorite(recipe) {
    return updateRecipe({ ...recipe, favorite: !recipe.favorite })
}

export async function deleteRecipe(id) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const getReq = store.get(id)
        getReq.onsuccess = () => {
            const cloudId = getReq.result?.cloudId
            const delReq = store.delete(id)
            delReq.onsuccess = () => {
                if (auth.currentUser && cloudId) deleteRecipeFromCloud(cloudId).catch(() => { })
                resolve()
            }
            delReq.onerror = () => reject(delReq.error)
        }
        getReq.onerror = () => reject(getReq.error)
    })
}

export async function exportRecipes() {
    const recipes = await getAllRecipes()
    const json = JSON.stringify(recipes, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const time = now.toTimeString().slice(0, 5).replace(':', '-')
    a.download = `rezeptor-export_${date}_${time}_rows${recipes.length}.json`
    a.click()
    URL.revokeObjectURL(url)
}

export async function importRecipes(jsonString) {
    const recipes = JSON.parse(jsonString)
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        recipes.forEach(recipe => {
            const withCloudId = { ...recipe, cloudId: recipe.cloudId || newCloudId() }
            if (withCloudId.id !== undefined) {
                store.put(withCloudId)
            } else {
                const { id, ...recipeWithoutId } = withCloudId
                store.add(recipeWithoutId)
            }
        })
        tx.oncomplete = () => resolve(recipes.length)
        tx.onerror = () => reject(tx.error)
    })
}

export async function getAllTags() {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TAGS_STORE, 'readonly')
        const store = tx.objectStore(TAGS_STORE)
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

export async function addTag(tag) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TAGS_STORE, 'readwrite')
        const store = tx.objectStore(TAGS_STORE)
        const newTag = { ...tag, cloudId: tag.cloudId || newCloudId(), localUpdatedAt: Date.now() }
        const request = store.add(newTag)
        request.onsuccess = () => {
            if (auth.currentUser) pushTagToCloud(newTag).catch(() => { })
            resolve(request.result)
        }
        request.onerror = () => reject(request.error)
    })
}

export async function deleteTag(id) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TAGS_STORE, 'readwrite')
        const store = tx.objectStore(TAGS_STORE)
        const getReq = store.get(id)
        getReq.onsuccess = () => {
            const cloudId = getReq.result?.cloudId
            const delReq = store.delete(id)
            delReq.onsuccess = () => {
                if (auth.currentUser && cloudId) deleteTagFromCloud(cloudId).catch(() => { })
                resolve()
            }
            delReq.onerror = () => reject(delReq.error)
        }
        getReq.onerror = () => reject(getReq.error)
    })
}

export async function updateTag(tag) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TAGS_STORE, 'readwrite')
        const store = tx.objectStore(TAGS_STORE)
        const stamped = { ...tag, localUpdatedAt: Date.now() }
        const request = store.put(stamped)
        request.onsuccess = () => {
            if (auth.currentUser) pushTagToCloud(stamped).catch(() => { })
            resolve(request.result)
        }
        request.onerror = () => reject(request.error)
    })
}

// Einmal pro Gerät: alle lokalen Rezepte/Tags in die Cloud sichern.
// Idempotent über ein localStorage-Flag (verhindert wiederholtes Hochspielen).
export async function backupAllToCloud() {
    const user = auth.currentUser
    if (!user) return
    const key = `rezeptor-backup-done-v2-${user.uid}`
    if (localStorage.getItem(key)) return
    let hadError = false
    try {
        const recipes = await getAllRecipes()
        for (const r of recipes) {
            try { await pushRecipeToCloud(r) } catch (e) { hadError = true; console.error('Backup-Push (Rezept):', e) }
        }
        const tags = await getAllTags()
        for (const t of tags) {
            try { await pushTagToCloud(t) } catch (e) { hadError = true; console.error('Backup-Push (Tag):', e) }
        }
    } catch (e) {
        hadError = true
        console.error('Cloud-Backup fehlgeschlagen:', e)
    }
    // Nur bei vollständigem Erfolg als „erledigt" markieren – sonst beim nächsten Mal erneut versuchen
    if (!hadError) localStorage.setItem(key, '1')
}

// Tag-Palette aus den in Rezepten verwendeten Tags ableiten/ergänzen.
// Namensbasierte cloudId → über Geräte hinweg dieselbe ID, keine Duplikate.
function tagSlug(s) {
    return (s || '').toLowerCase().trim().replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-|-$/g, '')
}
export async function ensurePaletteFromRecipes() {
    const recipes = await getAllRecipes()
    const existing = await getAllTags()
    const existingNames = new Set(existing.map(t => (t.name || '').toLowerCase().trim()))

    const byName = new Map()
    for (const r of recipes) {
        for (const t of (r.tags || [])) {
            const name = (t?.name || (typeof t === 'string' ? t : '')).trim()
            if (!name) continue
            const key = name.toLowerCase()
            if (!byName.has(key)) byName.set(key, { name, color: t?.color || null })
        }
    }
    for (const [key, tag] of byName) {
        if (existingNames.has(key)) continue
        const cloudId = 'tag-' + (tagSlug(tag.name) || key)
        try { await addTag({ ...tag, cloudId }) } catch (e) { console.error('Palette-Ableitung:', e) }
    }
}

// Eingehende Cloud-Änderungen in die lokale DB übernehmen — OHNE Re-Push.
// Additiv: neue Cloud-Einträge werden lokal angelegt, vorhandene (per cloudId)
// aktualisiert, echte Cloud-Löschungen lokal nachvollzogen.
function reconcileFromCloud(storeName, snap, onChange) {
    openDB().then(idb => {
        const tx = idb.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        const allReq = store.getAll()
        allReq.onsuccess = () => {
            const byCloudId = new Map(allReq.result.filter(r => r.cloudId).map(r => [r.cloudId, r]))
            snap.docChanges().forEach(change => {
                const cloudId = change.doc.id
                const local = byCloudId.get(cloudId)
                if (change.type === 'removed') {
                    if (local) store.delete(local.id)
                    return
                }
                // Firestore-Timestamp nicht lokal speichern (nicht klonbar)
                const { updatedAt, ...data } = change.doc.data()
                if (local) {
                    // Veralteter Cloud-Stand darf eine NEUERE lokale Änderung nie
                    // überschreiben (Race: Push läuft noch, Snapshot kommt mit altem
                    // Stand zurück → z.B. Favoriten-Herz sprang wieder zurück).
                    if (local.localUpdatedAt && data.localUpdatedAt &&
                        data.localUpdatedAt < local.localUpdatedAt) {
                        return
                    }
                    const merged = { ...local, ...data, cloudId, id: local.id }
                    // Lokales Base64-Foto behalten (offline-fähig), nicht durch URL ersetzen
                    if (local.image && String(local.image).startsWith('data:') &&
                        data.image && !String(data.image).startsWith('data:')) {
                        merged.image = local.image
                    }
                    store.put(merged)
                } else {
                    store.add({ ...data, cloudId })
                }
            })
        }
        tx.oncomplete = () => { if (onChange) onChange() }
        tx.onerror = () => console.error(`Sync-TX (${storeName}):`, tx.error)
    }).catch(e => console.error(`Sync (${storeName}):`, e))
}

// Live-Sync der Rezepte aus der Cloud in die lokale DB. Gibt unsubscribe zurück.
export function startRecipeSync(onChange) {
    const user = auth.currentUser
    if (!user) return () => { }
    const q = query(collection(db, 'users', user.uid, 'recipes'))
    return onSnapshot(q,
        (snap) => reconcileFromCloud(STORE_NAME, snap, onChange),
        (err) => console.error('Recipe-Sync:', err))
}

// Live-Sync der Tags.
export function startTagSync(onChange) {
    const user = auth.currentUser
    if (!user) return () => { }
    const q = query(collection(db, 'users', user.uid, 'tags'))
    return onSnapshot(q,
        (snap) => reconcileFromCloud(TAGS_STORE, snap, onChange),
        (err) => console.error('Tag-Sync:', err))
}
