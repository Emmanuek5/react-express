// Reactive State Management System
class ReactiveSystem {
  constructor() {
    this.subscribers = new Map();
    this.computedDependencies = new Map();
    this.currentComputation = null;
  }

  createReactive(target) {
    const self = this;
    return new Proxy(target, {
      get(obj, prop) {
        if (self.currentComputation) {
          // Track dependency
          if (!self.subscribers.has(prop)) {
            self.subscribers.set(prop, new Set());
          }
          self.subscribers.get(prop).add(self.currentComputation);
        }
        return obj[prop];
      },
      set(obj, prop, value) {
        const oldValue = obj[prop];
        obj[prop] = value;

        // Notify subscribers if value changed
        if (oldValue !== value && self.subscribers.has(prop)) {
          self.subscribers
            .get(prop)
            .forEach((callback) => callback(value, oldValue));
        }
        return true;
      },
    });
  }

  computed(fn) {
    let value;
    let isStale = true;

    const compute = () => {
      this.currentComputation = () => {
        isStale = true;
        notifySubscribers();
      };
      value = fn();
      this.currentComputation = null;
      isStale = false;
    };

    const notifySubscribers = () => {
      if (this.subscribers.has(compute)) {
        this.subscribers.get(compute).forEach((callback) => callback(get()));
      }
    };

    const get = () => {
      if (isStale) {
        compute();
      }
      return value;
    };

    compute();
    return get;
  }

  watch(fn) {
    let cleanup;
    const watcher = () => {
      if (cleanup) cleanup();
      this.currentComputation = watcher;
      cleanup = fn();
      this.currentComputation = null;
    };
    watcher();
    return () => {
      if (cleanup) cleanup();
    };
  }
}

// Add to ReactExpress
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.reactive = new ReactiveSystem();
