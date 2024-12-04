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
    const prevState = { ...this.state };

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
        if (node.nodeType === 1 && node.hasAttribute("data-component")) {
          initializeComponent(node);
        }
      });

      mutation.removedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.hasAttribute("data-component")) {
          const component = componentRegistry.get(node);
          if (component) {
            component.destroy();
            componentRegistry.delete(node);
          }
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
    const ComponentClass = window[componentName];

    if (ComponentClass && ComponentClass.prototype instanceof Component) {
      const component = new ComponentClass(element);
      componentRegistry.set(element, component);
      component.updateComponent();
    }
  }
});
