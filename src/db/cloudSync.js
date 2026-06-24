// cloudSync.js — spiegelt lokale Rezepte/Tags in die Cloud (users/{uid}/…)
// Phase 2a: nur Push (Backup). Die App liest weiter lokal aus IndexedDB.
// Fotos werden nach Firebase Storage ausgelagert; im Dokument steht nur die URL.

import { db, storage, auth } from './firebase'
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { ref as storageRef, uploadString, getDownloadURL, deleteObject } from 'firebase/storage'

// Ein Rezept in die Cloud spiegeln. Fire-and-forget aufrufbar (Fehler werden geloggt).
export async function pushRecipeToCloud(recipe) {
    const user = auth.currentUser
    if (!user || !recipe?.cloudId) return

    // Foto: Base64 → Storage; bereits vorhandene URL direkt übernehmen
    let imageUrl = recipe.image || null
    if (recipe.image && recipe.image.startsWith('data:')) {
        try {
            const r = storageRef(storage, `users/${user.uid}/recipe-images/${recipe.cloudId}.jpg`)
            await uploadString(r, recipe.image, 'data_url')
            imageUrl = await getDownloadURL(r)
        } catch (e) {
            console.error('Foto-Upload (Cloud) fehlgeschlagen:', e)
            imageUrl = null
        }
    }

    // Lokalen Integer-Schlüssel nicht mit in die Cloud schreiben
    const { id, ...rest } = recipe
    await setDoc(doc(db, 'users', user.uid, 'recipes', recipe.cloudId), {
        ...rest,
        image: imageUrl,
        updatedAt: serverTimestamp(),
    })
}

export async function deleteRecipeFromCloud(cloudId) {
    const user = auth.currentUser
    if (!user || !cloudId) return
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'recipes', cloudId))
    } catch (e) { console.error('Cloud-Löschen fehlgeschlagen:', e) }
    try {
        await deleteObject(storageRef(storage, `users/${user.uid}/recipe-images/${cloudId}.jpg`))
    } catch (e) { /* evtl. kein Foto */ }
}

export async function pushTagToCloud(tag) {
    const user = auth.currentUser
    if (!user || !tag?.cloudId) return
    const { id, ...rest } = tag
    await setDoc(doc(db, 'users', user.uid, 'tags', tag.cloudId), {
        ...rest,
        updatedAt: serverTimestamp(),
    })
}

export async function deleteTagFromCloud(cloudId) {
    const user = auth.currentUser
    if (!user || !cloudId) return
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'tags', cloudId))
    } catch (e) { console.error('Cloud-Tag-Löschen fehlgeschlagen:', e) }
}
