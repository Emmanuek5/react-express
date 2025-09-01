import { Server as HTTPServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import * as chokidar from 'chokidar';
import * as path from 'path';
import express from 'express';
import { ScriptProcessor } from './utils/scriptProcessor.js';
class StateManager {
    constructor() {
        this.state = new Map();
        this.subscribers = new Set();
    }
    getStates() {
        return this.state;
    }
    setState(key, value) {
        this.state.set(key, value);
        this.notifySubscribers(key, value);
    }
    getState(key) {
        return this.state.get(key);
    }
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }
    notifySubscribers(key, value) {
        this.subscribers.forEach(callback => callback(key, value));
    }
}
// Default options
const defaultOptions = {
    viewsDir: 'views',
    hmr: process.env.NODE_ENV !== 'production',
    devTools: process.env.NODE_ENV !== 'production'
};
export function reactExpress(options = {}) {
    const state = new StateManager();
    let io = null;
    // Merge options with defaults
    const mergedOptions = { ...defaultOptions, ...options };
    return function (app) {
        // Set up EJS
        app.set('view engine', 'ejs');
        if (mergedOptions.viewsDir) {
            app.set('views', mergedOptions.viewsDir);
        }
        // Inject client-side code
        app.use('/__react-express', express.static(path.join(__dirname, '../dist')));
        app.use('/__react-express', express.static(path.join(__dirname, '../client')));
        // Handle placeholder template requests (dev-only, HMR)
        if (mergedOptions.hmr) {
            app.get('/__react-express/placeholder/*', (req, res) => {
                // Derive relative template path
                const rawPath = req.path
                    .replace('/__react-express/placeholder', '')
                    .replace(/^\//, '');
                const viewsDir = mergedOptions.viewsDir || app.get('views');
                const resolvedViews = path.resolve(viewsDir);
                const normalized = path.normalize(rawPath);
                const fullPath = path.resolve(path.join(viewsDir, normalized));
                // Prevent traversal outside viewsDir
                if (!fullPath.startsWith(resolvedViews + path.sep) && fullPath !== resolvedViews) {
                    res.status(400).send('');
                    return;
                }
                // Render the placeholder template
                app.render(normalized, { ...mergedOptions, __reactExpressState: state }, (err, html) => {
                    if (err) {
                        console.error('Error loading placeholder:', err);
                        res.status(404).send('');
                        return;
                    }
                    res.send(html);
                });
            });
        }
        // Add state manager to request object
        app.use((req, res, next) => {
            req.reactState = state;
            next();
        });
        // Add middleware to detect AJAX requests
        app.use((req, res, next) => {
            req.isAjax = req.xhr || (req.headers['x-requested-with'] === 'XMLHttpRequest');
            next();
        });
        // Override res.render to inject our client code
        const originalRender = app.response.render;
        app.response.render = function (view, options = {}, callback) {
            // If the second argument is a function, it's the callback
            if (typeof options === 'function') {
                callback = options;
                options = {};
            }
            // Create wrapper callback that will inject our client code
            const wrappedCallback = (err, html) => {
                if (err) {
                    if (callback) {
                        callback(err, html);
                    }
                    else {
                        throw err;
                    }
                    return;
                }
                // Process scripts in the HTML
                const { processedHtml } = ScriptProcessor.processScripts(html);
                // Inject our client-side code
                const injectedHtml = processedHtml.replace('</head>', `${mergedOptions.hmr ? '<script src="/socket.io/socket.io.js" defer></script>' : ''}
          <script type="module" defer>
            // Dev flag for client (used by Error Overlay and dev-only features)
            window.ReactExpress = window.ReactExpress || {};
            window.ReactExpress.__DEV__ = ${mergedOptions.hmr ? 'true' : 'false'};

            const socket = ${mergedOptions.hmr ? 'io()' : 'null'};
            
            // Import bundled ReactExpress
            import '/__react-express/react-express.bundle.js';
            
            // Initialize components
            await ReactExpress.initState(socket);
            ReactExpress.LoaderManager.init();
            ${mergedOptions.hmr ? 'ReactExpress.initHMR(socket);' : ''}
          </script>\n</head>`);
                if (callback) {
                    //@ts-ignore
                    callback(null, injectedHtml);
                }
                else {
                    this.send(injectedHtml);
                }
            };
            // Call original render with our wrapped callback
            //@ts-ignore
            originalRender.call(this, view, { ...options, __reactExpressState: state }, wrappedCallback);
        };
        // Modify the render method to handle AJAX requests
        app.use((req, res, next) => {
            const originalRender = res.render;
            res.render = function (view, options = {}, callback) {
                if (req.isAjax) {
                    options = { ...options, layout: false }; // Don't use layout for AJAX requests
                }
                //@ts-ignore
                originalRender.call(this, view, options, callback);
            };
            next();
        });
        // Set up WebSocket if server is available
        if (app.get('server') instanceof HTTPServer) {
            const server = app.get('server');
            io = new SocketServer(server);
            io.on('connection', (socket) => {
                const unsubscribe = state.subscribe((key, value) => {
                    socket.emit('state:update', { key, value });
                });
                socket.on('state:update', ({ key, value }) => {
                    state.setState(key, value);
                });
                socket.on('disconnect', unsubscribe);
            });
            // Set up HMR if enabled
            if (mergedOptions.hmr) {
                const watcher = chokidar.watch(app.get('views'), {
                    ignored: /(^|[\/\\])\../,
                    persistent: true
                });
                let hmrTimer = null;
                let lastPath = null;
                watcher.on('change', (filepath) => {
                    lastPath = filepath;
                    if (hmrTimer)
                        clearTimeout(hmrTimer);
                    hmrTimer = setTimeout(() => {
                        io?.emit('hmr:update', {
                            path: path.relative(process.cwd(), lastPath),
                            timestamp: Date.now()
                        });
                    }, 100);
                });
            }
        }
    };
}
//# sourceMappingURL=index.js.map