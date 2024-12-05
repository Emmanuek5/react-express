// Error Boundary System for ReactExpress
class ErrorBoundary {
  constructor(options = {}) {
    this.fallback = options.fallback || this.defaultFallback;
    this.onError = options.onError;
    this.errorState = null;
    this.wrappedContent = null;
    this.boundaryElement = null;
  }

  defaultFallback(error) {
    return `
      <div class="error-boundary-fallback">
        <h2>Something went wrong</h2>
        <p>Error: ${error.message}</p>
      </div>
    `;
  }

  wrap(element, content) {
    this.boundaryElement = element;
    this.wrappedContent = content;

    // Create wrapper to catch errors
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-error-boundary", "");

    try {
      wrapper.innerHTML = content;
    } catch (error) {
      this.handleError(error);
    }

    // Set up error event listener for runtime errors
    wrapper.addEventListener("error", (event) => {
      event.preventDefault();
      this.handleError(event.error);
    });

    // Custom error event for caught errors
    wrapper.addEventListener("react-express-error", (event) => {
      this.handleError(event.detail.error);
    });

    element.appendChild(wrapper);

    return {
      reset: () => this.reset(),
      destroy: () => this.destroy(),
    };
  }

  handleError(error) {
    this.errorState = error;

    // Call onError callback if provided
    if (this.onError) {
      try {
        this.onError(error);
      } catch (callbackError) {
        console.error("Error in error boundary callback:", callbackError);
      }
    }

    // Log error
    console.error("Error caught by boundary:", error);

    // Replace content with fallback
    if (this.boundaryElement) {
      const wrapper = this.boundaryElement.querySelector(
        "[data-error-boundary]"
      );
      if (wrapper) {
        wrapper.innerHTML = this.fallback(error);
      }
    }

    // Dispatch error event for parent boundaries
    const errorEvent = new CustomEvent("react-express-error", {
      bubbles: true,
      cancelable: true,
      detail: { error },
    });
    this.boundaryElement?.dispatchEvent(errorEvent);
  }

  reset() {
    if (this.boundaryElement && this.wrappedContent) {
      this.errorState = null;
      const wrapper = this.boundaryElement.querySelector(
        "[data-error-boundary]"
      );
      if (wrapper) {
        try {
          wrapper.innerHTML = this.wrappedContent;
        } catch (error) {
          this.handleError(error);
        }
      }
    }
  }

  destroy() {
    if (this.boundaryElement) {
      const wrapper = this.boundaryElement.querySelector(
        "[data-error-boundary]"
      );
      wrapper?.remove();
      this.boundaryElement = null;
      this.wrappedContent = null;
      this.errorState = null;
    }
  }
}

// Add to ReactExpress
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.createErrorBoundary = (options) =>
  new ErrorBoundary(options);

// Error boundary hook
window.ReactExpress.hooks.useErrorBoundary = (options = {}) => {
  const [error, setError] = window.ReactExpress.hooks.useState(null);
  const boundary = window.ReactExpress.hooks.useRef(null);

  window.ReactExpress.hooks.useEffect(() => {
    const element = document.getElementById(options.elementId);
    if (!element) return;

    boundary.current = window.ReactExpress.createErrorBoundary({
      fallback: options.fallback,
      onError: (error) => {
        setError(error);
        options.onError?.(error);
      },
    });

    const { destroy } = boundary.current.wrap(element, options.children);
    return destroy;
  }, [options.elementId, options.children]);

  return {
    error,
    reset: () => {
      boundary.current?.reset();
      setError(null);
    },
  };
};
