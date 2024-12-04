# Component Lifecycle

The Component Lifecycle system provides a class-based approach to building components with lifecycle methods similar to React class components.

## Features

- Class-based components
- Lifecycle methods
- State management
- Props handling
- Refs system
- Automatic cleanup

## API Reference

### Component Class

```javascript
class MyComponent extends ReactExpress.Component {
  constructor(element) {
    super(element);
    this.state = {
      // Initial state
    };
  }
}
```

### Lifecycle Methods

#### `componentDidMount()`
Called after the component is mounted to the DOM.

#### `componentDidUpdate(prevProps, prevState)`
Called after the component updates.

#### `componentWillUnmount()`
Called before the component is removed.

#### `shouldComponentUpdate(nextProps, nextState, prevState)`
Controls whether the component should update.

#### `render()`
Returns the component's HTML content.

### State Management

#### `setState(updater[, callback])`
Updates component state.

```javascript
this.setState({ count: 5 });
// or
this.setState(state => ({ count: state.count + 1 }));
```

### Props System

Props are passed via data attributes:

```html
<div data-component="counter" data-prop-initial="5">
</div>
```

Access in component:
```javascript
console.log(this.props.initial); // "5"
```

### Refs System

Create refs in template:
```html
<button ref="myButton">Click me</button>
```

Access in component:
```javascript
this.refs.myButton.addEventListener('click', this.handleClick);
```

## Examples

### Counter Component
```html
<div data-component="counter" data-prop-initial="0">
  <span ref="display"></span>
  <button ref="increment">+</button>
</div>

<script>
class Counter extends ReactExpress.Component {
  constructor(element) {
    super(element);
    this.state = {
      count: parseInt(this.props.initial) || 0
    };
  }

  componentDidMount() {
    this.refs.increment.addEventListener('click', () => {
      this.setState(state => ({
        count: state.count + 1
      }));
    });
  }

  render() {
    return `
      <span ref="display">${this.state.count}</span>
      <button ref="increment">+</button>
    `;
  }
}
</script>
```

### Todo List
```html
<div data-component="todo-list" data-prop-title="My Todos">
  <ul ref="list"></ul>
  <input ref="input" type="text">
  <button ref="add">Add</button>
</div>

<script>
class TodoList extends ReactExpress.Component {
  constructor(element) {
    super(element);
    this.state = {
      todos: []
    };
  }

  componentDidMount() {
    this.refs.add.addEventListener('click', () => {
      const text = this.refs.input.value;
      if (text) {
        this.setState(state => ({
          todos: [...state.todos, text]
        }));
        this.refs.input.value = '';
      }
    });
  }

  render() {
    return `
      <h2>${this.props.title}</h2>
      <ul ref="list">
        ${this.state.todos.map(todo => `
          <li>${todo}</li>
        `).join('')}
      </ul>
      <input ref="input" type="text">
      <button ref="add">Add</button>
    `;
  }
}
</script>
```

## Best Practices

1. **Component Structure**
   - Keep components focused
   - Use proper lifecycle methods
   - Clean up event listeners

2. **State Management**
   - Initialize state in constructor
   - Use setState for updates
   - Avoid direct state mutation

3. **Props Handling**
   - Validate props when needed
   - Use default props
   - Document required props

4. **Performance**
   - Implement shouldComponentUpdate
   - Clean up resources
   - Optimize render method

## Common Patterns

### Data Fetching
```javascript
class UserProfile extends ReactExpress.Component {
  constructor(element) {
    super(element);
    this.state = {
      user: null,
      loading: true,
      error: null
    };
  }

  async componentDidMount() {
    try {
      const response = await fetch('/api/user');
      const user = await response.json();
      this.setState({ user, loading: false });
    } catch (error) {
      this.setState({ error, loading: false });
    }
  }

  render() {
    if (this.state.loading) return '<div>Loading...</div>';
    if (this.state.error) return '<div>Error loading user</div>';
    
    const { user } = this.state;
    return `
      <div>
        <h2>${user.name}</h2>
        <p>${user.email}</p>
      </div>
    `;
  }
}
```

### Form Handling
```javascript
class ContactForm extends ReactExpress.Component {
  constructor(element) {
    super(element);
    this.state = {
      name: '',
      email: '',
      message: ''
    };
  }

  componentDidMount() {
    this.refs.form.addEventListener('submit', (e) => {
      e.preventDefault();
      // Handle submission
    });
  }

  render() {
    return `
      <form ref="form">
        <input ref="name" value="${this.state.name}">
        <input ref="email" value="${this.state.email}">
        <textarea ref="message">${this.state.message}</textarea>
        <button type="submit">Send</button>
      </form>
    `;
  }
}
```

### Modal Component
```javascript
class Modal extends ReactExpress.Component {
  constructor(element) {
    super(element);
    this.state = {
      isOpen: false
    };
  }

  componentDidMount() {
    this.refs.overlay.addEventListener('click', (e) => {
      if (e.target === this.refs.overlay) {
        this.setState({ isOpen: false });
      }
    });
  }

  render() {
    return `
      <div ref="overlay" class="modal-overlay ${this.state.isOpen ? 'open' : ''}">
        <div class="modal-content">
          ${this.props.content}
          <button ref="close">Close</button>
        </div>
      </div>
    `;
  }
}
```
