import TerminalManager from "./managers/terminal.js";

document.addEventListener('DOMContentLoaded', () => {
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

    const registerServiceWorker = () => {
        if ("serviceWorker" in navigator) {
            // Add cache-busting version parameter to service worker URL
            const swVersion = new Date().getTime(); // Use timestamp as version
            navigator.serviceWorker.register(joinPath(`service-worker.js?v=${swVersion}`))
                .then((reg) => {
                    console.log("Service Worker registered:", reg.scope);
                    checkVersion();
                })
                .catch((err) => console.log("Service Worker registration failed:", err));
                
            // Listen for version messages from the service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SW_VERSION') {
                    handleVersionMessage(event.data.version);
                }
            });
            
            // Check for version updates when the page becomes visible
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible' && navigator.serviceWorker.controller) {
                    checkVersion();
                }
            });
            
            // Also check periodically for version updates
            setInterval(() => {
                if (navigator.serviceWorker.controller) {
                    checkVersion();
                }
            }, 60 * 60 * 1000); // Check every hour
        }
    }
    
    // Check the current service worker version
    function checkVersion() {
        if (!navigator.serviceWorker.controller) return;
        
        // Create a message channel for the response
        const messageChannel = new MessageChannel();
        
        // Listen for the response
        messageChannel.port1.onmessage = (event) => {
            handleVersionMessage(event.data.version);
        };
        
        // Ask the service worker for its version
        navigator.serviceWorker.controller.postMessage(
            { type: 'GET_VERSION' },
            [messageChannel.port2]
        );
    }
    
    // Handle a version message from the service worker
    function handleVersionMessage(swVersion) {
        // Get the installed version from localStorage
        const installedVersion = localStorage.getItem('sw-version');
        
        console.log(`Current service worker version: ${swVersion}`);
        console.log(`Previously installed version: ${installedVersion || 'none'}`);
        
        // If this is the first install or the version has changed
        if (!installedVersion) {
            // First installation - just store the version
            localStorage.setItem('sw-version', swVersion);
        } else if (installedVersion !== swVersion) {
            // Version has changed - show update notification
            showUpdateNotification();
        }
    }
    
    // Show a notification when updates are available
    function showUpdateNotification() {
        // Remove any existing notifications first
        const existingNotifications = document.querySelectorAll('.update-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const updateNotification = document.createElement('div');
        updateNotification.className = 'update-notification';
        updateNotification.innerHTML = `
            <p>New version available!</p>
            <button id="update-now">Update Now</button>
            <button id="update-later" class="secondary">Later</button>
        `;
        document.body.appendChild(updateNotification);
        
        document.getElementById('update-now').addEventListener('click', async () => {
            // Show a loading spinner in the button
            const updateButton = document.getElementById('update-now');
            updateButton.innerHTML = 'Updating...';
            updateButton.disabled = true;
            
            try {
                // Clear all caches
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(
                        cacheNames.map(cacheName => {
                            console.log(`Clearing cache: ${cacheName}`);
                            return caches.delete(cacheName);
                        })
                    );
                    console.log('All caches cleared successfully');
                }
                
                // Unregister service workers
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(
                        registrations.map(registration => {
                            console.log('Unregistering service worker');
                            return registration.unregister();
                        })
                    );
                    console.log('All service workers unregistered');
                }
                
                // Update the stored version in localStorage
                if (navigator.serviceWorker.controller) {
                    const messageChannel = new MessageChannel();
                    
                    messageChannel.port1.onmessage = (event) => {
                        localStorage.setItem('sw-version', event.data.version);
                    };
                    
                    navigator.serviceWorker.controller.postMessage(
                        { type: 'GET_VERSION' },
                        [messageChannel.port2]
                    );
                }
                
                // Force reload
                window.location.reload(true);
            } catch (error) {
                console.error('Error during update process:', error);
                window.location.reload();
            }
            
            updateNotification.remove();
        });
        
        document.getElementById('update-later').addEventListener('click', () => {
            updateNotification.remove();
        });
    }
    
    async function initialize() {
        initThemeToggle();
        // Set site title
        const siteTitle = window.appConfig?.siteTitle || 'DumbTerm';
        document.getElementById('pageTitle').textContent = siteTitle;
        document.getElementById('siteTitle').textContent = siteTitle;

        // Initialize terminal manager only after DOM is fully loaded
        if (document.querySelector('.terminals-container')) {
            const terminalManager = new TerminalManager(isMacOS, setupToolTips);
            // The handleNewTab call is removed as the terminal manager now handles this in loadSessionState
        }

        const tooltips = document.querySelectorAll('[data-tooltip]');
        setupToolTips(tooltips);
        registerServiceWorker();
    }
    
    initialize();
});