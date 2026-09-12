// =========================================
// TASK REMINDER SERVICE WORKER
// =========================================

const CACHE_NAME = "task-reminder-v2";
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

// =========================================
// INSTALL
// =========================================

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)),
  );
  self.skipWaiting();
});

// =========================================
// ACTIVATE
// =========================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

// =========================================
// FETCH
// =========================================

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    }),
  );
});

// =========================================
// NOTIFICATION CLICK
// =========================================

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const taskId = event.notification.data?.taskId;
  if (event.action === "snooze") {
    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "SNOOZE",
              taskId: taskId,
            });
          });
        }),
    );
  } else {
    event.waitUntil(self.clients.openWindow("./"));
  }
});

// =========================================
// PUSH NOTIFICATION
// =========================================

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Task Reminder", {
      body: data.body || "You have a task!",
      icon: "icon-192.png",
      badge: "icon-192.png",
      actions: [
        {
          action: "snooze",
          title: "Tunda 5 menit",
        },
      ],
      data: {
        taskId: data.taskId,
      },
    }),
  );
});
