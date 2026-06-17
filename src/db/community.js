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
} from 'firebase/firestore';

import { db } from './firebase';

// Ein lokales Rezept in die öffentliche Firestore-Sammlung hochladen.
// user = das eingeloggte Firebase-User-Objekt (aus useAuth)
export async function publishRecipe(recipe, user) {
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
        likeCount: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, 'recipes'), docData);
    return ref.id; // die neue Firestore-ID
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
        // Like setzen + Zähler +1
        batch.set(likeRef, { createdAt: serverTimestamp() });
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

// Einen Kommentar schreiben. Gibt das neue Kommentar-Objekt zurück.
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
    return ref.id;
}