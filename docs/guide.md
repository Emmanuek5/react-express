# Guide

## Introduction

Welcome to the React Express guide! This guide will help you understand how to use React Express to build powerful server-rendered React applications with Express.

## Installation

```bash
# Using npm
npm install advanced-express

# Using yarn
yarn add advanced-express

# Using bun
bun add advanced-express
```

## Basic Setup

Here's a basic example of how to set up a React Express application:

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

## Core Concepts

React Express is built around several core concepts that you'll need to understand:


2. [State Management](./state-management.md) - Understand how to manage application state
3. [Lifecycle Events](./lifecycle.md) - Handle component lifecycle events
4. [Forms](./forms.md) - Work with forms and validation
5. [Error Handling](./error-boundary.md) - Implement error boundaries
6. [Hot Module Replacement](./hmr.md) - Enable real-time updates during development

## Best Practices

- Keep components small and focused
- Use TypeScript for better type safety
- Implement error boundaries for graceful error handling
- Optimize component rendering
- Follow React conventions for props and state management

## Advanced Topics

- [Virtual DOM Implementation](./vdom.md)
- [Context API](./context.md)
- [Suspense and Loading States](./suspense.md)
- [Routing](./router.md)

## Contributing

We welcome contributions! Please check our GitHub repository for contribution guidelines.

## Need Help?

If you need help or have questions:
1. Check the documentation
2. Open an issue on GitHub
3. Join our community discussions
