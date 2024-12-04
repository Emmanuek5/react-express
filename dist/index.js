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
        app.use('/__react-express', express.static(path.join(__dirname, '../dist')));
        app.use('/__react-express', express.static(path.join(__dirname, '../client')));
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
                // Process scripts in the HTML
                const { processedHtml } = ScriptProcessor.processScripts(html);
                // Inject our client-side code
                const injectedHtml = `
          ${processedHtml}
          <script src="/socket.io/socket.io.js" defer></script>
          <script type="module" defer>
            const socket = io();
            
            // Import bundled ReactExpress
            import '/__react-express/react-express.bundle.js';
            
            // Initialize components
            await ReactExpress.initState(socket);
            ReactExpress.LoaderManager.init();
            await ReactExpress.initSuspense();
            await ReactExpress.initHMR(socket);
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
                    console.log('File changed:', filepath);
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