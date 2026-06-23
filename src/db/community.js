import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    query,
    orderBy,
    serverTimestamp,
    writeBatch,
    increment,
    updateDoc,
    deleteDoc,
} from 'firebase/firestore';

import { ref as storageRef, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';

import { db, storage } from './firebase';

// Ein lokales Rezept in die öffentliche Firestore-Sammlung hochladen.
// user = das eingeloggte Firebase-User-Objekt (aus useAuth)
export async function publishRecipe(recipe, user, caption = '') {
    if (!user) throw new Error('Nicht eingeloggt');

    const docData = {
        authorId: user.uid,
        authorName: user.displayName || 'Unbekannt',
        caption: (caption || '').trim(),
        title: recipe.title || '',
        subtitle: recipe.subtitle || '',
        servings: Number(recipe.servings) || 0,
        prepTime: Number(recipe.prepTime) || 0,
        cookTime: Number(recipe.cookTime) || 0,
        ingredients: recipe.ingredients || [],
        steps: recipe.steps || '',
        tags: recipe.tags || [],
        image: null,
        likeCount: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, 'recipes'), docData);

    // Foto verarbeiten (optional – Rezept bleibt auch ohne Bild veröffentlicht)
    let photoError = null;
    if (recipe.image) {
        if (recipe.image.startsWith('data:')) {
            // Lokales Foto (Base64) → in Firebase Storage hochladen, URL nachtragen
            try {
                const imgRef = storageRef(storage, `community/${ref.id}.jpg`);
                await uploadString(imgRef, recipe.image, 'data_url');
                const url = await getDownloadURL(imgRef);
                await updateDoc(ref, { image: url });
            } catch (e) {
                console.error('Foto-Upload fehlgeschlagen:', e);
                photoError = e?.code || e?.message || 'Unbekannter Fehler';
            }
        } else {
            // Bereits eine URL (z. B. importiert oder aus der Community) → direkt übernehmen
            try {
                await updateDoc(ref, { image: recipe.image });
            } catch (e) {
                console.error('Foto-Übernahme fehlgeschlagen:', e);
                photoError = e?.code || e?.message || 'Unbekannter Fehler';
            }
        }
    }

    return { id: ref.id, photoError };
}

// Alle veröffentlichten Rezepte laden, neueste zuerst.
export async function getFeed() {
    const q = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Prüfen, ob der aktuelle User dieses Rezept schon geliked hat.
export async function hasLiked(recipeId, userId) {
    if (!userId) return false;
    const likeRef = doc(db, 'recipes', recipeId, 'likes', userId);
    const snap = await getDoc(likeRef);
    return snap.exists();
}

// Like an/aus schalten. Gibt den neuen Zustand zurück: true = jetzt geliked.
export async function toggleLike(recipeId, user) {
    if (!user) throw new Error('Nicht eingeloggt');

    const recipeRef = doc(db, 'recipes', recipeId);
    const likeRef = doc(db, 'recipes', recipeId, 'likes', user.uid);
    const alreadyLiked = await hasLiked(recipeId, user.uid);

    const batch = writeBatch(db);

    if (alreadyLiked) {
        // Like entfernen + Zähler -1
        batch.delete(likeRef);
        batch.update(recipeRef, { likeCount: increment(-1) });
    } else {
        // Like setzen + Zähler +1 (Name mitspeichern für Aktivitäten)
        batch.set(likeRef, {
            authorId: user.uid,
            authorName: user.displayName || 'Unbekannt',
            createdAt: serverTimestamp(),
        });
        batch.update(recipeRef, { likeCount: increment(1) });
    }

    await batch.commit();
    return !alreadyLiked; // neuer Zustand
}

// Alle Kommentare eines Rezepts laden, neueste zuerst.
export async function getComments(recipeId) {
    const q = query(
        collection(db, 'recipes', recipeId, 'comments'),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Einen Kommentar schreiben. Gibt die neue Kommentar-ID zurück.
export async function addComment(recipeId, text, user) {
    if (!user) throw new Error('Nicht eingeloggt');
    const clean = (text || '').trim();
    if (!clean) throw new Error('Kommentar ist leer');

    const ref = await addDoc(collection(db, 'recipes', recipeId, 'comments'), {
        authorId: user.uid,
        authorName: user.displayName || 'Unbekannt',
        text: clean,
        createdAt: serverTimestamp(),
    });
    // Zähler best-effort hochzählen (kritisch ist nur der Kommentar selbst)
    try {
        await updateDoc(doc(db, 'recipes', recipeId), { commentCount: increment(1) });
    } catch (e) { /* Zähler nicht kritisch */ }
    return ref.id;
}

// Einen eigenen Kommentar löschen.
export async function deleteComment(recipeId, commentId, user) {
    if (!user) throw new Error('Nicht eingeloggt');
    await deleteDoc(doc(db, 'recipes', recipeId, 'comments', commentId));
    // Zähler best-effort runterzählen
    try {
        await updateDoc(doc(db, 'recipes', recipeId), { commentCount: increment(-1) });
    } catch (e) { /* Zähler nicht kritisch */ }
}

// Ein eigenes Rezept aus der Community löschen.
// (Unter-Sammlungen likes/comments bleiben verwaist – für diese App ok.)
export async function deleteRecipe(recipeId, user) {
    if (!user) throw new Error('Nicht eingeloggt');
    await deleteDoc(doc(db, 'recipes', recipeId));
    // Zugehöriges Foto best-effort aus dem Storage löschen
    try {
        await deleteObject(storageRef(storage, `community/${recipeId}.jpg`));
    } catch (e) { /* evtl. kein Foto vorhanden */ }
}

// Ein einzelnes Community-Rezept per ID laden (Fallback fürs Öffnen aus Aktivitäten).
export async function getRecipeById(recipeId) {
    const snap = await getDoc(doc(db, 'recipes', recipeId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Rezept zum Teilen ablegen (eigene `shared`-Sammlung) und Kurzlink-ID zurückgeben.
// Inkl. Foto via Storage. Erfordert Login.
export async function createSharedRecipe(recipe, user) {
    if (!user) throw new Error('Nicht eingeloggt');

    const docData = {
        authorId: user.uid,
        authorName: user.displayName || 'Unbekannt',
        title: recipe.title || '',
        subtitle: recipe.subtitle || '',
        servings: Number(recipe.servings) || 0,
        prepTime: Number(recipe.prepTime) || 0,
        cookTime: Number(recipe.cookTime) || 0,
        ingredients: recipe.ingredients || [],
        steps: recipe.steps || '',
        tags: recipe.tags || [],
        source: recipe.source || '',
        image: null,
        createdAt: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, 'shared'), docData);

    if (recipe.image) {
        if (recipe.image.startsWith('data:')) {
            try {
                const imgRef = storageRef(storage, `shared/${ref.id}.jpg`);
                await uploadString(imgRef, recipe.image, 'data_url');
                const url = await getDownloadURL(imgRef);
                await updateDoc(ref, { image: url });
            } catch (e) {
                console.error('Foto-Upload (Teilen) fehlgeschlagen:', e);
            }
        } else {
            try { await updateDoc(ref, { image: recipe.image }); } catch (e) { /* optional */ }
        }
    }

    return ref.id;
}

// Geteiltes Rezept per Kurzlink-ID laden.
export async function getSharedRecipe(id) {
    const snap = await getDoc(doc(db, 'shared', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Aktivitäten zum eingeloggten Nutzer sammeln:
//  - Likes & Kommentare auf meinen Rezepten
//  - weitere Kommentare auf Rezepten, die ich kommentiert habe (nicht meine)
// Liest die Rezepte direkt (keine collectionGroup) → kein Extra-Index, keine Extra-Regel.
// Gibt eine flache Liste zurück, neueste zuerst.
export async function getActivities(user) {
    if (!user) return [];
    const me = user.uid;
    const activities = [];
    const ms = (ts) => ts?.toMillis?.() ?? 0;

    const recipesSnap = await getDocs(query(collection(db, 'recipes'), orderBy('createdAt', 'desc')));

    for (const recDoc of recipesSnap.docs) {
        const rec = recDoc.data();
        const rid = recDoc.id;

        if (rec.authorId === me) {
            // Mein Rezept → Likes + Kommentare anderer
            const likesSnap = await getDocs(collection(db, 'recipes', rid, 'likes'));
            likesSnap.forEach((l) => {
                if (l.id === me) return; // eigener Like
                const d = l.data();
                activities.push({
                    id: `like_${rid}_${l.id}`, type: 'like',
                    recipeId: rid, recipeTitle: rec.title || '',
                    actorName: d.authorName || 'Jemand', actorId: l.id,
                    createdAtMs: ms(d.createdAt),
                });
            });

            const comSnap = await getDocs(collection(db, 'recipes', rid, 'comments'));
            comSnap.forEach((c) => {
                const d = c.data();
                if (d.authorId === me) return; // eigener Kommentar
                activities.push({
                    id: `comment_${rid}_${c.id}`, type: 'comment',
                    recipeId: rid, recipeTitle: rec.title || '',
                    actorName: d.authorName || 'Jemand', actorId: d.authorId,
                    text: d.text || '', createdAtMs: ms(d.createdAt),
                });
            });
        } else {
            // Fremdes Rezept → nur relevant, wenn ICH dort kommentiert habe
            const comSnap = await getDocs(collection(db, 'recipes', rid, 'comments'));
            const iCommented = comSnap.docs.some((c) => c.data().authorId === me);
            if (!iCommented) continue;
            comSnap.forEach((c) => {
                const d = c.data();
                if (d.authorId === me) return; // eigener Kommentar
                activities.push({
                    id: `cocomment_${rid}_${c.id}`, type: 'cocomment',
                    recipeId: rid, recipeTitle: rec.title || '',
                    actorName: d.authorName || 'Jemand', actorId: d.authorId,
                    text: d.text || '', createdAtMs: ms(d.createdAt),
                });
            });
        }
    }

    activities.sort((a, b) => b.createdAtMs - a.createdAtMs);
    return activities;
}