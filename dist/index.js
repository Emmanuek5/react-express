import { Server as HTTPServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import * as chokidar from 'chokidar';
import * as path from 'path';
import express from 'express';
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
export function reactExpress(options = {}) {
    const state = new StateManager();
    let io = null;
    return function (app) {
        // Set up EJS
        app.set('view engine', 'ejs');
        if (options.viewsDir) {
            app.set('views', options.viewsDir);
        }
        // Inject client-side code
        app.use('/__react-express', express.static(path.join(__dirname, 'client')));
        // Handle placeholder template requests
        app.get('/__react-express/placeholder/*', (req, res) => {
            // Remove leading slash and /__react-express/placeholder prefix
            const placeholderPath = req.path
                .replace('/__react-express/placeholder', '')
                .replace(/^\//, ''); // Remove leading slash
            const viewsDir = options.viewsDir || app.get('views');
            const fullPath = path.join(viewsDir, placeholderPath);
            // Render the placeholder template
            app.render(placeholderPath, { ...options, __reactExpressState: state }, (err, html) => {
                if (err) {
                    console.error('Error loading placeholder:', err);
                    res.status(404).send('');
                    return;
                }
                res.send(html);
            });
        });
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
                // Inject our client-side code
                const injectedHtml = `
          ${html}
          <script src="/socket.io/socket.io.js"></script>
          <script type="module">
            const socket = io();

            // Import and initialize state first
            import { initState } from '/__react-express/state.js';
            await initState(socket);

            // Import and initialize suspense
            import { LoaderManager, initSuspense } from '/__react-express/suspense.js';
            LoaderManager.init();
            await initSuspense();

            // Import router (it self-initializes)
            import '/__react-express/router.js';

            // Initialize HMR last
            import { initHMR } from '/__react-express/hmr.js';
            await initHMR(socket);
          </script>
        `;
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
            if (options.hmr) {
                const watcher = chokidar.watch(app.get('views'), {
                    ignored: /(^|[\/\\])\../,
                    persistent: true
                });
                watcher.on('change', (filepath) => {
                    io?.emit('hmr:update', {
                        path: path.relative(process.cwd(), filepath),
                        timestamp: Date.now()
                    });
                });
            }
        }
    };
}
//# sourceMappingURL=index.js.map