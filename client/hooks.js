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
        binding.value = value;
        
        // Update all bound elements
        this._updateBoundElements(key);

        // Dispatch event for subscribers
        this.eventBus.dispatchEvent(new CustomEvent(key, { detail: value }));
      };

      return [getState, setState];
    },

    // Enhanced bindState with automatic formatting
    bindState: (key, element, formatter) => {
      if (!this.stateBindings.has(key)) {
        this.stateBindings.set(key, {
          value: null,
          elements: new Set(),
          formatters: new Map()
        });
      }

      const binding = this.stateBindings.get(key);
      binding.elements.add(element);
      
      if (formatter) {
        binding.formatters.set(element, formatter);
      }

      // Initial update
      this._updateElement(element, binding.value, formatter);

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
    }
  };

  // Private helper methods
  _scanForStateBindings(key) {
    document.querySelectorAll(`[data-react-state="${key}"]`).forEach(element => {
      const binding = this.stateBindings.get(key);
      if (!binding.elements.has(element)) {
        binding.elements.add(element);
        const formatter = element.getAttribute('data-format');
        if (formatter) {
          try {
            binding.formatters.set(element, new Function('value', `return ${formatter}`));
          } catch (e) {
            console.error(`Invalid formatter for ${key}:`, e);
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
      
      if (element.tagName === 'INPUT') {
        if (element.type === 'checkbox') {
          element.checked = !!value;
        } else {
          element.value = displayValue ?? '';
        }
      } else {
        element.textContent = displayValue ?? '';
      }
    } catch (e) {
      console.error('Error updating element:', e);
    }
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
