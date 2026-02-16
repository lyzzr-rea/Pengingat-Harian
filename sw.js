const CACHE_NAME = "task-reminder-v2";
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Install: cache file dan aktifkan segera
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Activate: bersihkan cache lama
self.addEventListener("activate", (e) => {
  self.clients.claim();
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
});

// Fetch: ambil dari cache dulu, fallback ke jaringan
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});

// Push notification (jika digunakan)
self.addEventListener("push", (e) => {
  const data = e.data?.json() || {};
  self.registration.showNotification(data.title || "Task Reminder", {
    body: data.body || "Ada tugas!",
    icon: "icon-192.png",
    badge: "icon-192.png",
  });
});("/");
      })
  );
});

