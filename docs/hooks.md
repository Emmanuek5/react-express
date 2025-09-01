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

## State Binding System

React Express now includes a powerful state binding system that automatically updates UI elements when state changes.

### Basic State Binding

Bind state variables directly to DOM elements using the `data-react-state` attribute:

```html
<input data-react-state="name" type="text">
<div data-react-state="name"></div>
```

```javascript
const [getName, setName] = ReactExpress.hooks.useState('name', 'John');
// Elements with data-react-state="name" will automatically reflect updates
```

Two-way binding notes:
- Inputs and selects automatically update the associated state key.
- Checkbox groups bound to the same key produce an array of checked values.
- Radio groups bound to the same key set the selected value.

### Formatted State Binding

Use the `data-format` attribute to specify how state values should be displayed:

```html
<div data-react-state="age" data-format="dogYears">42</div>
<div data-react-state="price" data-format="currency">99.99</div>
```

```javascript
// Define custom formatters (formatter registry)
ReactExpress.formatters.add('dogYears', (value) => `${value * 7} dog years`);
ReactExpress.formatters.add('currency', (value) => `$${Number(value).toFixed(2)}`);
```

### Array State Binding

Bind array state to checkbox groups or multi-select elements:

```html
<div class="interests">
  <input type="checkbox" data-react-state="interests" value="coding">
  <input type="checkbox" data-react-state="interests" value="reading">
</div>
<div data-react-state="interests" data-format="list"></div>
```

```javascript
const [getInterests, setInterests] = ReactExpress.hooks.useState('interests', []);
// Checkboxes bound with data-react-state="interests" will update the array automatically
```

### Computed Values

Create computed values that automatically update when their dependencies change:

```html
<input type="number" data-react-state="num1">
<input type="number" data-react-state="num2">
<div data-react-state="sum"></div>
```

```javascript
const [getNum1, setNum1] = ReactExpress.hooks.useState('num1', 0);
const [getNum2, setNum2] = ReactExpress.hooks.useState('num2', 0);
const [getSum, setSum] = ReactExpress.hooks.useState('sum', 0);

// Recompute sum whenever num1 or num2 changes
ReactExpress.hooks.useEffect(() => {
  setSum((getNum1() || 0) + (getNum2() || 0));
}, ['num1', 'num2']);
```

## Advanced Features

### Custom Bindings

Imperatively bind an element to state with an optional formatter (function name, global function, or `js:` expression):

```javascript
const el = document.querySelector('#custom');
ReactExpress.hooks.bindState('customState', el, 'formatterName'); // or (value) => `Custom: ${value}`

// Alternatively, prefer declarative markup:
// <div id="custom" data-react-state="customState" data-format="formatterName"></div>
```

### State Change Notifications

Subscribe to state changes using the event bus helper:

```javascript
ReactExpress.components.onStateChange('stateName', (newValue, oldValue) => {
  // Handle state change
});
```

### Error Handling

The binding system includes built-in error handling for formatters and state updates:

```javascript
ReactExpress.formatters.add('safe', (value) => {
  if (!value) return 'N/A';
  try {
    return processValue(value);
  } catch (err) {
    return 'Error processing value';
  }
});
```

## Built-in Hooks

### useEffect

Perform side effects in your components:

```javascript
// Init-only effect (runs once)
ReactExpress.hooks.useEffect(() => {
  console.log('Initialized');
}, []);

// Effect with dependencies - runs when listed state keys change
ReactExpress.hooks.useEffect(() => {
  document.title = `Profile: ${getName()}`;
}, ['name']);

// Effect with cleanup
ReactExpress.hooks.useEffect(() => {
  const handler = (e) => handleResize(e);
  window.addEventListener('resize', handler);
  
  // Cleanup function
  return () => {
    window.removeEventListener('resize', handler);
  };
}, []);

// Async effects
ReactExpress.hooks.useEffect(() => {
  async function fetchData() {
    const response = await fetch('/api/data');
    const data = await response.json();
    setData(data);
  }
  fetchData();
}, []);
```

### useMemo

Memoize expensive computations:

```javascript
// Memoize expensive calculation
const sortedList = ReactExpress.hooks.useMemo(() => {
  const arr = (getItems() || []).slice();
  return arr.sort((a, b) => b.priority - a.priority);
}, ['items']);

// Memoize complex object
const memoizedValue = ReactExpress.hooks.useMemo(() => ({
  id: getId(),
  computed: expensiveComputation(getData())
}), ['id', 'data']);

// Prevent unnecessary re-renders of child components
const memoizedCallback = ReactExpress.hooks.useMemo(() => {
  return () => handleClick(getValue());
}, ['value']);
```

### useRef

Maintain mutable values across renders and access DOM elements:

```javascript
// Reference DOM elements (by id)
const inputRef = ReactExpress.hooks.useRef('text-input');
const focus = () => inputRef.current && inputRef.current.focus();

// Store previous values
const [getCount, setCount] = ReactExpress.hooks.useState('count', 0);
const prevCountRef = { current: undefined };
ReactExpress.hooks.useEffect(() => {
  prevCountRef.current = getCount();
}, ['count']);

// Store interval/timeout IDs
const [getTime, setTime] = ReactExpress.hooks.useState('time', 0);
const timerRef = { current: null };
ReactExpress.hooks.useEffect(() => {
  timerRef.current = setInterval(() => {
    setTime((t) => (t || 0) + 1);
  }, 1000);
  return () => clearInterval(timerRef.current);
}, []);
```

### useCallback

Memoize functions to prevent unnecessary re-renders:

```javascript
// Basic callback memoization
const memoizedCallback = ReactExpress.hooks.useCallback(
  () => {
    doSomething(getA(), getB());
  },
  ['a', 'b']
);

// With event handlers
const handleSubmit = ReactExpress.hooks.useCallback((event) => {
  event.preventDefault();
  submitForm(getFormData());
}, ['formData']);

// Optimizing child-like interactions (DOM example)
const [getItems, setItems] = ReactExpress.hooks.useState('items', []);
const handleItemClick = ReactExpress.hooks.useCallback((id) => {
  setItems((prev) => (prev || []).filter(item => item.id !== id));
}, []);

// Example: delegate clicks to remove items
document.getElementById('item-list').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-remove-id]');
  if (btn) handleItemClick(btn.getAttribute('data-remove-id'));
});
```

### useReducer

Manage complex state logic with reducers:

```javascript
// Define reducer
const reducer = (state, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return { count: (state.count || 0) + 1 };
    case 'DECREMENT':
      return { count: (state.count || 0) - 1 };
    case 'RESET':
      return { count: 0 };
    default:
      return state;
  }
};

// Use reducer with a state key
const [getCounter, dispatch] = ReactExpress.hooks.useReducer('counter', reducer, { count: 0 });

// Example usage
document.getElementById('inc').addEventListener('click', () => dispatch({ type: 'INCREMENT' }));
document.getElementById('dec').addEventListener('click', () => dispatch({ type: 'DECREMENT' }));
document.getElementById('reset').addEventListener('click', () => dispatch({ type: 'RESET' }));
```

### Custom Hooks

Create reusable hooks by combining existing hooks:

```javascript
// "Custom hook" pattern using ReactExpress.hooks: form handling helpers
function makeFormHelpers(stateKey) {
  const [getValues, setValues] = ReactExpress.hooks.useState(stateKey, {});
  const [getErrors, setErrors] = ReactExpress.hooks.useState(`${stateKey}:errors`, {});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...(prev || {}), [name]: value }));
  };

  const validate = () => {
    const values = getValues() || {};
    const newErrors = {};
    // ... add validation logic populating newErrors
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return {
    getValues,
    getErrors,
    handleChange,
    validate,
  };
}

// Usage (DOM example)
const form = makeFormHelpers('formData');
document.getElementById('my-form').addEventListener('input', form.handleChange);
document.getElementById('my-form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (form.validate()) {
    const data = form.getValues();
    // Submit data
  }
});
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

5. **Use Appropriate Formatters**
   - Create reusable formatters for common data transformations
   - Handle null/undefined values gracefully
   - Keep formatting logic separate from state logic

6. **State Binding Performance**
   - Use specific state bindings instead of binding entire objects
   - Avoid unnecessary formatting operations
   - Consider using computed values for complex calculations

7. **Error Handling**
   - Always provide fallback values in formatters
   - Validate input data before updating state
   - Use error boundaries for component-level error handling

8. **Maintainability**
   - Document custom formatters and bindings
   - Keep binding logic close to related components
   - Use consistent naming conventions for bound states

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
