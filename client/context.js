// Context API implementation for React Express
class Context {
  constructor(defaultValue) {
    this.defaultValue = defaultValue;
    this.subscribers = new Map();
    this.value = defaultValue;
  }

  Provider(value) {
    this.value = value;
    this.notifySubscribers();
    return {
      value,
      _isProvider: true,
      _context: this,
    };
  }

  Consumer(callback) {
    const id = Math.random().toString(36).substr(2, 9);
    this.subscribers.set(id, callback);
    callback(this.value);

    return {
      id,
      _isConsumer: true,
      _context: this,
    };
  }

  notifySubscribers() {
    this.subscribers.forEach((callback) => callback(this.value));
  }
}

// Initialize ReactExpress context system
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.createContext = (defaultValue) => new Context(defaultValue);

// Example usage in HTML:
/*
<!-- Create a context -->
<script>
  const ThemeContext = ReactExpress.createContext('light');
</script>

<!-- Provider -->
<div data-context="theme" data-context-value="dark">
  <!-- Consumer -->
  <div data-context-consumer="theme">
    Current theme: {value}
  </div>
</div>
*/

// Initialize context elements
document.addEventListener("DOMContentLoaded", () => {
  // Initialize providers
  document.querySelectorAll("[data-context]").forEach((element) => {
    const contextName = element.getAttribute("data-context");
    const contextValue = element.getAttribute("data-context-value");
    const context = window[contextName + "Context"];

    if (context && context instanceof Context) {
      context.Provider(contextValue);

      // Watch for attribute changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "data-context-value"
          ) {
            context.Provider(element.getAttribute("data-context-value"));
          }
        });
      });

      observer.observe(element, { attributes: true });
    }
  });

  // Initialize consumers
  document.querySelectorAll("[data-context-consumer]").forEach((element) => {
    const contextName = element.getAttribute("data-context-consumer");
    const context = window[contextName + "Context"];

    if (context && context instanceof Context) {
      const template = element.innerHTML;

      context.Consumer((value) => {
        element.innerHTML = template.replace(/\{value\}/g, value);
      });
    }
  });
});
