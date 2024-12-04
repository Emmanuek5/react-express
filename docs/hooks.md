# React Express Components

React Express provides a powerful component system that makes it easy to create interactive, stateful UI components with minimal boilerplate. Unlike traditional React hooks, our system is designed specifically for server-side rendering with Express while maintaining reactivity on the client side.

## Creating Components

Use the `ReactExpress.components.createComponent()` method to create a new component:

```javascript
const myComponent = ReactExpress.components.createComponent(
  document.getElementById('my-component'),
  {
    // Initial component state
    initialState: {
      count: 0,
      isLoading: false
    },

    // Component initialization
    init: (component) => {
      // Setup event listeners and component logic
    },

    // Render function - called when state changes
    render: (state, element) => {
      // Update the DOM based on state changes
    }
  }
);
```

## Component Options

### initialState
Define the initial state of your component:

```javascript
initialState: {
  count: 0,
  items: [],
  isLoading: false,
  errors: {}
}
```

### init(component)
Initialize your component, set up event listeners, and add custom methods:

```javascript
init: (component) => {
  // Add event listeners
  component.listen('#increment', 'click', (e, comp) => {
    comp.setState(state => ({ count: state.count + 1 }));
  });

  // Add custom methods
  component.customMethod = () => {
    // Custom functionality
  };
}
```

### render(state, element)
Update the DOM when state changes:

```javascript
render: (state, element) => {
  // Update DOM elements based on state
  element.querySelector('.count').textContent = state.count;
  element.querySelector('.loading').style.display = 
    state.isLoading ? 'block' : 'none';
}
```

## Component Methods

### setState(updates)
Update component state:

```javascript
// Direct update
component.setState({
  count: 42
});

// Function update (access previous state)
component.setState(state => ({
  count: state.count + 1
}));
```

### listen(selector, event, handler)
Add event listeners with automatic cleanup:

```javascript
component.listen('#button', 'click', (e, comp) => {
  // Handle click event
});

component.listen('form', 'submit', (e, comp) => {
  e.preventDefault();
  // Handle form submission
});

// Listen to the component element itself
component.listen('self', 'custom-event', (e, comp) => {
  // Handle custom event
});
```

## Shared State

Share state between components using `createSharedState`:

```javascript
const sharedState = ReactExpress.components.createSharedState({
  items: [],
  selectedId: null
});

// Component 1: Updates shared state
const listComponent = ReactExpress.components.createComponent(
  document.getElementById('list'),
  {
    init: (component) => {
      component.listen('form', 'submit', (e, comp) => {
        e.preventDefault();
        const newItem = e.target.querySelector('input').value;
        sharedState.setState(state => ({
          items: [...state.items, newItem]
        }));
      });
    }
  }
);

// Component 2: Subscribes to shared state
const summaryComponent = ReactExpress.components.createComponent(
  document.getElementById('summary'),
  {
    init: (component) => {
      sharedState.subscribe(state => {
        component.setState({ itemCount: state.items.length });
      });
    },
    render: (state, element) => {
      element.textContent = `Total items: ${state.itemCount}`;
    }
  }
);
```

## Best Practices

1. **Component Organization**
   ```javascript
   // Group related components
   const todoApp = {
     list: ReactExpress.components.createComponent(...),
     input: ReactExpress.components.createComponent(...),
     filters: ReactExpress.components.createComponent(...)
   };
   ```

2. **State Management**
   - Keep state minimal and focused
   - Use shared state for global data
   - Use local state for UI-specific data

3. **Event Handling**
   - Always use the `listen` method for events
   - Clean up is handled automatically
   - Use event delegation when possible

4. **Performance**
   ```javascript
   render: (state, element) => {
     // Only update changed elements
     if (state.count !== element._lastCount) {
       element.querySelector('.count').textContent = state.count;
       element._lastCount = state.count;
     }
   }
   ```

## Examples

### Counter Component
```javascript
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
```

### Form Component with Validation
```javascript
const form = ReactExpress.components.createComponent(
  document.getElementById('form'),
  {
    initialState: {
      data: { email: '', password: '' },
      errors: {},
      isValid: false
    },
    
    init: (component) => {
      component.validateField = (field, value) => {
        // Add validation logic
      };
      
      component.listen('input', 'input', (e, comp) => {
        const { name, value } = e.target;
        comp.setState(state => ({
          data: { ...state.data, [name]: value }
        }));
        comp.validateField(name, value);
      });
    },
    
    render: (state, element) => {
      // Update error messages and form state
    }
  }
);
```

## TypeScript Support

The component system includes full TypeScript support:

```typescript
interface ComponentState {
  count: number;
  isLoading: boolean;
}

interface ComponentMethods {
  increment(): void;
  reset(): void;
}

const counter = ReactExpress.components.createComponent<ComponentState, ComponentMethods>(
  document.getElementById('counter')!,
  {
    initialState: { count: 0, isLoading: false },
    
    init: (component) => {
      component.increment = () => {
        component.setState(state => ({ count: state.count + 1 }));
      };
      
      component.reset = () => {
        component.setState({ count: 0 });
      };
    }
  }
);
