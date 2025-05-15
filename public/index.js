import TerminalManager from "./managers/terminal.js";

document.addEventListener('DOMContentLoaded', () => {
    // Shared timeout variable for update process
    let updateTimeout;
    // Tracking variables for update notifications
    let updateNotificationActive = false;
    let lastCheckedVersionPair = null;

    async function waitForFonts() {
        // Create a promise that resolves when fonts are loaded
        const fontPromises = [
            'FiraCode Nerd Font',
        ].map(font => document.fonts.load(`1em "${font}"`));

        try {
            await Promise.all(fontPromises);
        } catch (e) {
            console.warn('Font loading error:', e);
        }
    }

    // Add logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            fetch(joinPath('logout'), {
                method: 'POST',
                credentials: 'same-origin'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.reload();
                }
            })
            .catch(error => {
                console.error('Logout failed:', error);
            });
        });
    }

    // Theme toggle functionality
    function initThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    // Helper function to join paths with base path
    function joinPath(path) {
        const basePath = window.appConfig?.basePath || '';
        // Remove any leading slash from path and trailing slash from basePath
        const cleanPath = path.replace(/^\/+/, '');
        const cleanBase = basePath.replace(/\/+$/, '');
        
        // Join with single slash
        return cleanBase ? `${cleanBase}/${cleanPath}` : cleanPath;
    }

    const detectOS = () => {
        const userAgent = navigator.userAgent;
        const isMac = /Macintosh|Mac OS X/i.test(userAgent);
        return isMac;
    }
    const isMacOS = detectOS();
    
    const setupToolTips = (tooltips) => {
        // Check if it's a mobile device using a media query or pointer query
        const isMobile = window.matchMedia('(max-width: 585px)').matches || window.matchMedia('(pointer: coarse)').matches;
        if (isMobile) return;
        
        // Function to hide all visible tooltips
        const hideAllTooltips = () => {
            document.querySelectorAll('.tooltip.show').forEach(tip => {
                tip.classList.remove('show');
            });
        };
        
        tooltips.forEach((element) => {
            let tooltipText = element.getAttribute('data-tooltip');
            const shortcutsStr = element.getAttribute('data-shortcuts');

            if (tooltipText && shortcutsStr) {
                try {
                    const shortcuts = JSON.parse(shortcutsStr);
                    let shortcutToUse = isMacOS ? shortcuts.mac : shortcuts.win;
    
                    if (shortcutToUse) {
                        tooltipText = tooltipText.replace(`{shortcut}`, shortcutToUse);
                        element.setAttribute('data-tooltip', tooltipText);
                    } else {
                        console.warn(`No shortcut found for ${isMacOS ? 'mac' : 'win'}`);
                    }
    
                } catch (error) {
                    console.error("Error parsing shortcuts:", error);
                }
            }

            let tooltip = document.createElement('div');
            tooltip.classList.add('tooltip');
            document.body.appendChild(tooltip);
    
            element.addEventListener('mouseover', (e) => {
                // First hide all visible tooltips
                hideAllTooltips();
                
                // Then show this tooltip
                tooltip.textContent = element.getAttribute('data-tooltip');
                tooltip.style.left = e.pageX + 10 + 'px';
                tooltip.style.top = e.pageY + 10 + 'px';
                tooltip.classList.add('show');
                
                // Stop event propagation to prevent parent tooltips from showing
                e.stopPropagation();
            });
            
            element.addEventListener('mouseout', (e) => {
                tooltip.classList.remove('show');
                
                // Prevent the mouseout event from bubbling to parent elements
                e.stopPropagation();
            });
        });
        
        // Also hide tooltips when clicking anywhere
        document.addEventListener('click', hideAllTooltips);
    }

    /**
     * Registers the service worker and sets up event listeners
     */
    const registerServiceWorker = () => {
        if (!("serviceWorker" in navigator)) return;
        
        // Set version display to loading state until we have version info
        const versionDisplay = document.getElementById('version-display');
        if (versionDisplay) {
            versionDisplay.textContent = 'Loading...';
            versionDisplay.classList.add('loading');
        }
        
        // Add cache-busting version parameter to service worker URL
        const swVersion = window.appConfig?.version || new Date().getTime();
        const swUrl = joinPath(`service-worker.js?v=${swVersion}`);
        console.log(`Registering service worker with version param: ${swVersion}`);
        
        navigator.serviceWorker.register(swUrl)
            .then(registration => {
                console.log("Service Worker registered:", registration.scope);
                
                // Send the app version to any active service worker
                if (window.appConfig?.version) {
                    sendVersionToServiceWorker(window.appConfig.version);
                }
                
                // Check version to update UI immediately after registration
                checkVersion();
            })
            .catch(error => console.error("Service Worker registration failed:", error));
        
        // Set up other service worker related listeners
        setupServiceWorkerMessageHandlers();
        setupPeriodicVersionCheck();
    }
    
    /**
     * Sends version information to all possible service worker targets
     * @param {string} version - Version to send
     */
    function sendVersionToServiceWorker(version) {
        if (!version) return;
        
        // Message to send with version and optional cacheName
        const message = {
            type: 'SET_VERSION',
            version: version
        };
        
        // Include cacheName if available in config
        if (window.appConfig?.cacheName) {
            message.cacheName = window.appConfig.cacheName;
            console.log(`Including cacheName in message to service worker: ${window.appConfig.cacheName}`);
        }
        
        // Try to send to the controller if it exists
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage(message);
        }
        
        // Also send through the ready promise to ensure we reach the active worker
        navigator.serviceWorker.ready.then(registration => {
            if (registration.active) {
                registration.active.postMessage(message);
            }
            if (registration.waiting) {
                registration.waiting.postMessage(message);
            }
        });
    }
    
    /**
     * Sets up message event listeners for the service worker
     */
    function setupServiceWorkerMessageHandlers() {
        navigator.serviceWorker.addEventListener('message', event => {
            if (!event.data || !event.data.type) return;
            
            switch (event.data.type) {
                case 'UPDATE_AVAILABLE':
                    // Store cacheName if provided in the message
                    if (event.data.cacheName) {
                        console.log(`Received cacheName in update message: ${event.data.cacheName}`);
                        // Use it as a local cached value for later use
                        window._receivedCacheName = event.data.cacheName;
                    }
                    showUpdateNotification(event.data.currentVersion, event.data.newVersion);
                    break;
                    
                case 'UPDATE_COMPLETE':
                    handleUpdateComplete(event.data);
                    break;
                    
                case 'CACHE_VERSION_INFO':
                    // Store cacheName if provided
                    if (event.data.cacheName) {
                        console.log(`Received cacheName in version info: ${event.data.cacheName}`);
                        window._receivedCacheName = event.data.cacheName;
                    }
                    updateVersionDisplay(event.data.currentVersion);
                    break;
            }
        });
    }
    
    /**
     * Sets up periodic version checking when page is visible
     */
    function setupPeriodicVersionCheck() {
        // Check for updates when the page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && navigator.serviceWorker.controller) {
                checkVersion();
            }
        });
        
        // Also check periodically for version updates (every hour)
        setInterval(() => {
            if (navigator.serviceWorker.controller) {
                checkVersion();
            }
        }, 60 * 60 * 1000);
    }
    
    /**
     * Handles update completion messages
     * @param {Object} data - Update completion data
     */
    function handleUpdateComplete(data) {
        // Clear any pending timeout
        if (updateTimeout) {
            clearTimeout(updateTimeout);
        }
        
        // Reset notification tracking state
        updateNotificationActive = false;
        lastCheckedVersionPair = null;
        
        // Remove any existing update notifications
        const existingNotifications = document.querySelectorAll('.update-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        if (data.success === false) {
            // Show error notification
            const errorNotification = document.createElement('div');
            errorNotification.className = 'update-notification error';
            errorNotification.innerHTML = `
                <p>Update failed: ${data.error || 'Unknown error'}</p>
                <button onclick="this.parentElement.remove()">Dismiss</button>
            `;
            document.body.appendChild(errorNotification);
            setTimeout(() => errorNotification.remove(), 5000);
        } else {
            // Store cacheName if available for future use
            if (data.cacheName) {
                console.log(`Caching received cacheName in update complete: ${data.cacheName}`);
                window._receivedCacheName = data.cacheName;
            }
            
            // First update the version display if version is available
            if (data.version) {
                updateVersionDisplay(data.version);
                
                // Small delay to ensure UI updates before reload
                setTimeout(() => {
                    window.location.reload();
                }, 100);
            } else {
                // Fall back to immediate reload if no version info
                window.location.reload();
            }
        }
    }
    
    /**
     * Checks for version updates by querying the service worker
     * Uses direct cache access first, then falls back to service worker messaging
     */
    function checkVersion() {
        // Skip check if an update notification is already active
        if (updateNotificationActive) {
            console.log("Update notification already active, skipping version check");
            return;
        }
        
        // First try to get the version directly from cache
        getCurrentCacheVersion().then(cacheInfo => {
            // Check for update directly if we have version info from cache
            const configVersion = window.appConfig?.version;
            
            if (cacheInfo.version && configVersion && 
                !cacheInfo.isFirstInstall && 
                shouldShowUpdateNotification(cacheInfo.version, configVersion)) {
                
                showUpdateNotification(cacheInfo.version, configVersion);
                return;
            }
            
            // Only query service worker if we have an active controller
            if (navigator.serviceWorker.controller) {
                const messageChannel = new MessageChannel();
                
                messageChannel.port1.onmessage = event => {
                    console.log("Received version info from service worker:", event.data);
                    
                    const currentVersion = cacheInfo.version || event.data.currentVersion;
                    const newVersion = configVersion || event.data.newVersion;
                    
                    if (shouldShowUpdateNotification(currentVersion, newVersion) && !cacheInfo.isFirstInstall) {
                        showUpdateNotification(currentVersion, newVersion);
                    }
                };
                
                navigator.serviceWorker.controller.postMessage(
                    { type: 'GET_VERSION' },
                    [messageChannel.port2]
                );
            }
        }).catch(error => {
            console.error("Error checking version:", error);
        });
    }
    
    /**
     * Determines if an update notification should be shown
     * @param {string} currentVersion - Current version
     * @param {string} newVersion - New version
     * @returns {boolean} True if notification should be shown
     */
    function shouldShowUpdateNotification(currentVersion, newVersion) {
        return (
            // Both versions must exist
            currentVersion && newVersion && 
            // Versions must be different
            currentVersion !== newVersion && 
            // Neither version can be the default
            currentVersion !== "1.0.0" && 
            newVersion !== "1.0.0"
        );
    }
    
    /**
     * Shows a notification when updates are available
     * @param {string} currentVersion - Current installed version
     * @param {string} newVersion - New available version
     */
    function showUpdateNotification(currentVersion, newVersion) {
        // Validate versions before showing
        if (!shouldShowUpdateNotification(currentVersion, newVersion)) {
            console.log("Update notification skipped - invalid version comparison");
            return;
        }
        
        // Check if we're already showing a notification for this version pair
        const versionPair = `${currentVersion}-${newVersion}`;
        if (updateNotificationActive && lastCheckedVersionPair === versionPair) {
            console.log("Update notification already active for this version pair, skipping duplicate");
            return;
        }
        
        // Update tracking variables
        updateNotificationActive = true;
        lastCheckedVersionPair = versionPair;
        
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.update-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create new notification
        const updateNotification = document.createElement('div');
        updateNotification.className = 'update-notification';
        updateNotification.innerHTML = `
            <p>New version v${newVersion} available!</p>
            <p class="update-details">Current: v${currentVersion}</p>
            <button id="update-now">Update Now</button>
            <button id="update-later" class="secondary">Later</button>
        `;
        document.body.appendChild(updateNotification);
        
        // Set up buttons
        document.getElementById('update-now').addEventListener('click', () => {
            handleUpdateRequest(updateNotification);
        });
        
        document.getElementById('update-later').addEventListener('click', () => {
            updateNotification.remove();
            updateNotificationActive = false;
        });
    }
    
    /**
     * Handles a user request to update the application
     * @param {HTMLElement} notification - The notification element
     */
    function handleUpdateRequest(notification) {
        // Show loading state
        const updateButton = notification.querySelector('#update-now');
        updateButton.innerHTML = 'Updating...';
        updateButton.disabled = true;
        
        // Also update version display to show loading state
        const versionDisplay = document.getElementById('version-display');
        if (versionDisplay) {
            versionDisplay.textContent = 'Updating...';
            versionDisplay.classList.add('loading');
        }
        
        // Set a timeout to handle cases where the update might hang
        if (updateTimeout) clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
            // Remove any notifications
            const existingNotifications = document.querySelectorAll('.update-notification');
            existingNotifications.forEach(notification => notification.remove());
            
            // Show timeout error
            const errorNotification = document.createElement('div');
            errorNotification.className = 'update-notification error';
            errorNotification.innerHTML = `
                <p>Update timed out. Please try again.</p>
                <button onclick="this.parentElement.remove()">Dismiss</button>
            `;
            document.body.appendChild(errorNotification);
            setTimeout(() => {
                errorNotification.remove();
                updateNotificationActive = false;
            }, 5000);
            
            // Restore version display
            updateVersionDisplay();
        }, 30000); // 30 second timeout
        
        if (navigator.serviceWorker.controller) {
            // Request the update via service worker
            navigator.serviceWorker.controller.postMessage({ type: 'PERFORM_UPDATE' });
        } else {
            // No service worker controller, try to force reload
            console.log("No service worker controller, forcing page reload");
            updateNotificationActive = false;
            window.location.reload(true);
        }
    }
    
    /**
     * Gets the currently installed cache version directly
     * @returns {Promise<Object>} Cache version information
     */
    async function getCurrentCacheVersion() {
        try {
            // First check if app config has a cacheName we should use
            const configCacheName = window.appConfig?.cacheName;
            
            const cacheKeys = await caches.keys();
            // Support both formats: DUMBTERM_PWA_CACHE_V* and DUMBTERM_CACHE_* or any from config
            const dumbTermCaches = cacheKeys.filter(key => 
                (configCacheName && key === configCacheName) || 
                (key.startsWith('DUMBTERM_') && (key.includes('_V') || key.includes('_CACHE_')))
            );
            
            if (dumbTermCaches.length === 0) {
                console.log('No DumbTerm cache found');
                return {
                    version: window.appConfig?.version || null,
                    cacheName: configCacheName || null,
                    isFirstInstall: true
                };
            }
            
            // If config cacheName exists and is in the list, prioritize it
            let latestCache;
            if (configCacheName && dumbTermCaches.includes(configCacheName)) {
                latestCache = configCacheName;
            } else {
                // Otherwise sort caches by version to get the latest
                dumbTermCaches.sort((a, b) => {
                    // Extract version from different patterns
                    const getVersion = (cacheName) => {
                        const vMatch = cacheName.match(/.*_V(.+)$/) || cacheName.match(/DUMBTERM_CACHE_(.+)$/);
                        return vMatch && vMatch[1] ? vMatch[1] : '';
                    };
                    const versionA = getVersion(a);
                    const versionB = getVersion(b);
                    return versionB.localeCompare(versionA);
                });
                latestCache = dumbTermCaches[0];
            }
            
            // Extract version from cacheName
            let version;
            const versionMatch = latestCache.match(/.*_V(.+)$/) || latestCache.match(/DUMBTERM_CACHE_(.+)$/);
            version = versionMatch && versionMatch[1] ? versionMatch[1] : window.appConfig?.version || null;
            
            console.log(`Found cache version: ${version}, cacheName: ${latestCache}`);
            return {
                version: version,
                cacheName: latestCache,
                isFirstInstall: false,
                allCaches: dumbTermCaches
            };
        } catch (error) {
            console.error('Error getting cache version:', error);
            return {
                version: window.appConfig?.version || null,
                error: error.message,
                isFirstInstall: true
            };
        }
    }
    
    /**
     * Updates the UI version display with a specific version
     * @param {string} version - Version to display (optional)
     */
    function updateVersionDisplay(version) {
        const versionDisplay = document.getElementById('version-display');
        if (!versionDisplay) return;
        
        if (version) {
            versionDisplay.textContent = `v${version}`;
            versionDisplay.classList.remove('loading');
            return;
        }
        
        // Try to get version info in this order:
        // 1. From cache
        // 2. From app config
        getCurrentCacheVersion()
            .then(cacheInfo => {
                if (cacheInfo.version) {
                    versionDisplay.textContent = `v${cacheInfo.version}`;
                } else if (window.appConfig?.version) {
                    versionDisplay.textContent = `v${window.appConfig.version}`;
                } else {
                    versionDisplay.textContent = '';
                }
                versionDisplay.classList.remove('loading');
                
                // Check for updates if needed, but only if no notification is active
                if (!updateNotificationActive && 
                    !cacheInfo.isFirstInstall && 
                    window.appConfig?.version && 
                    shouldShowUpdateNotification(cacheInfo.version, window.appConfig.version)) {
                    showUpdateNotification(cacheInfo.version, window.appConfig.version);
                }
            })
            .catch(error => {
                console.error('Error updating version display:', error);
                // Fall back to app config version
                if (window.appConfig?.version) {
                    versionDisplay.textContent = `v${window.appConfig.version}`;
                } else {
                    versionDisplay.textContent = '';
                }
                versionDisplay.classList.remove('loading');
            });
    }

    /**
     * Initializes the application
     */
    async function initialize() {
        // Initialize UI components
        initThemeToggle();
        
        // Set site title
        const siteTitle = window.appConfig?.siteTitle || 'DumbTerm';
        document.getElementById('pageTitle').textContent = siteTitle;
        document.getElementById('siteTitle').textContent = siteTitle;

        // Configure UI based on app settings
        if (window.appConfig?.isDemoMode) {
            document.getElementById('demo-banner').style.display = 'block';
        }
        
        if (!window.appConfig?.isPinRequired) {
            document.getElementById("logoutBtn").style.display = 'none';
        }

        // Wait for fonts to load
        await waitForFonts();

        // Initialize terminal if needed
        if (document.querySelector('.terminals-container')) {
            const terminalManager = new TerminalManager(isMacOS, setupToolTips);
        }

        // Set up tooltips
        const tooltips = document.querySelectorAll('[data-tooltip]');
        setupToolTips(tooltips);
        
        // Set up version display and service worker in sequence:
        // 1. First update version from cache directly
        updateVersionDisplay();
        
        // 2. Then register service worker, which might update the version again
        registerServiceWorker();
    }

    initialize().catch(console.error);
});