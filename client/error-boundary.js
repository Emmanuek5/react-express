class ErrorBoundary {
  constructor(options = {}) {
    this.fallback = options.fallback || this.defaultFallback;
    this.onError = options.onError;
  }

  defaultFallback(error) {
    return `
      <div class="error-boundary-fallback">
        <h2>Something went wrong</h2>
        <p>Error: ${error.message}</p>
      </div>
    `;
  }

  wrapComponent(element, options = {}) {
    const component = ReactExpress.components.createComponent(element, {
      initialState: { error: null },

      init: (comp) => {
        // Original initialization if provided
        if (options.init) {
          try {
            options.init(comp);
          } catch (error) {
            this.handleError(comp, error);
          }
        }

        // Add error event listener
        comp.listen("self", "error", (event, comp) => {
          event.preventDefault();
          this.handleError(comp, event.error);
        });
      },

      render: (state, el) => {
        if (state.error) {
          el.innerHTML = this.fallback(state.error);
        } else if (options.render) {
          try {
            options.render(state, el);
          } catch (error) {
            this.handleError(component, error);
          }
        }
      },
    });

    return component;
  }

  handleError(component, error) {
    component.setState({ error });
    if (this.onError) {
      try {
        this.onError(error);
      } catch (callbackError) {
        console.error("Error in error boundary callback:", callbackError);
      }
    }
    console.error("Error caught by boundary:", error);
    try {
      window.ReactExpress &&
        window.ReactExpress.ErrorOverlay &&
        window.ReactExpress.ErrorOverlay.log(error, { type: 'boundary' });
    } catch {}
  }
}

// Add to ReactExpress
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.createErrorBoundary = (options) =>
  new ErrorBoundary(options);
