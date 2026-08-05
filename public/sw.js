/* Service worker de NoResa — VOLONTAIREMENT limité au push.
   Aucun handler `fetch` : rien n'est mis en cache, donc l'app charge toujours
   la dernière version en ligne (pas de bundle périmé après un déploiement). */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = {}; }

  const title = data.title || 'La SaLLe';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    // Badge (petite icône barre d'état Android) : silhouette transparente monochrome.
    // L'ancien badge réutilisait l'icône pleine → Android n'en gardait que l'alpha
    // et affichait un carré blanc. Le badge dédié donne un glyphe net.
    badge: '/icons/badge-96.png',
    lang: 'fr',
    tag: data.tag || 'annonce',
    renotify: true,
    data: { url: data.url || '/#/membre/notifications' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/#/membre/notifications';

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        try { await client.navigate(target); } catch (_) { /* navigation refusée : on se contente du focus */ }
        return client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});
