class Store {
  constructor(options = {}) {
    this.state = window.ReactExpress.reactive.createReactive(
      options.state || {}
    );
    this.mutations = options.mutations || {};
    this.actions = options.actions || {};
    this.modules = options.modules || {};
    this.subscribers = new Set();

    // Initialize modules
    Object.entries(this.modules).forEach(([key, module]) => {
      this.state[key] = module.state;
      this.mutations = { ...this.mutations, ...module.mutations };
      this.actions = { ...this.actions, ...module.actions };
    });

    // Bridge: initialize hooks bindings for top-level keys with initial values
    try {
      const hooks = window.ReactExpress && window.ReactExpress.hooks;
      if (hooks && typeof hooks.useState === 'function') {
        Object.keys(this.state).forEach((key) => {
          // Initialize binding value without forcing a render
          hooks.useState(key, this.state[key]);
        });
      }
    } catch (_) {}
  }

  commit(type, payload) {
    const mutation = this.mutations[type];
    if (!mutation) {
      throw new Error(`Unknown mutation type: ${type}`);
    }

    const prevState = JSON.parse(JSON.stringify(this.state));
    mutation(this.state, payload);

    // Bridge: forward all top-level keys into hooks to drive VDOM renders
    try {
      const hooks = window.ReactExpress && window.ReactExpress.hooks;
      if (hooks && typeof hooks.useState === 'function') {
        const prevKeys = Object.keys(prevState);
        const currKeys = Object.keys(this.state);
        const allKeys = new Set([...prevKeys, ...currKeys]);
        allKeys.forEach((key) => {
          const [, set] = hooks.useState(key, this.state[key]);
          // Set to undefined if key was removed
          set(currKeys.includes(key) ? this.state[key] : undefined);
        });
      }
    } catch (_) {}

    // Notify subscribers
    this.subscribers.forEach((sub) => sub(this.state, prevState));
  }

  async dispatch(type, payload) {
    const action = this.actions[type];
    if (!action) {
      throw new Error(`Unknown action type: ${type}`);
    }

    const context = {
      state: this.state,
      commit: this.commit.bind(this),
      dispatch: this.dispatch.bind(this),
    };

    return action(context, payload);
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Helper to create store plugin
  static plugin(store) {
    return {
      install(app) {
        // Expose store without overriding hooks API
        app.store = store;
        // Optional helper for selecting state into a hooks binding
        app.storeSelect = (key, selector = (s) => s[key]) => {
          const hooks = window.ReactExpress.hooks;
          const [get, set] = hooks.useState(key, selector(store.state));
          hooks.useEffect(() => store.subscribe((s) => set(selector(s))), []);
          return get;
        };
      },
    };
  }
}

// Add to ReactExpress
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.createStore = (options) => new Store(options);
