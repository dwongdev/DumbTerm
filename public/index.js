import TerminalManager from "./managers/terminal.js";

document.addEventListener('DOMContentLoaded', () => {
    // Shared timeout variable for update process
    let updateTimeout;

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

    const registerServiceWorker = () => {
        if ("serviceWorker" in navigator) {
            // Add cache-busting version parameter to service worker URL
            const swVersion = new Date().getTime(); // Use timestamp as version
            navigator.serviceWorker.register(joinPath(`service-worker.js?v=${swVersion}`))
                .then((reg) => {
                    console.log("Service Worker registered:", reg.scope);
                    // Check version immediately after registration
                    checkVersion();
                })
                .catch((err) => console.log("Service Worker registration failed:", err));
                
            // Listen for version messages from the service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'UPDATE_AVAILABLE') {
                    showUpdateNotification(event.data.currentVersion, event.data.newVersion);
                } else if (event.data.type === 'UPDATE_COMPLETE') {
                    // Clear any pending timeout
                    if (updateTimeout) {
                        clearTimeout(updateTimeout);
                    }
                    
                    // Remove the update notification
                    const existingNotifications = document.querySelectorAll('.update-notification');
                    existingNotifications.forEach(notification => notification.remove());
                    
                    if (event.data.success === false) {
                        // Show error notification
                        const errorNotification = document.createElement('div');
                        errorNotification.className = 'update-notification error';
                        errorNotification.innerHTML = `
                            <p>Update failed: ${event.data.error || 'Unknown error'}</p>
                            <button onclick="this.parentElement.remove()">Dismiss</button>
                        `;
                        document.body.appendChild(errorNotification);
                        setTimeout(() => errorNotification.remove(), 5000); // Remove after 5 seconds
                    } else {
                        // Reload the page after successful update
                        window.location.reload();
                    }
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
            if (event.data.currentVersion !== event.data.newVersion) {
                showUpdateNotification(event.data.currentVersion, event.data.newVersion);
            }
        };
        
        // Ask the service worker for its version
        navigator.serviceWorker.controller.postMessage(
            { type: 'GET_VERSION' },
            [messageChannel.port2]
        );
    }
    
    // Show a notification when updates are available
    function showUpdateNotification(currentVersion, newVersion) {
        // Remove any existing notifications first
        const existingNotifications = document.querySelectorAll('.update-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const updateNotification = document.createElement('div');
        updateNotification.className = 'update-notification';
        updateNotification.innerHTML = `
            <p>New version ${newVersion} available!</p>
            <button id="update-now">Update Now</button>
            <button id="update-later" class="secondary">Later</button>
        `;
        document.body.appendChild(updateNotification);
        
        document.getElementById('update-now').addEventListener('click', async () => {
            // Show a loading spinner in the button
            const updateButton = document.getElementById('update-now');
            updateButton.innerHTML = 'Updating...';
            updateButton.disabled = true;
            
            if (navigator.serviceWorker.controller) {
                // Set a timeout to handle cases where the update might hang
                if (updateTimeout) clearTimeout(updateTimeout);
                updateTimeout = setTimeout(() => {
                    const existingNotifications = document.querySelectorAll('.update-notification');
                    existingNotifications.forEach(notification => notification.remove());
                    
                    // Show error notification
                    const errorNotification = document.createElement('div');
                    errorNotification.className = 'update-notification error';
                    errorNotification.innerHTML = `
                        <p>Update timed out. Please try again.</p>
                        <button onclick="this.parentElement.remove()">Dismiss</button>
                    `;
                    document.body.appendChild(errorNotification);
                    setTimeout(() => errorNotification.remove(), 5000);
                }, 30000); // 30 second timeout
                
                // Tell service worker to perform the update
                navigator.serviceWorker.controller.postMessage({ type: 'PERFORM_UPDATE' });
            }
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

        const isPinRequired = window.appConfig?.isPinRequired;
        if (!isPinRequired) {
            document.getElementById("logoutBtn").style.display = 'none';
        }

        // Initialize terminal manager only after DOM is fully loaded
        if (document.querySelector('.terminals-container')) {
            const terminalManager = new TerminalManager(isMacOS, setupToolTips);
        }

        const tooltips = document.querySelectorAll('[data-tooltip]');
        setupToolTips(tooltips);
        registerServiceWorker();
    }
    
    initialize();
});