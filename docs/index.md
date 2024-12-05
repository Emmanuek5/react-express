# React Express

React Express is a powerful framework that brings React-like features to Express applications. It provides a modern, component-based approach to building server-rendered applications with client-side interactivity.

## Features

- **Component System**: Create interactive UI components with state management and lifecycle events
- **Server-Side Rendering**: Render components on the server for fast initial load
- **Hot Module Reloading**: Update components in real-time during development
- **Shared State Management**: Share state between components easily
- **Form Handling**: Built-in form validation and state management
- **TypeScript Support**: Full TypeScript support for better development experience
- **Performance Optimization**: Optimize rendering and component lifecycle
- **Error Handling**: Graceful degradation and error boundaries   

## Quick Start

```bash
npm install advanced-express
```

```javascript
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

## Basic Example

```html
<!-- views/index.ejs -->
<div id="counter">
  <span class="count">0</span>
  <button id="increment">+</button>
  <button id="decrement">-</button>
</div>

<script>
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
</script>
```

## Core Concepts

### Components

Components are the building blocks of your application. Each component has:
- State management
- Event handling
- Lifecycle methods
- Automatic cleanup

[Learn more about components](./hooks.md)

### Server-Side Integration

React Express seamlessly integrates with Express:
- Server-side rendering
- Route handling
- State hydration
- API integration

[Learn more about server integration](./state.md)

### State Management

Multiple ways to manage state:
- Component-local state
- Shared state between components
- Server-synchronized state

[Learn more about state management](./state.md)

### Forms

Built-in form handling features:
- Validation
- State management
- Error handling
- Submit handling

[Learn more about forms](./forms.md)

### Hot Module Reloading (HMR)

Development features:
- Real-time updates
- State preservation
- Error recovery
- Fast refresh

[Learn more about HMR](./hmr.md)

## Core Documentation

- [Getting Started](./getting-started.md)
- [Components and Hooks](./hooks.md)
- [Virtual DOM](./vdom.md)
- [State Management](./state-management.md)
- [Router](./router.md)
-  [Forms](./forms.md)
- [Error Boundaries](./error-boundary.md)

## Advanced Features

### Shared State
```javascript
const sharedState = ReactExpress.components.createSharedState({
  user: null,
  theme: 'light'
});

const userProfile = ReactExpress.components.createComponent(
  document.getElementById('profile'),
  {
    init: (component) => {
      sharedState.subscribe(state => {
        component.setState({ user: state.user });
      });
    }
  }
);
```

### TypeScript Support
```typescript
interface UserState {
  name: string;
  email: string;
}

const profile = ReactExpress.components.createComponent<UserState>(
  document.getElementById('profile')!,
  {
    initialState: {
      name: '',
      email: ''
    }
  }
);
```

### Server-Side Events
```javascript
const notifications = ReactExpress.components.createComponent(
  document.getElementById('notifications'),
  {
    init: (component) => {
      const eventSource = new EventSource('/api/notifications');
      eventSource.onmessage = (event) => {
        component.setState(state => ({
          messages: [...state.messages, JSON.parse(event.data)]
        }));
      };
    }
  }
);
```

## Best Practices

1. **Component Organization**
   - One component per file
   - Clear component boundaries
   - Reusable components

2. **State Management**
   - Keep state minimal
   - Use shared state for global data
   - Local state for UI-specific data

3. **Performance**
   - Optimize renders
   - Use event delegation
   - Clean up resources

4. **Error Handling**
   - Graceful degradation
   - Error boundaries
   - User feedback

## Contributing

We welcome contributions! Please see our [contributing guide](https://github.com/Emmanuek5/react-express) for details.

## License

MIT License - see [LICENSE](https://github.com/Emmanuek5/react-express/blob/main/LICENSE) for details.
