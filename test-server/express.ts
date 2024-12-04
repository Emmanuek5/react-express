import express from "express";
import { Server } from "http";
import { reactExpress } from "../"; // or "../src" for local development
import path from "path";
import { Server as SocketIOServer } from "socket.io";

// Initialize Express and create HTTP server
const app = express();
const server = new Server(app);
const io = new SocketIOServer(server);

// Set server instance on app for Socket.IO
app.set('server', server);

// Initialize React Express middleware with proper paths
const middleware = reactExpress({
    viewsDir: path.join(__dirname, 'views'),
    hmr: true
});

// Apply the middleware
middleware(app);

// Add body parser middleware for POST requests
app.use(express.json());

// Server-side state management
const serverState = new Map<string, any>();

// Initialize the state system
const initializeState = (req: express.Request) => {
    req.reactState.setState('firstName', 'John');
    req.reactState.setState('lastName', 'Doe');
    req.reactState.setState('counter', 0);
    req.reactState.setState('todos', [
        { id: 1, text: 'Learn React Express', completed: false },
        { id: 2, text: 'Build something awesome', completed: true }
    ]);
};




// Main route
app.get("/", (req, res) => {
    //checck if the state is already initialized
    

    initializeState(req);
    res.render("index");
});

// Add routes for router test pages
app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/contact", (req, res) => {
  res.render("contact");
});

// API endpoints for state updates
app.post('/api/counter/increment', (req, res) => {
    const currentValue = req.reactState.getState('counter') || 0;
    req.reactState.setState('counter', currentValue + 1);
    res.json({ success: true, value: currentValue + 1 });
});

app.post('/api/user/update', (req, res) => {
    const { firstName, lastName } = req.body;
    if (firstName) req.reactState.setState('firstName', firstName);
    if (lastName) req.reactState.setState('lastName', lastName);
    res.json({ 
        success: true,
        user: {
            firstName: req.reactState.getState('firstName'),
            lastName: req.reactState.getState('lastName')
        }
    });
});

app.post('/api/todos/add', (req, res) => {
    const { text } = req.body;
    const todos = req.reactState.getState('todos') || [];
    const newTodo = { id: Date.now(), text, completed: false };
    req.reactState.setState('todos', [...todos, newTodo]);
    res.json({ success: true, todos: [...todos, newTodo] });
});

app.post('/api/todos/toggle/:id', (req, res) => {
    const todos = req.reactState.getState('todos') || [];
    const id = parseInt(req.params.id);
    const updatedTodos = todos.map((todo:any) => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    req.reactState.setState('todos', updatedTodos);
    res.json({ success: true, todos: updatedTodos });
});

// State management endpoints
app.get("/api/state", (req, res) => {
  const key = req.query.key as string;
  if (key) {
    res.json({ value: serverState.get(key) });
  } else {
    const state = Object.fromEntries(serverState);
    res.json(state);
  }
});

app.post("/api/state/update", (req, res) => {
  const { key, value } = req.body;
  serverState.set(key, value);
  
  // Broadcast the state change to all connected clients
  io.emit("state:update", { key, value });
  
  res.json({ success: true });
});

app.post("/api/state/batch-update", (req, res) => {
  const { updates } = req.body;
  Object.entries(updates).forEach(([key, value]) => {
    serverState.set(key, value);
  });
  
  // Broadcast the batch update
  io.emit("state:batch-update", { updates });
  
  res.json({ success: true });
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  // Send initial state to the client
  socket.emit("state:init", Object.fromEntries(serverState));

  // Handle state updates from client
  socket.on("state:update", ({ key, value }) => {
    serverState.set(key, value);
    // Broadcast to other clients
    socket.broadcast.emit("state:update", { key, value });
  });

  socket.on("state:batch-update", ({ updates }) => {
    Object.entries(updates).forEach(([key, value]) => {
      serverState.set(key, value);
    });
    // Broadcast to other clients
    socket.broadcast.emit("state:batch-update", { updates });
  });
});

// Start the server
server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});