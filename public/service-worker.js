const CACHE_NAME = "DUMBTERM_PWA_CACHE_V1";
const ASSETS_TO_CACHE = [];
const BASE_PATH = self.registration.scope;

// Helper to prepend base path to URLs that need it
function getAssetPath(url) {
    // If the URL is external (starts with http:// or https://), don't modify it
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    // Remove any leading slashes and join with base path
    return `${BASE_PATH}${url.replace(/^\/+/, '')}`;
}

const preload = async () => {
    console.log("Installing web app");
    const cache = await caches.open(CACHE_NAME);
    
    try {
        console.log("Fetching asset manifest...");
        const response = await fetch(getAssetPath("asset-manifest.json"));
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const assets = await response.json();
        
        // Add base path to relative URLs
        const processedAssets = assets.map(asset => getAssetPath(asset));
        ASSETS_TO_CACHE.push(...processedAssets);
        
        console.log("Assets to cache:", ASSETS_TO_CACHE);
        await cache.addAll(ASSETS_TO_CACHE);
        console.log("Assets cached successfully");
    } catch (error) {
        console.error("Failed to cache assets:", error);
    }
};

// Clean up old caches
async function clearOldCaches() {
    const keys = await caches.keys();
    return Promise.all(
        keys.map(key => {
            if (key !== CACHE_NAME) {
                return caches.delete(key);
            }
        })
    );
}

self.addEventListener("install", (event) => {
    console.log("Service Worker installing...");
    event.waitUntil(preload());
});

self.addEventListener("activate", (event) => {
    console.log("Service Worker activating...");
    event.waitUntil(
        Promise.all([
            clearOldCaches(),
            clients.claim()
        ])
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return cached response if found
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Clone the request because it can only be used once
                return fetch(event.request.clone())
                    .then((response) => {
                        // Don't cache if not a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response because it can only be used once
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    });
            })
            .catch(() => {
                // Return a fallback response for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match(getAssetPath('index.html'));
                }
                return new Response('Network error happened', {
                    status: 408,
                    headers: { 'Content-Type': 'text/plain' },
                });
            })
    );
});