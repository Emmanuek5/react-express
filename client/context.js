// Context API implementation for React Express
class Context {
  constructor(defaultValue) {
    this.defaultValue = defaultValue;
    this.subscribers = new Map();
    this.value = defaultValue;
  }

  Provider(value) {
    this.value = value;
    this.notifySubscribers();
    return {
      value,
      _isProvider: true,
      _context: this,
    };
  }

  Consumer(callback) {
    const id = Math.random().toString(36).substr(2, 9);
    this.subscribers.set(id, callback);
    callback(this.value);

    return {
      id,
      _isConsumer: true,
      _context: this,
    };
  }

  notifySubscribers() {
    this.subscribers.forEach((callback) => callback(this.value));
  }
}

// Initialize ReactExpress context system
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.createContext = (defaultValue) => {
  const ctx = new Context(defaultValue);
  // Notify listeners that a context was created (ordering-safe)
  try {
    window.dispatchEvent(new CustomEvent('react-express:context-created', { detail: { context: ctx } }));
  } catch {}
  return ctx;
};

// Idempotent boot across HMR
if (!window.ReactExpress.__contextInit) {
  window.ReactExpress.__contextInit = true;

  const logOverlay = (error, meta) => {
    try {
      window.ReactExpress &&
        window.ReactExpress.ErrorOverlay &&
        window.ReactExpress.ErrorOverlay.log(error, meta);
    } catch {}
  };

  const isContextLike = (obj) => !!(obj && typeof obj.Provider === 'function' && typeof obj.Consumer === 'function' && 'value' in obj);

  const resolveContext = (name) => {
    // Try common locations and casings
    const candidates = [];
    candidates.push(window[name]);
    candidates.push(window[name + 'Context']);
    const pascal = name && name[0] ? name[0].toUpperCase() + name.slice(1) : name;
    candidates.push(window[pascal + 'Context']);
    if (window.ReactExpress) {
      candidates.push(window.ReactExpress[name]);
      candidates.push(window.ReactExpress[name + 'Context']);
      if (window.ReactExpress.contexts && typeof window.ReactExpress.contexts === 'object') {
        candidates.push(window.ReactExpress.contexts[name]);
      }
    }
    return candidates.find((c) => (c instanceof Context) || isContextLike(c)) || null;
  };

  const bindProvider = (element) => {
    if (!(element instanceof HTMLElement)) return;
    if (element.dataset.ctxProviderBound === '1') return;
    const contextName = element.getAttribute('data-context');
    const contextValue = element.getAttribute('data-context-value');
    const ctx = resolveContext(contextName);
    if (!ctx) {
      // Retry later in case context is defined after DOM is ready
      if (!element.dataset.ctxProviderRetry) {
        element.dataset.ctxProviderRetry = '1';
        let attempts = 0;
        const retry = () => {
          if (element.dataset.ctxProviderBound === '1') return;
          const found = resolveContext(contextName);
          if (found) {
            try {
              found.Provider(element.getAttribute('data-context-value'));
              element.dataset.ctxProviderBound = '1';
              return;
            } catch (e) {
              logOverlay(e, { type: 'context', role: 'provider', contextName });
            }
          }
          if (++attempts < 20) setTimeout(retry, 100);
        };
        setTimeout(retry, 0);
      }
      return;
    }
    try {
      ctx.Provider(contextValue);
      element.dataset.ctxProviderBound = '1';
    } catch (e) {
      logOverlay(e, { type: 'context', role: 'provider', contextName });
    }

    // Watch for value mutations on this element only
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-context-value') {
          try {
            ctx.Provider(element.getAttribute('data-context-value'));
          } catch (e) {
            logOverlay(e, { type: 'context', role: 'provider-update', contextName });
          }
        }
      }
    });
    obs.observe(element, { attributes: true });
  };

  const bindConsumer = (element) => {
    if (!(element instanceof HTMLElement)) return;
    if (element.dataset.ctxConsumerBound === '1') return;
    const contextName = element.getAttribute('data-context-consumer');
    const ctx = resolveContext(contextName);
    if (!ctx) {
      if (!element.dataset.ctxConsumerRetry) {
        element.dataset.ctxConsumerRetry = '1';
        let attempts = 0;
        const retry = () => {
          if (element.dataset.ctxConsumerBound === '1') return;
          const found = resolveContext(contextName);
          if (found) {
            try {
              const template = element.getAttribute('data-context-template') || element.innerHTML;
              if (!element.getAttribute('data-context-template')) {
                element.setAttribute('data-context-template', template);
              }
              found.Consumer((value) => {
                try {
                  const tpl = element.getAttribute('data-context-template') || template;
                  element.innerHTML = tpl.replace(/\{value\}/g, value);
                } catch (e) {
                  logOverlay(e, { type: 'context', role: 'consumer-render', contextName });
                }
              });
              element.dataset.ctxConsumerBound = '1';
              return;
            } catch (e) {
              logOverlay(e, { type: 'context', role: 'consumer', contextName });
            }
          }
          if (++attempts < 20) setTimeout(retry, 100);
        };
        setTimeout(retry, 0);
      }
      return;
    }
    try {
      const template = element.getAttribute('data-context-template') || element.innerHTML;
      // Persist original template so updates don't nest replacements
      if (!element.getAttribute('data-context-template')) {
        element.setAttribute('data-context-template', template);
      }
      ctx.Consumer((value) => {
        try {
          const tpl = element.getAttribute('data-context-template') || template;
          element.innerHTML = tpl.replace(/\{value\}/g, value);
        } catch (e) {
          logOverlay(e, { type: 'context', role: 'consumer-render', contextName });
        }
      });
      element.dataset.ctxConsumerBound = '1';
    } catch (e) {
      logOverlay(e, { type: 'context', role: 'consumer', contextName });
    }
  };

  const initialize = () => {
    // Initial scan
    document.querySelectorAll('[data-context]').forEach(bindProvider);
    document.querySelectorAll('[data-context-consumer]').forEach(bindConsumer);

    // Observe for HMR patches / dynamic DOM changes
    if (!window.ReactExpress.__contextObserver) {
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (!(node instanceof HTMLElement)) continue;
            if (node.matches && node.matches('[data-context]')) bindProvider(node);
            if (node.matches && node.matches('[data-context-consumer]')) bindConsumer(node);
            if (node.querySelectorAll) {
              node.querySelectorAll('[data-context]').forEach(bindProvider);
              node.querySelectorAll('[data-context-consumer]').forEach(bindConsumer);
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      window.ReactExpress.__contextObserver = observer;
    }

    // Re-scan when contexts are created later
    if (!window.ReactExpress.__contextCreateListener) {
      window.addEventListener('react-express:context-created', () => {
        document.querySelectorAll('[data-context]').forEach((el) => {
          if (el.dataset.ctxProviderBound !== '1') bindProvider(el);
        });
        document.querySelectorAll('[data-context-consumer]').forEach((el) => {
          if (el.dataset.ctxConsumerBound !== '1') bindConsumer(el);
        });
      });
      window.ReactExpress.__contextCreateListener = true;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
}

// Example usage in HTML:
/*
<!-- Create a context -->
<script>
  const ThemeContext = ReactExpress.createContext('light');
</script>

<!-- Provider -->
<div data-context="theme" data-context-value="dark">
  <!-- Consumer -->
  <div data-context-consumer="theme">
    Current theme: {value}
  </div>
</div>
*/

// (Legacy DOMContentLoaded initialization is replaced by idempotent boot above)
