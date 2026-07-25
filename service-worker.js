self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', async () => {
  if (self.registration && self.registration.unregister) {
    await self.registration.unregister();
  }
  const keys = await caches.keys();
  for (const key of keys) {
    await caches.delete(key);
  }
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) {
    client.navigate(client.url);
  }
});
