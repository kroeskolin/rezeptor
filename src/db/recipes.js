const DB_NAME = 'rezeptor'
const DB_VERSION = 2
const STORE_NAME = 'recipes'
const TAGS_STORE = 'tags'

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onupgradeneeded = (event) => {
            const db = event.target.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
                store.createIndex('title', 'title', { unique: false })
                store.createIndex('category', 'category', { unique: false })
                store.createIndex('createdAt', 'createdAt', { unique: false })
            }
            if (!db.objectStoreNames.contains(TAGS_STORE)) {
                db.createObjectStore(TAGS_STORE, { keyPath: 'id', autoIncrement: true })
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
            favorite: false,
            createdAt: new Date().toISOString()
        }
        const request = store.add(newRecipe)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

export async function updateRecipe(recipe) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.put(recipe)
        request.onsuccess = () => resolve(request.result)
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
        const request = store.delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
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
            if (recipe.id !== undefined) {
                store.put(recipe)
            } else {
                const { id, ...recipeWithoutId } = recipe
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
        const request = store.add(tag)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

export async function deleteTag(id) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TAGS_STORE, 'readwrite')
        const store = tx.objectStore(TAGS_STORE)
        const request = store.delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}

export async function updateTag(tag) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TAGS_STORE, 'readwrite')
        const store = tx.objectStore(TAGS_STORE)
        const request = store.put(tag)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}
