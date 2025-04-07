export default class TerminalManager {
    constructor(isMacOS, setupToolTips) {
        this.terminals = new Map();
        this.activeTabId = null;
        this.tabCounter = 0;
        this.isMacOS = isMacOS;
        this.setupToolTips = setupToolTips;
        
        // Bind event handlers
        this.handleNewTab = this.handleNewTab.bind(this);
        this.handleTabClick = this.handleTabClick.bind(this);
        this.handleTabClose = this.handleTabClose.bind(this);
        
        // Set up event listeners
        const newTabButton = document.querySelector('.new-tab-button');
        if (newTabButton) {
            newTabButton.addEventListener('click', this.handleNewTab);
        }

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ignore shortcuts when in login page
            if (document.getElementById('pinForm')) return;
            
            // Don't handle shortcuts when typing in terminal
            // commenting out but keeping in here in case needed later
            // if (e.target.closest('.xterm')) return;

            const windowsModifier = e.ctrlKey;
            const macModifier = e.metaKey;
            const modifier = isMacOS ? macModifier && e.ctrlKey : windowsModifier && e.altKey;

            // Command/Control + T: New tab
            if (modifier && e.key === 't') {
                e.preventDefault();
                this.handleNewTab();
            }
            // Command/Control + W: Close current tab
            else if (modifier && e.key === 'w') {
                e.preventDefault();
                if (this.activeTabId !== null) {
                    this.handleTabClose(this.activeTabId);
                }
            }
            // Command/Control + Number: Switch to tab
            else if ((modifier && /^[1-9]$/.test(e.key))) {
                e.preventDefault();
                const tabIndex = parseInt(e.key) - 1;
                const tabIds = Array.from(this.terminals.keys());
                if (tabIds[tabIndex]) {
                    this.activateTab(tabIds[tabIndex]);
                }
            }
        });
    }

    createTab(id) {
        const tabList = document.querySelector('.tab-list');
        const tab = document.createElement('div');
        tab.className = 'terminal-tab';
        tab.dataset.tabId = id;

        const closeShortcut = this.isMacOS ? 'ctrl+cmd+w' : 'ctrl+alt+w';
        tab.innerHTML = `
            <span>Term${id + 1}</span>
            <button class="close-tab" aria-label="Close terminal" data-tooltip="Close ({shortcut})" data-shortcuts='{"win": "ctrl+alt+w", "mac": "ctrl+cmd+w"}'></button>
        `;
        
        tab.addEventListener('click', () => this.handleTabClick(id));
        tab.querySelector('.close-tab').addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleTabClose(id);
        });

        
        tabList.appendChild(tab);
        this.setupToolTips(document.querySelectorAll(".close-tab"));
        return tab;
    }

    createTerminalContainer(id) {
        const container = document.createElement('div');
        container.id = `terminal-${id}`;
        document.querySelector('.terminals-container').appendChild(container);
        return container;
    }

    async handleNewTab() {
        const id = this.tabCounter++;
        const tab = this.createTab(id);
        const container = this.createTerminalContainer(id);
        const terminal = this.initTerminal(container);
        
        this.terminals.set(id, { tab, container, terminal });
        this.activateTab(id);
    }

    handleTabClick(id) {
        this.activateTab(id);
    }

    handleTabClose(id) {
        const terminal = this.terminals.get(id);
        if (!terminal) return;

        const tooltips = document.body.querySelectorAll('.tooltip');
        tooltips.forEach(tt => tt.classList.remove('show'));
        
        const wasActive = this.activeTabId === id;

        // Clean up terminal first
        terminal.terminal.dispose();
        terminal.tab.remove();
        terminal.container.remove();
        this.terminals.delete(id);

        // If we just closed the active tab and there are other tabs, activate the last remaining tab
        if (wasActive && this.terminals.size > 0) {
            const remainingTabs = Array.from(this.terminals.keys());
            const lastTab = remainingTabs[remainingTabs.length - 1];
            this.activateTab(lastTab);
        }

        // If no tabs left, reset counter and create a new tab
        if (this.terminals.size === 0) {
            this.tabCounter = 0; // Reset counter so the next tab will be Term1
            this.handleNewTab();
        }
    }

    getNextTab(currentId) {
        const ids = Array.from(this.terminals.keys());
        const currentIndex = ids.indexOf(currentId);
        
        if (currentIndex === -1) return null;
        
        // Try to get next tab, if not available get previous
        return ids[currentIndex + 1] || ids[currentIndex - 1] || null;
    }

    activateTab(id) {
        // Deactivate current tab
        if (this.activeTabId !== null) {
            const current = this.terminals.get(this.activeTabId);
            if (current) {
                current.tab.classList.remove('active');
                current.container.classList.remove('active');
            }
        }

        // Activate new tab
        const next = this.terminals.get(id);
        if (next) {
            next.tab.classList.add('active');
            next.container.classList.add('active');
            next.terminal.focus();
            this.activeTabId = id;
        }
    }

    // Terminal initialization
    initTerminal(container) {
        const terminal = new Terminal({
            cursorBlink: true,
            fontSize: 15,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
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
            minimumContrastRatio: 50,
            cursorStyle: 'block',
            cursorWidth: 1.5,
            letterSpacing: 0.5,
            lineHeight: 1.2,
            windowOptions: {
                setWinSize: true
            },
            allowProposedApi: true,
            rightClickSelectsWord: true,
            convertEol: true,
            termProgram: 'xterm-256color'
        });

        // Initialize addons
        const fitAddon = new FitAddon.FitAddon();
        const webLinksAddon = new WebLinksAddon.WebLinksAddon();
        const webglAddon = new WebglAddon.WebglAddon();
        const canvasAddon = new CanvasAddon.CanvasAddon();
        const imageAddon = new ImageAddon.ImageAddon();
        const ligaturesAddon = new LigaturesAddon.LigaturesAddon();
        const searchAddon = new SearchAddon.SearchAddon();
        const serializeAddon = new SerializeAddon.SerializeAddon();
        const unicode11Addon = new Unicode11Addon.Unicode11Addon();

        // Open terminal in the container first
        terminal.open(container);

        // Load Unicode support first
        terminal.loadAddon(unicode11Addon);
        terminal.unicode.activeVersion = '11';

        // Then load other addons
        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);
        terminal.loadAddon(searchAddon);
        terminal.loadAddon(serializeAddon);

        // Try to load WebGL first, fallback to Canvas if it fails
        try {
            terminal.loadAddon(webglAddon);
            webglAddon.onContextLoss(e => {
                console.warn('WebGL context lost, falling back to canvas renderer');
                terminal.loadAddon(canvasAddon);
            });
        } catch (e) {
            console.warn('WebGL addon could not be loaded, using canvas renderer:', e);
            terminal.loadAddon(canvasAddon);
        }

        // Load remaining addons
        terminal.loadAddon(imageAddon);
        try {
            terminal.loadAddon(ligaturesAddon);
        } catch (e) {
            console.warn('Ligatures addon could not be loaded:', e);
        }

        fitAddon.fit();

        // Add search functionality with Ctrl+Alt+F or Cmd+Alt+F
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                
                let searchBox = document.getElementById('terminal-search');
                if (!searchBox) {
                    const searchContainer = document.createElement('div');
                    searchContainer.className = 'terminal-search-container';
                    searchContainer.innerHTML = `
                        <input type="text" id="terminal-search" placeholder="Search...">
                        <div class="search-buttons">
                            <button id="search-prev">↑</button>
                            <button id="search-next">↓</button>
                            <button id="search-close">×</button>
                        </div>
                    `;
                    document.querySelector('.container').appendChild(searchContainer);
                    
                    const input = searchContainer.querySelector('#terminal-search');
                    const prevBtn = searchContainer.querySelector('#search-prev');
                    const nextBtn = searchContainer.querySelector('#search-next');
                    const closeBtn = searchContainer.querySelector('#search-close');
                    
                    let searchTimeout;
                    input.addEventListener('input', () => {
                        const searchTerm = input.value;
                        // Debounce search to avoid performance issues
                        clearTimeout(searchTimeout);
                        searchTimeout = setTimeout(() => {
                            if (searchTerm) {
                                try {
                                    searchAddon.findNext(searchTerm);
                                } catch (e) {
                                    console.warn('Search failed:', e);
                                }
                            }
                        }, 200);
                    });
                    
                    prevBtn.addEventListener('click', () => {
                        try {
                            searchAddon.findPrevious(input.value);
                        } catch (e) {
                            console.warn('Search failed:', e);
                        }
                    });
                    
                    nextBtn.addEventListener('click', () => {
                        try {
                            searchAddon.findNext(input.value);
                        } catch (e) {
                            console.warn('Search failed:', e);
                        }
                    });
                    
                    closeBtn.addEventListener('click', () => {
                        searchContainer.remove();
                        terminal.focus();
                    });
                    
                    input.addEventListener('keydown', (e) => {
                        switch(e.key) {
                            case 'Enter':
                                e.preventDefault();
                                try {
                                    if (e.shiftKey) {
                                        searchAddon.findPrevious(input.value);
                                    } else {
                                        searchAddon.findNext(input.value);
                                    }
                                } catch (e) {
                                    console.warn('Search failed:', e);
                                }
                                break;
                            case 'Escape':
                                searchContainer.remove();
                                terminal.focus();
                                e.preventDefault();
                                break;
                        }
                    });
                    
                    input.focus();
                } else {
                    searchBox.focus();
                }
            }
        });

        // WebSocket connection management
        let ws;
        const maxReconnectAttempts = 5;
        const baseReconnectDelay = 1000;
        let reconnectAttempts = 0;

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const basePath = window.appConfig?.basePath || '';
            
            // Create WebSocket connection - cookies will be automatically included
            ws = new WebSocket(`${protocol}//${window.location.host}${basePath}`);

            // Set a generous timeout for the initial connection
            const connectionTimeout = setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) {
                    ws.close();
                    handleReconnect();
                }
            }, 5000);

            ws.onopen = () => {
                clearTimeout(connectionTimeout);
                reconnectAttempts = 0;
                // terminal.writeln('Connected to terminal server...'); // add a message here on first connect
                terminal.focus();
                
                // Start sending heartbeats
                startHeartbeat();
            };

            ws.onclose = (event) => {
                handleReconnect(event);
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                ws.close();
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'output') {
                        terminal.write(message.data);
                    }
                } catch (e) {
                    console.error('Error processing message:', e);
                }
            };
        }

        function handleReconnect(event) {
            if (event && event.wasClean) {
                terminal.writeln('\r\nConnection closed normally.');
                return;
            }

            if (reconnectAttempts < maxReconnectAttempts) {
                const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
                terminal.writeln('\r\nConnection lost. Attempting to reconnect...');
                setTimeout(() => {
                    reconnectAttempts++;
                    connectWebSocket();
                }, delay);
            } else {
                terminal.writeln('\r\nConnection lost. Please refresh the page to reconnect.');
            }
        }

        // Heartbeat mechanism
        function startHeartbeat() {
            const heartbeatInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'heartbeat' }));
                } else {
                    clearInterval(heartbeatInterval);
                }
            }, 10000);

            // Clean up interval when connection closes
            ws.addEventListener('close', () => {
                clearInterval(heartbeatInterval);
            });
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
}