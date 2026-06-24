import { auth } from './firebase'
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
            createdAt: new Date().toISOString()
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
        const request = store.put(recipe)
        request.onsuccess = () => {
            if (auth.currentUser) pushRecipeToCloud(recipe).catch(() => { })
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
        const newTag = { ...tag, cloudId: tag.cloudId || newCloudId() }
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
        const request = store.put(tag)
        request.onsuccess = () => {
            if (auth.currentUser) pushTagToCloud(tag).catch(() => { })
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
