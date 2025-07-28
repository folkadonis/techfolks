// Service Worker for TechFolks PWA
const CACHE_NAME = 'techfolks-v1.0.0';
const API_CACHE_NAME = 'techfolks-api-v1.0.0';
const STATIC_CACHE_NAME = 'techfolks-static-v1.0.0';

// URLs to cache on install
const STATIC_URLS = [
  '/',
  '/manifest.json',
  '/offline.html',
  // Add critical CSS and JS files here
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/problems',
  '/api/contests',
  '/api/user/profile',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_URLS);
      }),
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== API_CACHE_NAME &&
              cacheName !== STATIC_CACHE_NAME
            ) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  }
  // Handle navigation requests
  else if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
  }
  // Handle static asset requests
  else {
    event.respondWith(handleStaticRequest(request));
  }
});

// API request handler - Network First with cache fallback
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Don't cache POST, PUT, DELETE requests
  if (request.method !== 'GET') {
    return fetch(request);
  }

  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      
      // Set cache timestamp
      const cacheControl = networkResponse.headers.get('cache-control');
      if (!cacheControl || !cacheControl.includes('no-cache')) {
        const response = networkResponse.clone();
        response.headers.set('sw-cache-timestamp', Date.now().toString());
        return response;
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for', request.url);
    
    // Try cache fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Check if cache is stale (older than 5 minutes)
      const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
      const isStale = cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) > 300000;
      
      if (isStale) {
        cachedResponse.headers.set('sw-cache-stale', 'true');
      }
      
      return cachedResponse;
    }
    
    // Return offline response for critical endpoints
    if (API_ENDPOINTS.some(endpoint => url.pathname.includes(endpoint))) {
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'You are currently offline. Please check your connection.',
          offline: true
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'sw-offline': 'true'
          }
        }
      );
    }
    
    throw error;
  }
}

// Navigation request handler - Cache First with network fallback
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Navigation failed, trying cache');
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Fallback to index.html for SPA
    return caches.match('/');
  }
}

// Static request handler - Cache First
async function handleStaticRequest(request) {
  // Try cache first for static assets
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Failed to fetch static asset', request.url);
    throw error;
  }
}

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync-submissions') {
    event.waitUntil(syncSubmissions());
  }
});

// Sync submissions when online
async function syncSubmissions() {
  try {
    const submissions = await getOfflineSubmissions();
    
    for (const submission of submissions) {
      try {
        const response = await fetch('/api/submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${submission.token}`
          },
          body: JSON.stringify(submission.data)
        });
        
        if (response.ok) {
          await removeOfflineSubmission(submission.id);
          console.log('Service Worker: Synced submission', submission.id);
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync submission', submission.id, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// Get offline submissions from IndexedDB
async function getOfflineSubmissions() {
  // Implementation would use IndexedDB to store offline submissions
  return [];
}

// Remove synced submission from IndexedDB
async function removeOfflineSubmission(id) {
  // Implementation would remove from IndexedDB
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: 'You have new updates!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Updates',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.title = data.title || 'TechFolks';
  }
  
  event.waitUntil(
    self.registration.showNotification('TechFolks', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CACHE_CLEAR') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});