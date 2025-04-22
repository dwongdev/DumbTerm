const CACHE_VERSION = "1.0.1"; // Increment this with each significant change
const CACHE_NAME = `DUMBTERM_PWA_CACHE_V${CACHE_VERSION}`;
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

// Check if cache exists and what version it is
async function checkCacheVersion() {
    const keys = await caches.keys();
    
    // Check if current version cache exists
    const currentCacheExists = keys.includes(CACHE_NAME);
    
    // Check for old versions
    const oldCaches = keys.filter(key => key !== CACHE_NAME && key.startsWith('DUMBTERM_PWA_CACHE'));
    const hasOldVersions = oldCaches.length > 0;
    
    return {
        currentCacheExists,
        hasOldVersions,
        oldCaches
    };
}

const preload = async () => {
    console.log("Preparing to install web app cache");
    
    // Check cache status
    const { currentCacheExists, hasOldVersions } = await checkCacheVersion();
    
    // If current version cache already exists, no need to reinstall
    if (currentCacheExists) {
        console.log(`Cache ${CACHE_NAME} already exists, using existing cache`);
        return;
    }
    
    // If we get here, we need to install the cache
    console.log(`Cache ${CACHE_NAME} does not exist, installing cache`);
    const cache = await caches.open(CACHE_NAME);
    
    try {
        console.log("Fetching asset manifest...");
        const response = await fetch(getAssetPath("assets/asset-manifest.json"));
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const assets = await response.json();
        
        // Add base path to relative URLs
        const processedAssets = assets.map(asset => getAssetPath(asset));
        ASSETS_TO_CACHE.push(...processedAssets);
        
        // Always include critical files
        const criticalFiles = [
            'index.html',
            'index.js',
            'styles.css',
            'assets/manifest.json',
            'assets/dumbterm.png',
            'managers/terminal.js',
            'managers/storage.js'
        ];
        
        criticalFiles.forEach(file => {
            const filePath = getAssetPath(file);
            if (!ASSETS_TO_CACHE.includes(filePath)) {
                ASSETS_TO_CACHE.push(filePath);
            }
        });
        
        console.log("Assets to cache:", ASSETS_TO_CACHE);
        await cache.addAll(ASSETS_TO_CACHE);
        console.log("Assets cached successfully");
    } catch (error) {
        console.error("Failed to cache assets:", error);
    }
};

// Clean up old caches
async function clearOldCaches() {
    const { oldCaches } = await checkCacheVersion();
    
    if (oldCaches.length > 0) {
        console.log('Found old caches to delete:', oldCaches);
    }
    
    return Promise.all(
        oldCaches.map(key => {
            console.log(`Deleting old cache: ${key}`);
            return caches.delete(key);
        })
    );
}

self.addEventListener("install", (event) => {
    console.log("Service Worker installing...");
    event.waitUntil(preload());
    // Skip waiting to allow new service worker to activate immediately
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    console.log("Service Worker activating...");
    
    event.waitUntil(
        checkCacheVersion().then(({currentCacheExists, hasOldVersions}) => {
            return Promise.all([
                clearOldCaches(),
                self.clients.claim() // Take control of all clients immediately
            ]).then(() => {
                // Notify clients of the current version
                return self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        // Only send update notification if we actually updated (had old versions)
                        client.postMessage({
                            type: hasOldVersions ? 'UPDATE_AVAILABLE' : 'SW_VERSION',
                            version: CACHE_VERSION
                        });
                    });
                });
            });
        })
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

// Listen for message events from the main script
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'GET_VERSION') {
        // Send the current version to the client
        if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({
                version: CACHE_VERSION
            });
        } else {
            // Fallback if no port is available
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_VERSION',
                        version: CACHE_VERSION
                    });
                });
            });
        }
    }
});