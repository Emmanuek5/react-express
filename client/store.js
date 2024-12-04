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
  }

  commit(type, payload) {
    const mutation = this.mutations[type];
    if (!mutation) {
      throw new Error(`Unknown mutation type: ${type}`);
    }

    const prevState = JSON.parse(JSON.stringify(this.state));
    mutation(this.state, payload);

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
        app.store = store;
        // Integrate with hooks system
        app.hooks.useState = (selector) => {
          const [state, setState] = window.ReactExpress.hooks.useState(
            selector(store.state)
          );

          window.ReactExpress.hooks.useEffect(() => {
            return store.subscribe((newState) => {
              setState(selector(newState));
            });
          }, []);

          return state;
        };
      },
    };
  }
}

// Add to ReactExpress
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.createStore = (options) => new Store(options);
