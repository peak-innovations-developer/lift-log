// Network first so updates show up right away, cache fallback so it works with no signal.
const CACHE = 'liftlog-v1';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});

// The rest alarm, sent by the server when the rest ends (see the alarm code in
// index.html). It has to show a notification every time: iOS revokes push for
// an app that receives one and shows nothing.
//
// It arrives as a burst of a few pushes, because iOS allows one buzz per
// notification. Each gets its own tag, so iOS treats it as new and buzzes
// again, and the one before is closed, so the lock screen shows one.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) {}
  const reg = self.registration;
  e.waitUntil(reg.getNotifications().then(ns => {
    ns.forEach(n => { if ((n.tag || '').startsWith('rest')) n.close(); });
    return reg.showNotification(d.title || 'Rest done', {
      body: d.body || '', tag: 'rest-' + (d.n || 1), icon: 'icon-192.png', badge: 'icon-192.png',
    });
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => 'focus' in x);
    return c ? c.focus() : self.clients.openWindow('./');
  }));
});
