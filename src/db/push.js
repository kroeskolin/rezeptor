import { auth, db } from './firebase'
import { doc, setDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY

export const DEFAULT_PUSH_PREFS = { newRecipes: true, comments: true, likes: true }

export function pushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

export function isStandalone() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || window.navigator.standalone === true
}

export function isIOS() {
  const ua = navigator.userAgent || ''
  return /iphone|ipad|ipod/i.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// Kurze, stabile Doc-ID pro Endpoint (= pro Gerät)
async function subKey(endpoint) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return Array.from(new Uint8Array(buf)).slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function isPushEnabled() {
  if (!pushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return !!sub && Notification.permission === 'granted'
  } catch { return false }
}

// Aktiviert Push (muss aus einer echten Nutzergeste aufgerufen werden!)
export async function enablePush() {
  if (!pushSupported()) throw new Error('Dein Gerät unterstützt keine Push-Nachrichten.')
  // Auf iOS funktioniert Push NUR in der installierten Homescreen-App.
  if (isIOS() && !isStandalone()) throw new Error('Bitte füge Rezeptor erst zum Home-Bildschirm hinzu — auf dem iPhone gibt es Push nur in der installierten App.')
  if (!VAPID_PUBLIC) throw new Error('Push ist noch nicht eingerichtet (VAPID-Schlüssel fehlt).')
  const user = auth.currentUser
  if (!user) throw new Error('Bitte melde dich erst an.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Benachrichtigungen wurden nicht erlaubt.')

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    })
  }
  const json = sub.toJSON()
  const key = await subKey(json.endpoint)
  await setDoc(doc(db, 'users', user.uid, 'pushSubscriptions', key), {
    endpoint: json.endpoint,
    keys: json.keys,
    createdAt: serverTimestamp(),
    ua: (navigator.userAgent || '').slice(0, 200),
  })
  // Vorlieben anlegen, falls noch keine da sind
  await ensurePushPrefs()
  return true
}

export async function disablePush() {
  try {
    const user = auth.currentUser
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      const key = await subKey(sub.toJSON().endpoint)
      if (user) await deleteDoc(doc(db, 'users', user.uid, 'pushSubscriptions', key)).catch(() => {})
      await sub.unsubscribe().catch(() => {})
    }
    if (navigator.clearAppBadge) await navigator.clearAppBadge().catch(() => {})
  } catch { /* best effort */ }
}

export async function getPushPrefs() {
  const user = auth.currentUser
  if (!user) return { ...DEFAULT_PUSH_PREFS }
  try {
    const snap = await getDoc(doc(db, 'users', user.uid))
    return { ...DEFAULT_PUSH_PREFS, ...(snap.data()?.pushPrefs || {}) }
  } catch { return { ...DEFAULT_PUSH_PREFS } }
}

export async function savePushPrefs(prefs) {
  const user = auth.currentUser
  if (!user) return
  await setDoc(doc(db, 'users', user.uid), { pushPrefs: prefs }, { merge: true }).catch(() => {})
}

async function ensurePushPrefs() {
  const user = auth.currentUser
  if (!user) return
  const snap = await getDoc(doc(db, 'users', user.uid)).catch(() => null)
  if (!snap || !snap.data()?.pushPrefs) {
    await savePushPrefs({ ...DEFAULT_PUSH_PREFS })
  }
}
