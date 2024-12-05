// Initialize the global ReactExpress object
window.ReactExpress = window.ReactExpress || {
  state: new Map(),
  subscribers: new Map(),

  initializeState() {
    // Initialize state elements
    document.querySelectorAll("[data-react-state]").forEach((element) => {
      const key = element.getAttribute("data-react-state");
      const value = this.state.get(key);
      if (value !== undefined) {
        updateElement(element, value);
      }
    });
  },

  subscribe(keys, callback, elementId = null) {
    if (!Array.isArray(keys)) {
      keys = [keys];
    }

    const id = Math.random().toString(36).substring(7);

    // Function to find and update element - now checks for element each time
    const updateTargetElement = (result) => {
      const attemptUpdate = (retries = 10) => {
        const element = document.getElementById(elementId);
        if (element) {
          try {
            element.innerHTML = result;
          } catch (err) {
            console.warn(`Error updating element ${elementId}:`, err);
          }
        } else if (retries > 0) {
          setTimeout(() => attemptUpdate(retries - 1), 100); // Retry after 100ms
        } else {
          console.warn(`Element with ID ${elementId} not found after retries.`);
        }
      };

      attemptUpdate();
    };

    this.subscribers.set(id, {
      keys,
      callback,
      elementId,
      updateElement: updateTargetElement,
    });

    // Initial call with current values
    const values = keys.map((k) => this.state.get(k));
    const result = callback(values);
    updateTargetElement(result);

    return id;
  },

  setState(key, value, options = { sync: false }) {
    this.state.set(key, value);

    // Update DOM elements with matching data-react-state
    document
      .querySelectorAll(`[data-react-state="${key}"]`)
      .forEach((element) => updateElement(element, value));

    // Update subscribers
    this.subscribers.forEach(({ keys, callback, updateElement }) => {
      if (keys.includes(key)) {
        const values = keys.map((k) => this.state.get(k));
        const result = callback(values);
        updateElement(result);
      }
    });

    // Sync with server if needed
    if (options.sync && socket) {
      socket.emit("state:update", { key, value });
    }
  },
  getState(key) {
    return this.state.get(key);
  },

  batchUpdate(updates, options = { sync: true }) {
    Object.entries(updates).forEach(([key, value]) => {
      this.setState(key, value, { ...options, sync: false });
    });

    if (options.sync && socket) {
      socket.emit("state:batch-update", { updates });
    }
  },

  // Load initial state from server
  async loadInitialState() {
    try {
      const response = await fetch("/api/state");
      const initialState = await response.json();
      Object.entries(initialState).forEach(([key, value]) => {
        this.setState(key, value, { sync: false });
      });
    } catch (error) {
      console.error("Failed to load initial state:", error);
    }
  },
};

const updateElement = (element, value) => {
  if (typeof value === "object") {
    const type = element.getAttribute("data-type") || "json";
    switch (type) {
      case "json":
        element.textContent = JSON.stringify(value, null, 2);
        break;
      case "list":
        element.innerHTML = Array.isArray(value)
          ? value.map((item) => `<li>${item}</li>`).join("")
          : value;
        break;
      case "todo":
        if (Array.isArray(value)) {
          element.innerHTML = value
            .map(
              (todo) => `
            <div class="todo-item">
              <input type="checkbox" ${todo.completed ? "checked" : ""}>
              <span>${todo.text}</span>
            </div>
          `
            )
            .join("");
        }
        break;
      default:
        element.textContent = JSON.stringify(value);
    }
  } else {
    element.textContent = value;
  }
};

let socket;

export const initState = async (_socket) => {
  socket = _socket;

  // Load initial state from server
  await window.ReactExpress.loadInitialState();

  // Initialize the state system
  window.ReactExpress.initializeState();

  if (socket) {
    // Handle initial state from server
    socket.on("state:init", (initialState) => {
      Object.entries(initialState).forEach(([key, value]) => {
        window.ReactExpress.setState(key, value, { sync: false });
      });
    });

    // Handle individual state updates
    socket.on("state:update", ({ key, value }) => {
      window.ReactExpress.setState(key, value, { sync: false });
    });

    // Handle batch updates
    socket.on("state:batch-update", ({ updates }) => {
      window.ReactExpress.batchUpdate(updates, { sync: false });
    });
  }
};

ReactExpress.initState = initState;
