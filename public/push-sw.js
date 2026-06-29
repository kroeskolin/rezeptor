/* Rezeptor — Push-Handler.
   Wird via workbox.importScripts in den generierten Service Worker geladen.
   WICHTIG (iOS): bei JEDEM push MUSS eine sichtbare Notification erscheinen,
   sonst widerruft iOS nach wenigen stillen Pushes das Abo. Darum: JSON-Parse
   abgesichert, showNotification immer in event.waitUntil. */

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = {}
  }
  const title = data.title || 'Rezeptor'
  const options = {
    body: data.body || '',
    icon: '/rezeptor/pwa-192x192.png',
    badge: '/rezeptor/pwa-64x64.png',
    data: { url: data.url || '/rezeptor/' },
    tag: data.tag || undefined,
  }
  event.waitUntil((async () => {
    await self.registration.showNotification(title, options)
    if (typeof data.badgeCount === 'number' && self.navigator && self.navigator.setAppBadge) {
      try { await self.navigator.setAppBadge(data.badgeCount) } catch (e) { /* egal */ }
    }
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/rezeptor/'
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) {
      if (c.url.includes('/rezeptor/') && 'focus' in c) {
        await c.focus()
        if ('navigate' in c) { try { await c.navigate(target) } catch (e) { /* egal */ } }
        return
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target)
  })())
})
