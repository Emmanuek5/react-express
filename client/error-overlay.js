// Dev-only Error Overlay for React Express
(function () {
  // Guard: only enable in dev
  const isDev = () => {
    try { return !!(window.ReactExpress && window.ReactExpress.__DEV__); } catch { return false; }
  };
  const MAX_ERRORS = 200;

  class ErrorOverlayUI {
    constructor() {
      this.container = null;
      this.minimized = null;
      this.visible = false;
      this.errors = [];
      this.index = -1;
      this.ensureContainer();
      this.ensureMinimized();
    }

    ensureContainer() {
      if (this.container) return;
      const el = document.createElement('div');
      el.id = '__react_express_error_overlay';
      el.setAttribute('aria-live', 'assertive');
      el.style.cssText = [
        'position: fixed',
        'inset: 0',
        'z-index: 2147483647',
        'background: rgba(0,0,0,0.8)',
        'backdrop-filter: blur(4px)',
        'color: #fff',
        'font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
        'display: none',
        'animation: fadeIn 0.2s ease-out',
      ].join(';');

      el.innerHTML = `
        <style>
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { transform: translate(-50%, -40%); opacity: 0; } to { transform: translate(-50%, -50%); opacity: 1; } }
          #__rexo_modal { animation: slideUp 0.3s ease-out; }
          #__rexo_modal button:hover { background: #4a4a4a !important; transform: translateY(-1px); }
          #__rexo_modal button:active { transform: translateY(0); }
        </style>
        <div id="__rexo_modal" style="
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: min(1000px, 92vw);
          max-height: 85vh;
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          border: 1px solid #404040;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1);
          overflow: hidden;
        ">
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            background: linear-gradient(90deg, #ff4757 0%, #ff3742 100%);
            color: white;
            font-weight: 600;
          ">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 18px;">⚠️ Runtime Errors</div>
              <div id="__rexo_counter" style="
                font-size: 13px;
                background: rgba(255,255,255,0.2);
                padding: 4px 8px;
                border-radius: 12px;
                font-weight: 500;
              "></div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button id="__rexo_prev" title="Previous Error" style="
                background: rgba(255,255,255,0.15);
                border: none;
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease;
              ">← Prev</button>
              <button id="__rexo_next" title="Next Error" style="
                background: rgba(255,255,255,0.15);
                border: none;
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease;
              ">Next →</button>
              <button id="__rexo_clear" title="Clear All Errors" style="
                background: rgba(255,255,255,0.15);
                border: none;
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease;
              ">Clear</button>
              <button id="__rexo_close" aria-label="Close" style="
                background: rgba(255,255,255,0.15);
                border: none;
                color: white;
                font-size: 16px;
                padding: 8px 10px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
              ">✕</button>
            </div>
          </div>
          <div style="
            max-height: calc(85vh - 80px);
            overflow: auto;
            background: #1e1e1e;
          ">
            <pre id="__rexo_body" style="
              margin: 0;
              padding: 24px;
              white-space: pre-wrap;
              line-height: 1.6;
              font-size: 14px;
              color: #e8e8e8;
              background: #1e1e1e;
            "></pre>
          </div>
        </div>`;

      document.documentElement.appendChild(el);

      el.querySelector('#__rexo_close').addEventListener('click', () => this.hide());
      el.querySelector('#__rexo_prev').addEventListener('click', () => this.prev());
      el.querySelector('#__rexo_next').addEventListener('click', () => this.next());
      el.querySelector('#__rexo_clear').addEventListener('click', () => this.clear());
      this.container = el;
    }

    ensureMinimized() {
      if (this.minimized) return;
      const el = document.createElement('div');
      el.id = '__react_express_error_minimized';
      el.style.cssText = [
        'position: fixed',
        'bottom: 20px',
        'left: 20px',
        'z-index: 2147483646',
        'background: linear-gradient(135deg, #ff4757 0%, #ff3742 100%)',
        'color: white',
        'padding: 12px 16px',
        'border-radius: 8px',
        'box-shadow: 0 4px 20px rgba(255, 71, 87, 0.4), 0 0 0 1px rgba(255,255,255,0.1)',
        'cursor: pointer',
        'font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
        'font-size: 13px',
        'font-weight: 600',
        'display: none',
        'transition: all 0.2s ease',
        'user-select: none',
      ].join(';');

      el.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">⚠️</span>
          <span id="__rexo_mini_text">1 Error</span>
        </div>
      `;

      el.addEventListener('click', () => this.show());
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = '0 6px 25px rgba(255, 71, 87, 0.5), 0 0 0 1px rgba(255,255,255,0.2)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 4px 20px rgba(255, 71, 87, 0.4), 0 0 0 1px rgba(255,255,255,0.1)';
      });

      document.documentElement.appendChild(el);
      this.minimized = el;
    }

    formatError(err) {
      if (!err) return 'Unknown error';
      if (typeof err === 'string') return err;
      const name = err.name || 'Error';
      const msg = err.message || String(err);
      const stack = err.stack || '';
      
      // Enhanced formatting with syntax highlighting hints
      let formatted = `${name}: ${msg}\n\n`;
      if (stack) {
        // Clean up stack trace for better readability
        const cleanStack = stack
          .split('\n')
          .filter(line => line.trim())
          .map(line => line.replace(/^\s*at\s+/, '  → '))
          .join('\n');
        formatted += cleanStack;
      }
      return formatted;
    }

    updateCounter() {
      const c = this.container?.querySelector('#__rexo_counter');
      const mini = this.minimized?.querySelector('#__rexo_mini_text');
      
      if (c) {
        c.textContent = this.errors.length ? `${this.index + 1} / ${this.errors.length}` : '0 / 0';
      }
      
      if (mini) {
        const count = this.errors.length;
        mini.textContent = count === 1 ? '1 Error' : `${count} Errors`;
      }
    }

    updateMinimizedVisibility() {
      if (!this.minimized) return;
      
      if (this.errors.length > 0 && !this.visible) {
        this.minimized.style.display = 'block';
      } else {
        this.minimized.style.display = 'none';
      }
    }

    render() {
      if (!this.container) return;
      const pre = this.container.querySelector('#__rexo_body');
      if (this.errors.length === 0) {
        pre.textContent = 'No errors to display';
        this.updateCounter();
        return;
      }
      const curr = this.errors[this.index];
      let content = this.formatError(curr.error);
      
      if (curr.meta) {
        content += `\n\n━━━ Additional Info ━━━\n${JSON.stringify(curr.meta, null, 2)}`;
      }
      
      pre.textContent = content;
      this.updateCounter();
    }

    show() {
      if (!isDev()) return;
      this.ensureContainer();
      this.container.style.display = 'block';
      this.visible = true;
      this.updateMinimizedVisibility();
      this.render();
    }

    hide() {
      if (!this.container) return;
      this.container.style.display = 'none';
      this.visible = false;
      this.updateMinimizedVisibility();
    }

    clear() {
      this.errors = [];
      this.index = -1;
      this.render();
      this.hide();
      this.updateMinimizedVisibility();
    }

    log(error, meta = null) {
      if (!isDev()) return;
      // Deduplicate if identical to last entry
      const formatted = this.formatError(error);
      const last = this.errors[this.errors.length - 1];
      if (last) {
        try {
          const lastFormatted = this.formatError(last.error);
          if (lastFormatted === formatted) {
            // Update meta/time but skip new entry
            last.meta = meta;
            last.time = Date.now();
            this.index = this.errors.length - 1;
            if (!this.visible) {
              this.updateMinimizedVisibility();
              this.updateCounter();
            } else {
              this.render();
            }
            return;
          }
        } catch {}
      }
      this.errors.push({ error, meta, time: Date.now() });
      // Cap queue size, drop oldest
      if (this.errors.length > MAX_ERRORS) this.errors.shift();
      this.index = this.errors.length - 1;
      
      if (!this.visible) {
        this.updateMinimizedVisibility();
        this.updateCounter();
      } else {
        this.render();
      }
    }

    next() {
      if (this.errors.length === 0) return;
      this.index = (this.index + 1) % this.errors.length;
      this.render();
    }

    prev() {
      if (this.errors.length === 0) return;
      this.index = (this.index - 1 + this.errors.length) % this.errors.length;
      this.render();
    }
  }

  const overlay = new ErrorOverlayUI();

  // Global API
  window.ReactExpress = window.ReactExpress || {};
  window.ReactExpress.ErrorOverlay = {
    show: () => overlay.show(),
    log: (e, meta) => overlay.log(e, meta),
    hide: () => overlay.hide(),
    next: () => overlay.next(),
    prev: () => overlay.prev(),
    clear: () => overlay.clear(),
  };

  // Wire global listeners (dev-only)
  const attachListeners = () => {
    if (!isDev()) return;

    window.addEventListener('error', (ev) => {
      const err = ev.error || new Error(ev.message);
      overlay.log(err, { type: 'error', filename: ev.filename, lineno: ev.lineno, colno: ev.colno });
    });

    window.addEventListener('unhandledrejection', (ev) => {
      const reason = ev.reason;
      overlay.log(reason instanceof Error ? reason : new Error(String(reason)), { type: 'unhandledrejection' });
    });

    window.addEventListener('hmr:updated', (ev) => {
      try {
        const detail = ev && ev.detail || {};
        if (detail.success) {
          if (!overlay.errors || overlay.errors.length === 0) {
            overlay.hide();
          } else {
            overlay.render();
          }
        } else if (detail.error) {
          overlay.log(detail.error, { type: 'hmr' });
        }
      } catch {}
    });

    // Keyboard navigation when overlay visible
    window.addEventListener('keydown', (ev) => {
      if (!overlay.visible) return;
      if (ev.key === 'ArrowRight') { ev.preventDefault(); overlay.next(); }
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); overlay.prev(); }
      if (ev.key === 'Escape') { ev.preventDefault(); overlay.hide(); }
    });

    // Proxy console.error to also feed overlay (non-blocking)
    try {
      const nativeError = console.error.bind(console);
      console.error = (...args) => {
        nativeError(...args);
        try {
          const found = args.find(a => a instanceof Error);
          const err = found instanceof Error
            ? found
            : new Error(args.map(a => {
                try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); }
              }).join(' '));
          overlay.log(err, { type: 'console.error' });
        } catch {}
      };
    } catch {}
  };

  // Defer until DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachListeners);
  } else {
    attachListeners();
  }
})();