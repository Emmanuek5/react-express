// Component Lifecycle implementation for React Express
class Component {
  constructor(element) {
    this.element = element;
    this.state = {};
    this.props = this.getProps();
    this.mounted = false;
    this.refs = {};
  }

  setState(newState, callback) {
    const prevState = { ...this.state };
    const nextState =
      typeof newState === "function" ? newState(prevState) : newState;

    this.state = { ...this.state, ...nextState };

    if (this.shouldComponentUpdate(this.props, this.state, prevState)) {
      // Provide correct prevState to componentDidUpdate
      this._prevStateForUpdate = prevState;
      this.updateComponent();
    }

    if (callback) callback();
  }

  getProps() {
    const props = {};
    Array.from(this.element.attributes).forEach((attr) => {
      if (attr.name.startsWith("data-prop-")) {
        const propName = attr.name.replace("data-prop-", "");
        props[propName] = attr.value;
      }
    });
    return props;
  }

  // Lifecycle methods
  componentDidMount() {}
  componentDidUpdate(prevProps, prevState) {}
  componentWillUnmount() {}
  shouldComponentUpdate(nextProps, nextState, prevState) {
    return true;
  }
  render() {
    return "";
  }

  updateComponent() {
    const prevProps = { ...this.props };
    // Use prevState captured during setState if available
    const prevState = this._prevStateForUpdate ?? { ...this.state };
    delete this._prevStateForUpdate;

    // Update props
    this.props = this.getProps();

    // Render new content
    const content = this.render();
    if (content !== undefined) {
      this.element.innerHTML = content;
    }

    // Initialize refs
    this.element.querySelectorAll("[ref]").forEach((el) => {
      const refName = el.getAttribute("ref");
      this.refs[refName] = el;
    });

    if (!this.mounted) {
      this.mounted = true;
      this.componentDidMount();
    } else {
      this.componentDidUpdate(prevProps, prevState);
    }
  }

  destroy() {
    this.componentWillUnmount();
    this.mounted = false;
    this.refs = {};
  }
}

// Initialize ReactExpress component system
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.Component = Component;

// Example usage:
/*
<div data-component="todo-list" data-prop-title="My Todos">
  <ul ref="list"></ul>
  <button ref="addButton">Add Todo</button>
</div>

<script>
class TodoList extends ReactExpress.Component {
  constructor(element) {
    super(element);
    this.state = {
      todos: []
    };
  }

  componentDidMount() {
    this.refs.addButton.addEventListener('click', () => {
      this.setState(state => ({
        todos: [...state.todos, `Todo ${state.todos.length + 1}`]
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

// Initialize components
document.querySelectorAll('[data-component="todo-list"]').forEach(element => {
  const component = new TodoList(element);
  component.updateComponent();
});
</script>
*/

// Initialize components on DOM load
document.addEventListener("DOMContentLoaded", () => {
  const componentRegistry = new Map();

  // Observe DOM changes for dynamic component initialization
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          if (node.hasAttribute("data-component")) {
            initializeComponent(node);
          }
          // Initialize any nested components within the added node
          node
            .querySelectorAll &&
            node
              .querySelectorAll("[data-component]")
              .forEach((el) => initializeComponent(el));
        }
      });

      mutation.removedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          const toCleanup = [];
          if (node.hasAttribute && node.hasAttribute("data-component")) {
            toCleanup.push(node);
          }
          // Also cleanup nested components being removed
          node.querySelectorAll &&
            node
              .querySelectorAll("[data-component]")
              .forEach((el) => toCleanup.push(el));

          toCleanup.forEach((el) => {
            const component = componentRegistry.get(el);
            if (component) {
              component.destroy();
              componentRegistry.delete(el);
            }
          });
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initialize existing components
  document.querySelectorAll("[data-component]").forEach(initializeComponent);

  function initializeComponent(element) {
    const componentName = element.getAttribute("data-component");
    // Resolve global constructor by exact, PascalCase, or capitalized name
    const resolveComponentClass = (name) => {
      if (!name) return null;
      const pascal = name
        .split(/[-_]/)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join("");
      const candidates = [name, pascal, name.charAt(0).toUpperCase() + name.slice(1)];
      for (const n of candidates) {
        if (window[n]) return window[n];
      }
      return null;
    };

    const ComponentClass = resolveComponentClass(componentName);

    if (ComponentClass && ComponentClass.prototype instanceof Component) {
      const component = new ComponentClass(element);
      componentRegistry.set(element, component);
      component.updateComponent();
    }
  }

  // Expose a manual initializer for dynamic content
  window.ReactExpress.initializeComponents = (root = document) => {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll("[data-component]").forEach(initializeComponent);
  };
});
