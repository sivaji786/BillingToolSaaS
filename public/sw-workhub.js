/**
 * WorkHub Service Worker — sw-workhub.js
 *
 * Strategy:
 * - Cache: last 50 task list responses (NetworkFirst, falling back to cache when offline)
 * - Timer state: stored in localStorage via workhubOfflineStore (not in SW)
 * - Draft notes: stored in localStorage via workhubOfflineStore
 * - Out-of-scope: full offline CRUD — read cache + timer persistence only
 *
 * Registration: in main.tsx or index.html via
 *   navigator.serviceWorker.register('/sw-workhub.js')
 */

const CACHE_NAME = 'workhub-v1';
const TASK_LIST_RE = /\/api\/workhub\/tasks(\?.*)?$/;
const MAX_CACHED_RESPONSES = 50;

// ---- Install ----
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// ---- Activate ----
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((k) => k !== CACHE_NAME)
                    .map((k) => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// ---- Fetch ----
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only intercept GET requests to WorkHub task list
    if (event.request.method !== 'GET') return;
    if (!TASK_LIST_RE.test(url.pathname + url.search)) return;

    event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const networkResponse = await fetch(request.clone());
        if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
            await trimCache(cache, MAX_CACHED_RESPONSES);
        }
        return networkResponse;
    } catch {
        // Offline — return cached response if available
        const cached = await cache.match(request);
        if (cached) {
            return new Response(await cached.clone().text(), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-WorkHub-Cache': 'offline',
                },
            });
        }
        // Nothing cached — return empty task list structure
        return new Response(
            JSON.stringify({ data: [], total: 0, unread_inbox_count: 0, offline: true }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}

async function trimCache(cache, maxEntries) {
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
        await Promise.all(
            keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k))
        );
    }
}

// ---- Background Sync (timer state) ----
self.addEventListener('sync', (event) => {
    if (event.tag === 'workhub-sync') {
        event.waitUntil(syncOfflineQueue());
    }
});

async function syncOfflineQueue() {
    // The offline request queue lives in localStorage / Zustand; we just notify clients
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
        client.postMessage({ type: 'WORKHUB_SYNC_READY' });
    });
}

// ---- Push notifications (WorkHub inbox) ----
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        return;
    }

    if (data.type !== 'workhub.inbox.message') return;

    event.waitUntil(
        self.registration.showNotification(data.subject ?? 'New WorkHub message', {
            body: data.body ?? '',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `workhub-inbox-${data.id ?? Date.now()}`,
            data: { url: '/#workhub', taskId: data.task_id },
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = event.notification.data?.url ?? '/#workhub';
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            const existing = clients.find((c) => c.url.includes(self.location.origin));
            if (existing) {
                existing.focus();
                existing.navigate(target);
            } else {
                self.clients.openWindow(target);
            }
        })
    );
});
