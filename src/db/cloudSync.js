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

    // Lokalen Integer-Schlüssel + image getrennt behandeln
    const { id, image, ...rest } = recipe
    const data = { ...rest, updatedAt: serverTimestamp() }

    if (image && image.startsWith('data:')) {
        // Base64 → Storage. Schlägt der Upload FEHL, wird image NICHT geschrieben
        // (merge) → vorhandenes Cloud-Bild bleibt erhalten, statt es zu löschen.
        try {
            const r = storageRef(storage, `users/${user.uid}/recipe-images/${recipe.cloudId}.jpg`)
            await uploadString(r, image, 'data_url')
            data.image = await getDownloadURL(r)
        } catch (e) {
            console.error('Foto-Upload (Cloud) fehlgeschlagen — Bild bleibt unverändert:', e)
        }
    } else if (image) {
        data.image = image // bereits eine URL
    } else {
        data.image = null // Nutzer hat das Bild wirklich entfernt
    }

    // merge:true, damit ausgelassene Felder (z.B. image bei Upload-Fehler) erhalten bleiben
    await setDoc(doc(db, 'users', user.uid, 'recipes', recipe.cloudId), data, { merge: true })
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
