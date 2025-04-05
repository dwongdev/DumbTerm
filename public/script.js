// Helper function to join paths with base path
function joinPath(path) {
    const basePath = window.appConfig?.basePath || '';
    // Remove any leading slash from path and trailing slash from basePath
    const cleanPath = path.replace(/^\/+/, '');
    const cleanBase = basePath.replace(/\/+$/, '');
    
    // Join with single slash
    return cleanBase ? `${cleanBase}/${cleanPath}` : cleanPath;
}

// Theme toggle functionality
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Set initial theme based on system preference
    if (localStorage.getItem('theme') === null) {
        document.documentElement.setAttribute('data-theme', prefersDark.matches ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', localStorage.getItem('theme'));
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

// PIN input functionality
function setupPinInputs() {
    const form = document.getElementById('pinForm');
    if (!form) return; // Only run on login page

    // Fetch PIN length from server
    fetch(joinPath('pin-length'))
        .then(response => response.json())
        .then(data => {
            const pinLength = data.length;
            const container = document.querySelector('.pin-input-container');
            
            // Create PIN input fields
            for (let i = 0; i < pinLength; i++) {
                const input = document.createElement('input');
                input.type = 'password';
                input.maxLength = 1;
                input.className = 'pin-input';
                input.setAttribute('inputmode', 'numeric');
                input.pattern = '[0-9]*';
                input.setAttribute('autocomplete', 'off');
                container.appendChild(input);
            }

            // Handle input behavior
            const inputs = container.querySelectorAll('.pin-input');
            
            // Focus first input immediately
            if (inputs.length > 0) {
                inputs[0].focus();
            }

            inputs.forEach((input, index) => {
                input.addEventListener('input', (e) => {
                    // Only allow numbers
                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                    
                    if (e.target.value) {
                        e.target.classList.add('has-value');
                        if (index < inputs.length - 1) {
                            inputs[index + 1].focus();
                        } else {
                            // Last digit entered, submit the form
                            const pin = Array.from(inputs).map(input => input.value).join('');
                            submitPin(pin, inputs);
                        }
                    } else {
                        e.target.classList.remove('has-value');
                    }
                });

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace' && !e.target.value && index > 0) {
                        inputs[index - 1].focus();
                    }
                });

                // Prevent paste of multiple characters
                input.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const pastedData = e.clipboardData.getData('text');
                    const numbers = pastedData.match(/\d/g);
                    
                    if (numbers) {
                        numbers.forEach((num, i) => {
                            if (inputs[index + i]) {
                                inputs[index + i].value = num;
                                inputs[index + i].classList.add('has-value');
                                if (index + i + 1 < inputs.length) {
                                    inputs[index + i + 1].focus();
                                } else {
                                    // If paste fills all inputs, submit the form
                                    const pin = Array.from(inputs).map(input => input.value).join('');
                                    submitPin(pin, inputs);
                                }
                            }
                        });
                    }
                });
            });
        });
}

// Handle PIN submission with security features
function submitPin(pin, inputs) {
    const errorElement = document.querySelector('.pin-error');
    
    fetch(joinPath('verify-pin'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin })
    })
    .then(async response => {
        const data = await response.json();
        
        if (response.ok) {
            window.location.href = joinPath('');
        } else if (response.status === 429) {
            // Handle lockout
            errorElement.textContent = data.error;
            errorElement.setAttribute('aria-hidden', 'false');
            inputs.forEach(input => {
                input.value = '';
                input.classList.remove('has-value');
                input.disabled = true;
            });
        } else {
            // Handle invalid PIN
            const message = data.attemptsLeft > 0 
                ? `Incorrect PIN. ${data.attemptsLeft} attempts remaining.` 
                : 'Incorrect PIN. Last attempt before lockout.';
            
            errorElement.textContent = message;
            errorElement.setAttribute('aria-hidden', 'false');
            inputs.forEach(input => {
                input.value = '';
                input.classList.remove('has-value');
            });
            inputs[0].focus();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        errorElement.textContent = 'An error occurred. Please try again.';
        errorElement.setAttribute('aria-hidden', 'false');
    });
}

// Terminal initialization
function initTerminal() {
    const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 15,
        fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
        theme: {
            background: getComputedStyle(document.documentElement).getPropertyValue('--terminal-bg').trim(),
            foreground: getComputedStyle(document.documentElement).getPropertyValue('--terminal-text').trim(),
            cursor: getComputedStyle(document.documentElement).getPropertyValue('--terminal-cursor').trim(),
            selectionBackground: getComputedStyle(document.documentElement).getPropertyValue('--terminal-selection').trim(),
            // Warp-like color scheme
            black: '#1C1C1C',
            red: '#FF6B6B',
            green: '#4FD6BE',
            yellow: '#F9C859',
            blue: '#6B95FF',
            magenta: '#FF75B5',
            cyan: '#4FF2F8',
            white: '#E0E0E0',
            brightBlack: '#666666',
            brightRed: '#FF8383',
            brightGreen: '#89FFDD',
            brightYellow: '#FFD866',
            brightBlue: '#89A9FF',
            brightMagenta: '#FF8DC7',
            brightCyan: '#89FFFF',
            brightWhite: '#FFFFFF'
        },
        allowTransparency: true,
        macOptionIsMeta: true,
        scrollback: 5000,
        minimumContrastRatio: 4.5,
        cursorStyle: 'bar',
        cursorWidth: 2,
        letterSpacing: 0.5,
        lineHeight: 1.2,
        windowOptions: {
            setWinSize: true
        },
        // Make terminal text slightly brighter for better readability
        allowProposedApi: true,
        rightClickSelectsWord: true
    });

    // Initialize addons
    const fitAddon = new FitAddon.FitAddon();
    const webLinksAddon = new WebLinksAddon.WebLinksAddon();
    const webglAddon = new WebglAddon.WebglAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    
    // Try to load WebGL, fallback gracefully if it fails
    try {
        terminal.loadAddon(webglAddon);
    } catch (e) {
        console.warn('WebGL addon could not be loaded:', e);
    }

    // Open terminal in the container
    terminal.open(document.getElementById('terminal'));
    fitAddon.fit();

    // WebSocket connection management
    let ws = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 1000; // Start with 1 second

    function connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}`);

        ws.onopen = () => {
            reconnectAttempts = 0; // Reset reconnect attempts on successful connection
            terminal.writeln('Connected to terminal server...');
            terminal.focus();
        };

        ws.onclose = () => {
            if (reconnectAttempts < maxReconnectAttempts) {
                terminal.writeln('\r\nConnection lost. Attempting to reconnect...');
                setTimeout(() => {
                    reconnectAttempts++;
                    connectWebSocket();
                }, reconnectDelay * Math.pow(2, reconnectAttempts)); // Exponential backoff
            } else {
                terminal.writeln('\r\nConnection lost. Please refresh the page to reconnect.');
            }
        };

        ws.onerror = () => {
            terminal.writeln('\r\nWebSocket error occurred.');
        };

        // Handle server output
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'output') {
                terminal.write(message.data);
            }
        };
    }

    // Initialize WebSocket connection
    connectWebSocket();

    // Handle terminal input with connection check
    terminal.onData(data => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'input',
                data: data
            }));
        } else {
            terminal.writeln('\r\nConnection not available. Attempting to reconnect...');
            if (reconnectAttempts < maxReconnectAttempts) {
                connectWebSocket();
            }
        }
    });

    // Handle terminal resize with connection check
    terminal.onResize(size => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'resize',
                cols: size.cols,
                rows: size.rows
            }));
        }
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            if (!ws || ws.readyState === WebSocket.CLOSED) {
                reconnectAttempts = 0; // Reset attempts when page becomes visible
                connectWebSocket();
            }
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        fitAddon.fit();
        // Ensure terminal size is updated after resize
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'resize',
                cols: terminal.cols,
                rows: terminal.rows
            }));
        }
    });

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        if (ws) {
            ws.close();
        }
    });

    // Update terminal colors when theme changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') {
                const computedStyle = getComputedStyle(document.documentElement);
                terminal.options.theme = {
                    ...terminal.options.theme,
                    background: computedStyle.getPropertyValue('--terminal-bg').trim(),
                    foreground: computedStyle.getPropertyValue('--terminal-text').trim(),
                    cursor: computedStyle.getPropertyValue('--terminal-cursor').trim(),
                    selectionBackground: computedStyle.getPropertyValue('--terminal-selection').trim(),
                };
            }
        });
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });

    return terminal;
}

// Initialize functionality
document.addEventListener('DOMContentLoaded', () => {
    // Set site title
    const siteTitle = window.appConfig?.siteTitle || 'DumbTitle';
    document.getElementById('pageTitle').textContent = siteTitle;
    document.getElementById('siteTitle').textContent = siteTitle;
    
    initThemeToggle();
    setupPinInputs();
    
    const registerServiceWorker = () => {
        // Register PWA Service Worker
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register(joinPath('service-worker.js'))
                .then((reg) => console.log("Service Worker registered:", reg.scope))
                .catch((err) => console.log("Service Worker registration failed:", err));
        }
    }

    async function initialize() {
        if (document.getElementById('terminal')) {
            initTerminal();
        }
        registerServiceWorker();
    };
    
    initialize();
});