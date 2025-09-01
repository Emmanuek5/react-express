// Initialize the global ReactExpress object
window.ReactExpress = window.ReactExpress || {
  state: new Map(),
  subscribers: new Map(),

  initializeState() {
    // Bridge: bind all [data-react-state] elements via hooks
    const hooks = window.ReactExpress.hooks;
    const primeAndBind = (element) => {
      const key = element.getAttribute("data-react-state");
      if (!key) return;
      // Prime binding so _scanForStateBindings attaches input listeners
      const tag = (element.tagName || '').toUpperCase();
      const initial = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
        ? element.value
        : element.textContent;
      hooks.useState(key, initial);
      // Delegate binding to hooks; formatters resolve via data-format
      hooks.bindState(key, element);
    };

    document.querySelectorAll("[data-react-state]").forEach(primeAndBind);

    // Observe for dynamically added nodes (router/suspense/HMR)
    if (!window.ReactExpress.__stateObserver) {
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (!(node instanceof HTMLElement)) continue;
            if (node.matches && node.matches('[data-react-state]')) primeAndBind(node);
            if (node.querySelectorAll) {
              node.querySelectorAll('[data-react-state]').forEach(primeAndBind);
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      window.ReactExpress.__stateObserver = observer;
    }
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

    // Bridge subscriptions through hooks event bus
    const run = () => {
      const values = keys.map((k) => window.ReactExpress.getState(k));
      const result = callback(values);
      if (elementId) updateTargetElement(result);
    };

    const unsubs = keys.map((k) =>
      window.ReactExpress.components.onStateChange(k, () => run())
    );

    this.subscribers.set(id, {
      keys,
      callback,
      elementId,
      updateElement: updateTargetElement,
      unsubs,
    });

    // Initial call with current values
    run();

    return id;
  },

  setState(key, value, options = { sync: false }) {
    // Delegate state updates to hooks store
    const [, set] = window.ReactExpress.hooks.useState(key, null);
    set(value);

    // Sync with server if needed
    if (options.sync && socket) {
      socket.emit("state:update", { key, value });
    }
  },
  getState(key) {
    // Read via hooks store; ensure binding exists
    const [get] = window.ReactExpress.hooks.useState(key, undefined);
    return get();
  },

  batchUpdate(updates, options = { sync: true }) {
    Object.entries(updates).forEach(([key, value]) => {
      this.setState(key, value, { ...options, sync: false });
    });

    if (options.sync && socket) {
      socket.emit("state:batch-update", { updates });
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

  // Initialize the state system
  window.ReactExpress.initializeState();

  if (socket) {
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
