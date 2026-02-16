const CACHE_NAME = "task-reminder-v1";
const urlsToCache = ["./", "./index.html", "./style.css", "./script.js", "./manifest.json"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("activate", (e) => {
  self.clients.claim();
  e.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});

// Menampilkan notifikasi dari push (jika ada)
self.addEventListener("push", (e) => {
  const data = e.data?.json() || {};
  self.registration.showNotification(data.title || "Task Reminder", {
    body: data.body || "Ada tugas!",
    icon: "icon-192.png",
    badge: "icon-192.png",
  });
});

// Tangani klik notifikasi
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes("/") && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow("/");
      })
  );
});
