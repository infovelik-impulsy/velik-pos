// Limpiar todos los cachés y desregistrar el SW al instalar
self.addEventListener('install', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.registration.unregister())
  )
})

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'Velik Beauty House'
  const options = {
    body: data.body || 'Tienes una nueva cita',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'velik-cita',
    requireInteraction: true,
    data: { url: data.url || '/' }
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'))
})
