// React Express Hooks System
class ComponentManager {
  constructor() {
    this.components = new Map();
    this.eventBus = new EventTarget();
    this.memoizedValues = new Map();
    this.refs = new Map();
    this.callbacks = new Map();
    this.stateBindings = new Map();
  }

  // Create a stateful component with automatic DOM updates
  createComponent(element, options = {}) {
    const id = element.id || `component-${Math.random().toString(36).slice(2)}`;
    element.id = id;

    const component = {
      id,
      element,
      state: options.initialState || {},
      handlers: new Map(),
      
      // Update state and trigger re-render
      setState(updates) {
        const newState = typeof updates === 'function' 
          ? updates(this.state) 
          : updates;
        
        const changed = Object.entries(newState).some(
          ([key, value]) => this.state[key] !== value
        );

        if (changed) {
          this.state = { ...this.state, ...newState };
          this.render();
        }
      },

      // Add event listener with automatic cleanup
      listen(selector, event, handler) {
        const target = selector === 'self' 
          ? element 
          : element.querySelector(selector);
          
        if (!target) return;

        const wrappedHandler = (e) => handler(e, this);
        target.addEventListener(event, wrappedHandler);
        
        // Store for cleanup
        if (!this.handlers.has(target)) {
          this.handlers.set(target, []);
        }
        this.handlers.get(target).push([event, wrappedHandler]);
      },

      // Cleanup all event listeners
      cleanup() {
        this.handlers.forEach((handlers, target) => {
          handlers.forEach(([event, handler]) => {
            target.removeEventListener(event, handler);
          });
        });
        this.handlers.clear();
      },

      // Custom render function
      render() {
        if (options.render) {
          options.render(this.state, this.element);
        }
        // Dispatch update event for HMR
        this.element.dispatchEvent(new CustomEvent('component:updated', {
          detail: { state: this.state }
        }));
      }
    };

    // Store component reference
    this.components.set(id, component);
    
    // Initialize if provided
    if (options.init) {
      options.init(component);
    }

    return component;
  }

  // Hooks Implementation
  hooks = {
    useState: (key, initialValue) => {
      // Initialize state if not exists
      if (!this.stateBindings.has(key)) {
        this.stateBindings.set(key, {
          value: initialValue,
          prev: undefined,
          elements: new Set(),
          formatters: new Map()
        });

        // Initial DOM scan for elements
        this._scanForStateBindings(key);
      }

      const binding = this.stateBindings.get(key);

      const getState = () => binding.value;

      const setState = (newValue) => {
        const value = typeof newValue === 'function' ? newValue(binding.value) : newValue;
        this._setBindingValue(key, value);
      };

      return [getState, setState];
    },

    // Enhanced bindState with automatic formatting
    bindState: (key, element, formatter) => {
      if (!this.stateBindings.has(key)) {
        this.stateBindings.set(key, {
          value: undefined,
          prev: undefined,
          elements: new Set(),
          formatters: new Map()
        });
      }

      const binding = this.stateBindings.get(key);
      binding.elements.add(element);
      
      if (formatter) {
        const resolved = this._resolveFormatter(formatter);
        if (resolved) {
          binding.formatters.set(element, resolved);
        }
      }

      // Initial update (skip if no value yet to preserve SSR content)
      if (binding.value !== undefined) {
        this._updateElement(element, binding.value, binding.formatters.get(element));
      }

      return () => {
        binding.elements.delete(element);
        binding.formatters.delete(element);
      };
    },

    useEffect: (callback, dependencies = []) => {
      let cleanup = null;
      const handler = () => {
        if (cleanup) cleanup();
        cleanup = callback();
      };

      dependencies.forEach(dep => {
        this.eventBus.addEventListener(dep, handler);
      });

      // Initial call
      handler();

      return () => {
        if (cleanup) cleanup();
        dependencies.forEach(dep => {
          this.eventBus.removeEventListener(dep, handler);
        });
      };
    },

    useMemo: (factory, dependencies = []) => {
      const key = dependencies.join('|');
      if (!this.memoizedValues.has(key)) {
        this.memoizedValues.set(key, factory());
      }

      dependencies.forEach(dep => {
        this.eventBus.addEventListener(dep, () => {
          this.memoizedValues.set(key, factory());
        });
      });

      return this.memoizedValues.get(key);
    },

    useRef: (elementId) => {
      if (!this.refs.has(elementId)) {
        this.refs.set(elementId, {
          current: document.getElementById(elementId)
        });
      }
      return this.refs.get(elementId);
    },

    useCallback: (callback, dependencies = [], delay = 0) => {
      const key = dependencies.join('|');
      
      if (!this.callbacks.has(key)) {
        if (delay > 0) {
          let timeoutId;
          const debouncedCallback = (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => callback(...args), delay);
          };
          this.callbacks.set(key, debouncedCallback);
        } else {
          this.callbacks.set(key, callback);
        }
      }

      return this.callbacks.get(key);
    },

    useReducer: (key, reducer, initialState) => {
      if (!this.stateBindings.has(key)) {
        this.stateBindings.set(key, {
          value: initialState,
          prev: undefined,
          elements: new Set(),
          formatters: new Map()
        });
        this._scanForStateBindings(key);
      }

      const getState = () => this.stateBindings.get(key).value;
      const dispatch = (action) => {
        const current = this.stateBindings.get(key).value;
        const next = reducer(current, action);
        this._setBindingValue(key, next);
      };
      return [getState, dispatch];
    }
  };

  // Private helper methods
  _scanForStateBindings(key) {
    document.querySelectorAll(`[data-react-state="${key}"]`).forEach(element => {
      const binding = this.stateBindings.get(key);
      if (!binding.elements.has(element)) {
        binding.elements.add(element);
        const fmtAttr = element.getAttribute('data-format') || element.getAttribute('data-type');
        if (fmtAttr) {
          const resolved = this._resolveFormatter(fmtAttr);
          if (resolved) {
            binding.formatters.set(element, resolved);
          }
        }

        // Attach input listeners for two-way binding (once per element)
        if (!element.__reactExpressBound) {
          if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
            const type = (element.type || '').toLowerCase();
            const handler = (e) => {
              if (type === 'checkbox') {
                const checkboxes = Array.from(document.querySelectorAll(`input[type="checkbox"][data-react-state="${key}"]`));
                const isGroup = checkboxes.length > 1 || (element.hasAttribute('value'));
                if (isGroup) {
                  const values = checkboxes.filter(cb => cb.checked).map(cb => cb.value);
                  this._setBindingValue(key, values);
                } else {
                  this._setBindingValue(key, element.checked);
                }
              } else if (type === 'radio') {
                const selected = document.querySelector(`input[type="radio"][data-react-state="${key}"]:checked`);
                this._setBindingValue(key, selected ? selected.value : null);
              } else {
                this._setBindingValue(key, element.value);
              }
            };
            const eventName = (type === 'checkbox' || type === 'radio' || element.tagName === 'SELECT') ? 'change' : 'input';
            element.addEventListener(eventName, handler);
            element.__reactExpressBound = true;
          }
        }
      }
    });
  }

  _updateBoundElements(key) {
    const binding = this.stateBindings.get(key);
    binding.elements.forEach(element => {
      const formatter = binding.formatters.get(element);
      this._updateElement(element, binding.value, formatter);
    });
  }

  _updateElement(element, value, formatter) {
    try {
      const displayValue = formatter ? formatter(value) : value;
      
      const tag = element.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        if (tag === 'INPUT' && element.type === 'checkbox') {
          if (Array.isArray(value)) {
            element.checked = value.includes(element.value);
          } else {
            element.checked = !!value;
          }
        } else if (tag === 'INPUT' && element.type === 'radio') {
          // Radios are managed by event handlers; value reflects checked radio
          // No direct update here to avoid mismatches
        } else {
          element.value = displayValue ?? '';
        }
      } else {
        const vdom = window.ReactExpress && window.ReactExpress.vdom;
        if (vdom) {
          let vnode;
          if (displayValue && typeof displayValue === 'object') {
            if (displayValue.__html !== undefined) {
              vnode = vdom.raw(displayValue.__html ?? '');
            } else if (displayValue.type && displayValue.props) {
              vnode = displayValue; // assume a vnode from createElement
            } else if (Array.isArray(displayValue)) {
              vnode = vdom.createElement('div', {}, ...displayValue);
            } else {
              vnode = String(displayValue);
            }
          } else {
            vnode = displayValue ?? '';
          }
          vdom.render(vnode, element);
        } else {
          // Fallback if VDOM not available
          if (displayValue && typeof displayValue === 'object' && displayValue.__html !== undefined) {
            element.innerHTML = displayValue.__html ?? '';
          } else {
            element.textContent = displayValue ?? '';
          }
        }
      }
    } catch (e) {
      console.error('Error updating element:', e);
    }
  }

  _setBindingValue(key, value) {
    const binding = this.stateBindings.get(key);
    const prev = binding.value;
    binding.prev = prev;
    binding.value = value;
    this._updateBoundElements(key);
    this.eventBus.dispatchEvent(new CustomEvent(key, { detail: { value, previous: prev } }));
  }

  _resolveFormatter(formatter) {
    try {
      if (typeof formatter === 'function') return formatter;
      if (typeof formatter === 'string') {
        // Prefer registry
        if (window.ReactExpress && window.ReactExpress.formatters && window.ReactExpress.formatters.has(formatter)) {
          return window.ReactExpress.formatters.get(formatter);
        }
        // Global function name
        if (typeof window[formatter] === 'function') return window[formatter];
        // Inline JS expression support via js: prefix
        if (formatter.startsWith('js:')) {
          const expr = formatter.slice(3);
          return new Function('value', `return (${expr})`);
        }
      }
    } catch (e) {
      console.error('Invalid formatter', formatter, e);
    }
    return null;
  }

  // Get component by element or ID
  getComponent(elementOrId) {
    const id = typeof elementOrId === 'string' 
      ? elementOrId 
      : elementOrId.id;
    return this.components.get(id);
  }

  // Remove component and cleanup
  removeComponent(elementOrId) {
    const component = this.getComponent(elementOrId);
    if (component) {
      component.cleanup();
      this.components.delete(component.id);
    }
  }

  // Utility to share state between components
  createSharedState(initialState = {}) {
    let state = initialState;
    const subscribers = new Set();

    return {
      getState: () => state,
      setState: (updates) => {
        const newState = typeof updates === 'function' 
          ? updates(state) 
          : updates;
        state = { ...state, ...newState };
        subscribers.forEach(callback => callback(state));
      },
      subscribe: (callback) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      }
    };
  }
}

// Initialize React Express component system
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.components = new ComponentManager();
window.ReactExpress.hooks = window.ReactExpress.components.hooks;

// Formatter registry
window.ReactExpress.formatters = window.ReactExpress.formatters || {
  _map: new Map(),
  add(name, fn) { this._map.set(name, fn); },
  get(name) { return this._map.get(name); },
  has(name) { return this._map.has(name); }
};

// Seed default formatters for back-compat with data-type
(() => {
  const fmts = window.ReactExpress.formatters;
  if (!fmts.has('json')) {
    // Return plain string so textContent preserves characters; CSS can use white-space: pre
    fmts.add('json', (value) => (typeof value === 'undefined' ? '' : JSON.stringify(value, null, 2)));
  }
  if (!fmts.has('list')) {
    fmts.add('list', (value) => ({ __html: Array.isArray(value) ? value.map((item) => `<li>${item}</li>`).join('') : '' }));
  }
  if (!fmts.has('todo')) {
    fmts.add('todo', (value) => ({ __html: Array.isArray(value) ? value.map((todo) => `
            <div class="todo-item">
              <input type="checkbox" ${todo.completed ? 'checked' : ''}>
              <span>${todo.text}</span>
            </div>
          `).join('') : '' }));
  }
})();

// State change subscription helper
window.ReactExpress.components.onStateChange = function(key, handler) {
  const listener = (e) => handler(e.detail.value, e.detail.previous);
  this.eventBus.addEventListener(key, listener);
  return () => this.eventBus.removeEventListener(key, listener);
};

/* Example Usage:
const counter = ReactExpress.components.createComponent(
  document.getElementById('counter'),
  {
    initialState: { count: 0 },
    
    init: (component) => {
      component.listen('#increment', 'click', (e, comp) => {
        comp.setState(state => ({ count: state.count + 1 }));
      });
      
      component.listen('#decrement', 'click', (e, comp) => {
        comp.setState(state => ({ count: state.count - 1 }));
      });
    },
    
    render: (state, element) => {
      element.querySelector('.count').textContent = state.count;
    }
  }
);

// Shared state example
const sharedTodos = ReactExpress.components.createSharedState({
  items: []
});

const todoList = ReactExpress.components.createComponent(
  document.getElementById('todo-list'),
  {
    init: (component) => {
      // Subscribe to shared state
      sharedTodos.subscribe(state => {
        component.setState({ items: state.items });
      });
      
      component.listen('form', 'submit', (e, comp) => {
        e.preventDefault();
        const input = e.target.querySelector('input');
        sharedTodos.setState(state => ({
          items: [...state.items, input.value]
        }));
        input.value = '';
      });
    },
    
    render: (state, element) => {
      const list = element.querySelector('ul');
      list.innerHTML = state.items
        .map(item => `<li>${item}</li>`)
        .join('');
    }
  }
);
*/
