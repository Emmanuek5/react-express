# React Express Integration

A TypeScript-based integration that brings React-like features to Express applications, providing a powerful and efficient way to build modern web applications.

[📚 Full Documentation](https://react-express-docs.cloven.me/)

## Why Use React Express?

React Express provides a powerful and efficient way to add React-like features to your Express applications:

1. **Real-time State Management**: Reactive state management system with automatic DOM updates and WebSocket synchronization.

2. **Server-Side Rendering**: Use React-like components with server-side rendering for optimal performance and SEO.

3. **Modern Development**: Hot Module Reloading (HMR), TypeScript support, and developer-friendly tooling.

4. **Progressive Enhancement**: Enhance your existing Express applications without a complete rewrite.

## Features

### Core Features
- Real-time state management with WebSocket support
- Hot Module Reloading (HMR)
- Server-side rendering with EJS
- TypeScript support
- Express middleware integration

### React-Like Features
- Context API for state sharing
- Hooks system (useState, useEffect, etc.)
- Component lifecycle methods
- Props and refs system
- Error boundaries
- Suspense with loading states

## Quick Start

1. Install the package:
```bash
npm install advanced-express
```

2. Set up your Express application:
```typescript
import path from "path";
import express from "express";
import { Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { reactExpress } from "advanced-express";

const app = express();
const port = 3000;
const server = new Server(app);
const io = new SocketIOServer(server);

app.set("server", server);

app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

const middleware = reactExpress({
    viewsDir: path.join(__dirname, 'views'),
    hmr: true
});

// Apply the middleware
middleware(app);

app.get("/", (req, res) => {
    res.render("index");
});

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
```

3. Create your views with React-like features:

```html
<!-- State Management -->
<div data-react-state="counter">0</div>
<button onclick="ReactExpress.setState('counter', count => count + 1)">
  Increment
</button>

<!-- Context -->
<div data-context="theme" data-context-value="dark">
  <div data-context-consumer="theme">
    Current theme: {value}
  </div>
</div>

<!-- Component with Lifecycle -->
<div data-component="todo-list" data-prop-title="My Todos">
  <ul ref="list"></ul>
  <button ref="addButton">Add Todo</button>
</div>

<!-- Hooks -->
<div data-component="counter">
  <span data-value>0</span>
  <button data-action="increment">+</button>
</div>

<!-- Suspense -->
<div data-suspense="profile" data-placeholder="Loading...">
  Profile content
</div>

<!-- Client-side Routing -->
<a href="/dashboard" data-route prefetch>Dashboard</a>
```

## Key Concepts

### State Management
```javascript
// Set state
ReactExpress.setState('counter', 5);

// Subscribe to changes
ReactExpress.subscribe(['counter'], ([count]) => {
  return count * 2;
});
```

### Context API
```javascript
const ThemeContext = ReactExpress.createContext('light');

// Use in HTML
<div data-context="theme" data-context-value="dark">
  <div data-context-consumer="theme">Theme: {value}</div>
</div>
```

### Hooks
```javascript
function Counter(element) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    console.log('Count changed:', count);
  }, [count]);
  
  return {
    updateCallback: (value) => {
      element.textContent = value;
    }
  };
}
```

### Components
```javascript
class TodoList extends ReactExpress.Component {
  constructor(element) {
    super(element);
    this.state = { todos: [] };
  }

  componentDidMount() {
    this.refs.addButton.addEventListener('click', () => {
      this.setState(state => ({
        todos: [...state.todos, 'New Todo']
      }));
    });
  }

  render() {
    return `
      <h2>${this.props.title}</h2>
      <ul ref="list">
        ${this.state.todos.map(todo => `<li>${todo}</li>`).join('')}
      </ul>
      <button ref="addButton">Add Todo</button>
    `;
  }
}
```

## Documentation

For detailed documentation on all features, see our [Documentation](docs/index.md):

- [State Management](docs/state.md)
- [Router](docs/router.md)
- [Suspense](docs/suspense.md)
- [Context](docs/context.md)
- [Hooks](docs/hooks.md)
- [Component Lifecycle](docs/lifecycle.md)
- [Hot Module Reloading](docs/hmr.md)

## Requirements

- Node.js >= 18
- npm >= 9.0.0
- Express.js >= 4.17.1

## Development

```bash
# Install dependencies
npm install

# Start the test server
cd test-server
npm run dev
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.