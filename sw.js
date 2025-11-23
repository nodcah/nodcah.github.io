// Service Worker for Interval Timer
// Handles background notifications when app is in background or phone is locked

const CACHE_NAME = 'interval-timer-v1';
const urlsToCache = [
  '/timer.html',
  '/timer.js',
  '/timer.css',
  '/manifest.json',
  '/assets/icon.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Timer notification',
    icon: '/assets/icon.png',
    badge: '/assets/icon.png',
    vibrate: [200, 100, 200],
    tag: 'interval-timer',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('Interval Timer', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' || client.url.includes('timer.html') && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open the app
        if (clients.openWindow) {
          return clients.openWindow('/timer.html');
        }
      })
  );
});

// Periodic background sync (for keeping timer running)
// Note: This is experimental and may not work on all browsers
self.addEventListener('sync', (event) => {
  if (event.tag === 'timer-sync') {
    event.waitUntil(
      // Timer logic would be handled by the main app
      // This is just a placeholder for future enhancements
      Promise.resolve()
    );
  }
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data;
    const options = {
      body: body,
      icon: '/assets/icon.png',
      badge: '/assets/icon.png',
      tag: tag || 'interval-timer',
      requireInteraction: false,
      vibrate: [200, 100, 200]
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

