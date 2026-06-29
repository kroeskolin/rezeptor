/* Rezeptor — Cloud Functions für echte Push-Nachrichten (Web Push / VAPID).
   Löst bei Community-Ereignissen aus und verschickt an die Geräte der Empfänger,
   sofern diese den jeweiligen Push-Typ in den Einstellungen aktiviert haben. */

const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { defineSecret } = require('firebase-functions/params')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const webpush = require('web-push')

initializeApp()
const db = getFirestore()

// WICHTIG: REGION muss zur Region deiner Firestore-Datenbank passen!
// Firebase Console → Firestore Database → oben steht die Region (z.B. eur3,
// europe-west1, europe-west3, nam5). Bei Deploy-Fehler "location" hier anpassen.
const REGION = 'europe-west3'

const VAPID_PUBLIC = defineSecret('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE = defineSecret('VAPID_PRIVATE_KEY')
const VAPID_SUBJECT = defineSecret('VAPID_SUBJECT')
const secrets = [VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT]

function configureWebpush() {
  webpush.setVapidDetails(VAPID_SUBJECT.value(), VAPID_PUBLIC.value(), VAPID_PRIVATE.value())
}

// Default: alle Typen an, solange der Nutzer nichts Abweichendes gespeichert hat.
function prefAllows(userData, key) {
  const p = userData && userData.pushPrefs
  if (!p) return true
  return p[key] !== false
}

// An alle Geräte (Subscriptions) eines Nutzers senden; tote (404/410) aufräumen.
async function sendToUser(uid, payload) {
  const subsSnap = await db.collection('users').doc(uid).collection('pushSubscriptions').get()
  await Promise.all(subsSnap.docs.map(async (d) => {
    const s = d.data()
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload))
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await d.ref.delete().catch(() => {})
      } else {
        console.error('Push-Fehler für', uid, e.statusCode || e.message)
      }
    }
  }))
}

// 1) Neues Community-Rezept → alle anderen Nutzer (mit newRecipes-Pref)
exports.onNewRecipe = onDocumentCreated(
  { document: 'recipes/{id}', region: REGION, secrets },
  async (event) => {
    const snap = event.data
    if (!snap) return
    const r = snap.data()
    configureWebpush()
    const payload = {
      title: `Neues Rezept von ${r.authorName || 'jemandem'}`,
      body: r.title || '',
      url: '/rezeptor/',
      tag: `recipe-${event.params.id}`,
    }
    const usersSnap = await db.collection('users').get()
    const targets = usersSnap.docs.filter(
      (d) => d.id !== r.authorId && prefAllows(d.data(), 'newRecipes')
    )
    await Promise.all(targets.map((d) => sendToUser(d.id, payload)))
  }
)

// 2) Like → Autor des Rezepts (mit likes-Pref), nicht an sich selbst
exports.onNewLike = onDocumentCreated(
  { document: 'recipes/{recipeId}/likes/{likeId}', region: REGION, secrets },
  async (event) => {
    const snap = event.data
    if (!snap) return
    const like = snap.data()
    const recipeSnap = await db.collection('recipes').doc(event.params.recipeId).get()
    if (!recipeSnap.exists) return
    const r = recipeSnap.data()
    if (!r.authorId || r.authorId === like.authorId) return
    const authorSnap = await db.collection('users').doc(r.authorId).get()
    if (!prefAllows(authorSnap.data(), 'likes')) return
    configureWebpush()
    await sendToUser(r.authorId, {
      title: `${like.authorName || 'Jemand'} gefällt dein Rezept`,
      body: r.title || '',
      url: '/rezeptor/',
      tag: `like-${event.params.recipeId}`,
    })
  }
)

// 3) Kommentar → Autor des Rezepts (mit comments-Pref), nicht an sich selbst
exports.onNewComment = onDocumentCreated(
  { document: 'recipes/{recipeId}/comments/{commentId}', region: REGION, secrets },
  async (event) => {
    const snap = event.data
    if (!snap) return
    const c = snap.data()
    const recipeSnap = await db.collection('recipes').doc(event.params.recipeId).get()
    if (!recipeSnap.exists) return
    const r = recipeSnap.data()
    if (!r.authorId || r.authorId === c.authorId) return
    const authorSnap = await db.collection('users').doc(r.authorId).get()
    if (!prefAllows(authorSnap.data(), 'comments')) return
    configureWebpush()
    const text = (c.text || '').slice(0, 80)
    await sendToUser(r.authorId, {
      title: `${c.authorName || 'Jemand'} hat kommentiert`,
      body: text ? `„${text}" – ${r.title || ''}` : (r.title || ''),
      url: '/rezeptor/',
      tag: `comment-${event.params.recipeId}`,
    })
  }
)
