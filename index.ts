import type { Express, Request, Response, NextFunction } from 'express';
import { Server as HTTPServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import * as chokidar from 'chokidar';
import * as ejs from 'ejs';
import * as path from 'path';
import express from 'express';
import { ScriptProcessor } from './utils/scriptProcessor.js';

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
  devTools?: boolean;
}

// Default options
const defaultOptions: ReactExpressOptions = {
  viewsDir: 'views',
  hmr: process.env.NODE_ENV !== 'production',
  devTools: process.env.NODE_ENV !== 'production'
};

export function reactExpress(options: ReactExpressOptions = {}) {
  const state = new StateManager();
  let io: SocketServer | null = null;

  // Merge options with defaults
  const mergedOptions = { ...defaultOptions, ...options };

  return function(app: Express) {
    // Set up EJS
    app.set('view engine', 'ejs');
    if (mergedOptions.viewsDir) {
      app.set('views', mergedOptions.viewsDir);
    }

    // Inject client-side code
    app.use('/__react-express', express.static(path.join(__dirname, '../dist')));
    app.use('/__react-express', express.static(path.join(__dirname, '../client')));

    // Handle placeholder template requests
    app.get('/__react-express/placeholder/*', (req, res) => {
      // Remove leading slash and /__react-express/placeholder prefix
      const placeholderPath = req.path
        .replace('/__react-express/placeholder', '')
        .replace(/^\//, '');  // Remove leading slash
      
      const viewsDir = mergedOptions.viewsDir || app.get('views');
      const fullPath = path.join(viewsDir, placeholderPath);
      
      // Render the placeholder template
      app.render(placeholderPath, { ...mergedOptions, __reactExpressState: state }, (err, html) => {
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

        // Process scripts in the HTML
        const { processedHtml } = ScriptProcessor.processScripts(html);

        // Inject our client-side code
        const injectedHtml = processedHtml.replace(
          '</head>', 
          `<script src="/socket.io/socket.io.js" defer></script>
          <script type="module" defer>
            const socket = io();
            
            // Import bundled ReactExpress
            import  '/__react-express/react-express.bundle.js';
            
            // Initialize components
            await ReactExpress.initState(socket);
            ReactExpress.LoaderManager.init();
            await ReactExpress.initSuspense();
            await ReactExpress.initHMR(socket);

        
          </script>\n</head>`
        );

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
      if (mergedOptions.hmr) {
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
