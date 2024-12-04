# React Express Integration

A TypeScript-based integration that allows you to use React Like features with Express.

## Features

- Real-time state management with WebSocket support
- Hot Module Reloading (HMR)
- Server-side rendering with EJS
- TypeScript support
- Express middleware integration

## Installation

```bash
npm install advanced-express
```

## Development

2. Start the test server:
```bash
cd test-server
npm run dev
```

## Usage

```typescript
import { reactExpress } from "advanced-express";
import express from "express";
import path from "path";
import { Server } from "http";
import { Server as SocketIOServer } from "socket.io";


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
    console.log(`Example app listening on port ${port}`);
});
```
### State Management

The library provides a reactive state management system using data attributes:

```html
<!-- Bind element to state -->
<div data-react-state="counter">0</div>

<!-- Subscribe to state changes -->
<script>
  ReactExpress.subscribe(['counter'], ([count]) => {
    return count * 2; // Return value updates the parent element
  });

  // Update state
  ReactExpress.setState('counter', 1);

  // Batch update multiple states
  ReactExpress.batchUpdate({
    counter: 1,
    name: 'John'
  });
</script>
```

Features:
- Declarative data binding with `data-react-state`
- Automatic DOM updates
- State subscriptions with automatic cleanup
- Real-time sync with WebSocket
- Batch state updates

### Suspense

Advanced loading state management with customizable placeholders:

```html
<!-- Basic suspense with default loading animation -->
<div data-suspense="user-data">
  Content that will be loaded
</div>

<!-- Custom inline placeholder -->
<div data-suspense="profile" data-placeholder="<div>Custom loading...</div>">
  Profile content
</div>

<!-- Load placeholder from a template file -->
<div data-suspense="dashboard" data-placeholder-file="/templates/loading.ejs">
  Dashboard content
</div>
```

Features:
- Beautiful default loading animation
- Custom inline placeholders
- Template-based placeholders via `data-placeholder-file`
- Intersection Observer for lazy loading
- Error handling with fallbacks
- Smooth transitions with CSS animations

The default placeholder includes a modern pulse animation and can be styled via CSS:

```css
.react-express-loader {
  /* Your custom styles */
  background: linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%);
  animation: loader-pulse 1.5s ease-in-out infinite;
}
```

### Routing/Prefetching 

Client-side routing with automatic prefetching:

```html
<!-- Enable client-side routing -->
<a href="/dashboard" data-route>Dashboard</a>

<!-- Enable prefetching -->
<a href="/profile" prefetch>Profile</a>

<!-- Dynamic prefetch on viewport entry -->
<a href="/settings" prefetch="visible">Settings</a>
```

Features:
- SPA-like navigation with history support
- Intelligent prefetching strategies
- Cache management for prefetched content
- Intersection Observer for viewport-based prefetching

## Requirements

- Node.js >= 18
- npm >= 9.0.0

## Scripts

- `npm run build` - Build the TypeScript files
- `npm run prepare` - Prepare the package for publishing

## License

MIT