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
const [name, setName] = useState('John');
// The input and div will automatically update when name changes
```

### Formatted State Binding

Use the `data-format` attribute to specify how state values should be displayed:

```html
<div data-react-state="age" data-format="dogYears">42</div>
<div data-react-state="price" data-format="currency">99.99</div>
```

```javascript
// Define custom formatters
ReactExpress.formatters.add('dogYears', (value) => `${value * 7} dog years`);
ReactExpress.formatters.add('currency', (value) => `$${value.toFixed(2)}`);
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
const [interests, setInterests] = useState([]);
// Checkboxes will automatically update the interests array
```

### Computed Values

Create computed values that automatically update when their dependencies change:

```html
<input type="number" data-react-state="num1">
<input type="number" data-react-state="num2">
<div data-react-state="sum"></div>
```

```javascript
const [num1, setNum1] = useState(0);
const [num2, setNum2] = useState(0);
const sum = computed(() => num1 + num2);
```

## Advanced Features

### Custom Bindings

Create custom binding behaviors using the `bindState` function:

```javascript
bindState('customState', {
  get: (state) => state.value,
  set: (state, value) => ({ ...state, value }),
  format: (value) => `Custom: ${value}`
});
```

### State Change Notifications

Subscribe to state changes using the event bus:

```javascript
onStateChange('stateName', (newValue, oldValue) => {
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
// Basic effect that runs on every render
useEffect(() => {
  console.log('Component updated');
});

// Effect with dependencies - only runs when dependencies change
useEffect(() => {
  document.title = `${name}'s Profile`;
}, [name]);

// Effect with cleanup
useEffect(() => {
  const handler = (e) => handleResize(e);
  window.addEventListener('resize', handler);
  
  // Cleanup function
  return () => {
    window.removeEventListener('resize', handler);
  };
}, []);

// Async effects
useEffect(() => {
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
const sortedList = useMemo(() => {
  return items
    .slice()
    .sort((a, b) => b.priority - a.priority);
}, [items]);

// Memoize complex object
const memoizedValue = useMemo(() => ({
  id: props.id,
  computed: expensiveComputation(props.data)
}), [props.id, props.data]);

// Prevent unnecessary re-renders of child components
const memoizedCallback = useMemo(() => {
  return () => handleClick(value);
}, [value]);
```

### useRef

Maintain mutable values across renders and access DOM elements:

```javascript
// Reference DOM elements
function TextInput() {
  const inputRef = useRef(null);
  
  const focus = () => {
    inputRef.current.focus();
  };
  
  return (
    <>
      <input ref={inputRef} type="text" />
      <button onClick={focus}>Focus Input</button>
    </>
  );
}

// Store previous values
function Counter() {
  const [count, setCount] = useState(0);
  const prevCountRef = useRef();
  
  useEffect(() => {
    prevCountRef.current = count;
  });
  
  return (
    <div>
      Current: {count}, Previous: {prevCountRef.current}
    </div>
  );
}

// Store interval/timeout IDs
function Timer() {
  const [time, setTime] = useState(0);
  const timerRef = useRef();
  
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTime(t => t + 1);
    }, 1000);
    
    return () => clearInterval(timerRef.current);
  }, []);
  
  return <div>Time: {time}</div>;
}
```

### useCallback

Memoize functions to prevent unnecessary re-renders:

```javascript
// Basic callback memoization
const memoizedCallback = useCallback(
  () => {
    doSomething(a, b);
  },
  [a, b]
);

// With event handlers
const handleSubmit = useCallback((event) => {
  event.preventDefault();
  submitForm(formData);
}, [formData]);

// Optimizing child component renders
function ParentComponent() {
  const [items, setItems] = useState([]);
  
  const handleItemClick = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);
  
  return (
    <ItemList
      items={items}
      onItemClick={handleItemClick}
    />
  );
}
```

### useReducer

Manage complex state logic with reducers:

```javascript
// Define reducer
const reducer = (state, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + 1 };
    case 'DECREMENT':
      return { count: state.count - 1 };
    case 'RESET':
      return { count: 0 };
    default:
      return state;
  }
};

// Use reducer in component
function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });
  
  return (
    <>
      Count: {state.count}
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>+</button>
      <button onClick={() => dispatch({ type: 'DECREMENT' })}>-</button>
      <button onClick={() => dispatch({ type: 'RESET' })}>Reset</button>
    </>
  );
}
```

### Custom Hooks

Create reusable hooks by combining existing hooks:

```javascript
// Custom hook for form handling
function useForm(initialValues) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);
  
  const validate = useCallback(() => {
    // Validation logic
    const newErrors = {};
    // ... validate values
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values]);
  
  return {
    values,
    errors,
    handleChange,
    validate
  };
}

// Usage of custom hook
function RegistrationForm() {
  const {
    values,
    errors,
    handleChange,
    validate
  } = useForm({
    username: '',
    email: '',
    password: ''
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // Submit form
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        name="username"
        value={values.username}
        onChange={handleChange}
      />
      {errors.username && <span>{errors.username}</span>}
      {/* ... other fields */}
    </form>
  );
}
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
