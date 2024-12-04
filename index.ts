import type { Express, Request, Response, NextFunction } from 'express';
import { Server as HTTPServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import * as chokidar from 'chokidar';
import * as ejs from 'ejs';
import * as path from 'path';
import express from 'express';

declare global {
  namespace Express {
    interface Request {
      reactState: StateManager;
      isAjax: boolean;
    }
  }
}

class StateManager {
  private state: Map<string, any> = new Map();
  private subscribers: Set<(key: string, value: any) => void> = new Set();


  getStates() {
    return this.state;
  }

  setState(key: string, value: any) {
    this.state.set(key, value);
    this.notifySubscribers(key, value);
  }

  getState(key: string) {
    return this.state.get(key);
  }

  subscribe(callback: (key: string, value: any) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(key: string, value: any) {
    this.subscribers.forEach(callback => callback(key, value));
  }
}

interface ReactExpressOptions {
  viewsDir?: string;
  hmr?: boolean;
}

export function reactExpress(options: ReactExpressOptions = {}) {
  const state = new StateManager();
  let io: SocketServer | null = null;

  return function(app: Express) {
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
        .replace(/^\//, '');  // Remove leading slash
      
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
    app.use((req: Request, res: Response, next: NextFunction) => {
      req.reactState = state;
      next();
    });

    // Add middleware to detect AJAX requests
    app.use((req: Request, res: Response, next: NextFunction) => {
      req.isAjax = req.xhr || (req.headers['x-requested-with'] === 'XMLHttpRequest');
      next();
    });

    // Override res.render to inject our client code
    const originalRender = app.response.render;
    app.response.render = function(view: string, options: any = {}, callback?: (err: Error, html: string) => void): void {
      // If the second argument is a function, it's the callback
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }

      // Create wrapper callback that will inject our client code
      const wrappedCallback = (err: Error | null, html: string) => {
        if (err) {
          if (callback) {
            callback(err, html);
          } else {
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

            // Import and initialize state
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
        } else {
          this.send(injectedHtml);
        }
      };

      // Call original render with our wrapped callback
      //@ts-ignore
      originalRender.call(this, view, { ...options, __reactExpressState: state }, wrappedCallback);
    };

    // Modify the render method to handle AJAX requests
    app.use((req: Request, res: Response, next: NextFunction) => {
      const originalRender = res.render;
      res.render = function(view: string, options: any = {}, callback?: (err: Error, html: string) => void) {
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
