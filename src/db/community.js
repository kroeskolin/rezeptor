import {
    collection,
    addDoc,
    setDoc,
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
    onSnapshot,
    Timestamp,
} from 'firebase/firestore';

// Geteilte Rezepte/Kurzlinks laufen nach 90 Tagen ab (Firestore-TTL auf expiresAt).
const SHARE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

// Nur dieses Konto darf Rezeptor-News posten. Die harte Absicherung liegt in den
// Firestore-Regeln (gleiche UID) — hier steuert sie nur die Sichtbarkeit des Buttons.
export const ADMIN_UID = '7Bx3RyxhHifK6f8r4n2RJ9hSYHp2';

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

// Rezeptor-News (Beitrag ohne Rezept) posten — nur fürs Admin-Konto; die
// Firestore-Regel weist alle anderen ab. Liegt in derselben recipes-Sammlung,
// damit Likes/Kommentare/Aktivitäten/Push ohne Extra-Infrastruktur funktionieren.
export async function postAnnouncement(user, title, text) {
    if (!user) throw new Error('Nicht eingeloggt');
    const ref = await addDoc(collection(db, 'recipes'), {
        type: 'announcement',
        authorId: user.uid,
        authorName: user.displayName || 'Rezeptor',
        title: (title || '').trim(),
        caption: (text || '').trim(),
        likeCount: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
    });
    return ref.id;
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

// ── Live-Listener (onSnapshot). Geben jeweils eine unsubscribe-Funktion zurück. ──

// Feed live: neue Rezepte + geänderte Like-/Kommentarzähler erscheinen sofort.
export function listenFeed(callback) {
    const q = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'));
    return onSnapshot(
        q,
        (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error('Feed-Listener fehlgeschlagen:', err)
    );
}

// Kommentare eines Rezepts live (neueste zuerst).
export function listenComments(recipeId, callback) {
    const q = query(collection(db, 'recipes', recipeId, 'comments'), orderBy('createdAt', 'desc'));
    return onSnapshot(
        q,
        (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error('Kommentar-Listener fehlgeschlagen:', err)
    );
}

// Ein einzelnes Rezept-Dokument live (für Like-/Kommentarzähler in der Detailansicht).
export function listenRecipe(recipeId, callback) {
    return onSnapshot(
        doc(db, 'recipes', recipeId),
        (snap) => { if (snap.exists()) callback({ id: snap.id, ...snap.data() }); },
        (err) => console.error('Rezept-Listener fehlgeschlagen:', err)
    );
}

// Rezept zum Teilen ablegen (eigene `shared`-Sammlung).
// Die Kurzlink-ID wird SOFORT (ohne Netzwerk) erzeugt, damit navigator.share noch in
// der Nutzergeste aufgerufen werden kann; das Speichern läuft im Hintergrund (`done`).
// Erfordert Login.
export function shareRecipe(recipe, user) {
    if (!user) throw new Error('Nicht eingeloggt');

    const ref = doc(collection(db, 'shared')); // ID lokal erzeugt
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
        expiresAt: Timestamp.fromMillis(Date.now() + SHARE_TTL_MS), // Firestore-TTL löscht danach
    };

    const done = (async () => {
        // Foto ZUERST hochladen, dann genau EIN setDoc mit Bild-URL.
        // (kein nachträgliches updateDoc → die shared-Regel braucht nur `create`)
        let imageUrl = null;
        if (recipe.image) {
            if (recipe.image.startsWith('data:')) {
                try {
                    const imgRef = storageRef(storage, `shared/${ref.id}.jpg`);
                    await uploadString(imgRef, recipe.image, 'data_url');
                    imageUrl = await getDownloadURL(imgRef);
                } catch (e) {
                    console.error('Foto-Upload (Teilen) fehlgeschlagen:', e); // ohne Foto weiter
                }
            } else {
                imageUrl = recipe.image;
            }
        }
        await setDoc(ref, { ...docData, image: imageUrl });
    })();

    return { id: ref.id, done };
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
                    recipeId: rid, recipeTitle: rec.title || '', recipeType: rec.type || 'recipe',
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
                    recipeId: rid, recipeTitle: rec.title || '', recipeType: rec.type || 'recipe',
                    actorName: d.authorName || 'Jemand', actorId: d.authorId,
                    text: d.text || '', createdAtMs: ms(d.createdAt),
                });
            });
        } else {
            // Fremdes Rezept → neuer Beitrag als Aktivität (macht auf die Community aufmerksam)
            activities.push({
                id: `newpost_${rid}`, type: 'newpost',
                recipeId: rid, recipeTitle: rec.title || '', recipeType: rec.type || 'recipe',
                actorName: rec.authorName || 'Jemand', actorId: rec.authorId,
                createdAtMs: ms(rec.createdAt),
            });
            // … und weitere Kommentare, falls ICH dort kommentiert habe
            const comSnap = await getDocs(collection(db, 'recipes', rid, 'comments'));
            const iCommented = comSnap.docs.some((c) => c.data().authorId === me);
            if (iCommented) {
                comSnap.forEach((c) => {
                    const d = c.data();
                    if (d.authorId === me) return; // eigener Kommentar
                    activities.push({
                        id: `cocomment_${rid}_${c.id}`, type: 'cocomment',
                        recipeId: rid, recipeTitle: rec.title || '', recipeType: rec.type || 'recipe',
                        actorName: d.authorName || 'Jemand', actorId: d.authorId,
                        text: d.text || '', createdAtMs: ms(d.createdAt),
                    });
                });
            }
        }
    }

    activities.sort((a, b) => b.createdAtMs - a.createdAtMs);
    return activities;
}
// ── Rezepte privat verschicken (Posteingang) ──

// Nur der Vorname wird angezeigt/gespeichert (Datenschutz).
export const firstName = (name) => (name || '').trim().split(/\s+/)[0] || 'Unbekannt';

// Fremde Rezepte (Kurzlink/Posteingang) absichern: nur unbedenkliche Bild-URLs
// zulassen (https / data:image) — verhindert präparierte image-Werte.
export function sanitizeForeignRecipe(recipe) {
    if (!recipe) return recipe;
    const img = recipe.image;
    const ok = typeof img === 'string' && (/^https:\/\//i.test(img) || /^data:image\//i.test(img));
    return ok ? recipe : { ...recipe, image: null };
}

// Alle Community-Mitglieder (für die Empfänger-Auswahl).
export async function getAllUsers() {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Rezept privat an einen Nutzer senden (optional mit kurzem Begleittext).
// Der Rezept-Inhalt (inkl. Foto) liegt als shared-Doc (bewährter Kurzlink-
// Mechanismus); der Posteingang des Empfängers bekommt nur einen Verweis.
export async function sendRecipeToUser(recipe, fromUser, toUid, message = '') {
    if (!fromUser) throw new Error('Nicht eingeloggt');
    const { id, done } = shareRecipe(recipe, fromUser);
    await done; // shared-Doc muss existieren, bevor der Verweis entsteht
    await setDoc(doc(db, 'users', toUid, 'inbox', id), {
        type: 'recipe',
        sharedId: id,
        fromUid: fromUser.uid,
        fromName: firstName(fromUser.displayName),
        title: recipe.title || '',
        message: (message || '').trim().slice(0, 200),
        createdAt: serverTimestamp(),
    });
}

// „Danke!" an den Absender zurückschicken (landet in dessen Aktivitäten).
export async function sendThanks(user, item) {
    if (!user || !item?.fromUid) return;
    const ref = doc(collection(db, 'users', item.fromUid, 'inbox'));
    await setDoc(ref, {
        type: 'thanks',
        fromUid: user.uid,
        fromName: firstName(user.displayName),
        title: item.title || '',
        createdAt: serverTimestamp(),
    });
}

// Eigenen Posteingangs-Eintrag als „bedankt" markieren (Button-Zustand merken).
export async function markInboxThanked(user, itemId) {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'inbox', itemId), { thanked: true });
}

// Posteingang live beobachten (neueste zuerst).
export function listenInbox(user, callback) {
    if (!user) return () => { };
    const q = query(collection(db, 'users', user.uid, 'inbox'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => callback([]));
}

// Eintrag aus dem eigenen Posteingang entfernen (nach Import oder Ablehnen).
export async function deleteInboxItem(user, itemId) {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'inbox', itemId));
}
