// React Express Hooks System
class ComponentManager {
  constructor() {
    this.components = new Map();
    this.eventBus = new EventTarget();
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
