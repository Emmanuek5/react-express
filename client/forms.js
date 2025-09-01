class FormSystem {
  constructor(options = {}) {
    this.forms = new Map();
    this.options = {
      defaultMethod: "post",
      defaultContentType: "application/json",
      // Allow global configuration overrides
      ...options,
    };
    this.initializeForms();
  }

  initializeForms() {
    // Use mutation observer with more efficient selector
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Added forms
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches && node.matches("form[data-react-form]")) {
            this.setupForm(node);
          }
          // Also check subtree
          if (node.querySelectorAll) {
            node
              .querySelectorAll("form[data-react-form]")
              .forEach((form) => this.setupForm(form));
          }
        }

        // Removed forms: clean up map to avoid stale entries
        for (const node of mutation.removedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const maybeCleanup = (el) => {
            if (el && el.matches && el.matches("form[data-react-form]")) {
              const formId = el.getAttribute("data-react-form");
              if (this.forms.has(formId)) this.forms.delete(formId);
            }
          };
          maybeCleanup(node);
          if (node.querySelectorAll) {
            node.querySelectorAll("form[data-react-form]").forEach(maybeCleanup);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Initial form setup
    document
      .querySelectorAll("form[data-react-form]")
      .forEach((form) => this.setupForm(form));
  }

  setupForm(form) {
    const formId = form.getAttribute("data-react-form");
    if (this.forms.has(formId)) {
      const existing = this.forms.get(formId);
      if (existing && existing.form === form) return; // already wired
      // Rebind to new DOM element with same ID (e.g., after HMR patch)
    }

    const config = this.parseFormConfig(form);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.handleSubmit(form, config);
    });

    this.forms.set(formId, { form, config });
  }

  parseFormConfig(form) {
    return {
      method:
        form.getAttribute("method")?.toLowerCase() ||
        this.options.defaultMethod,
      action: form.getAttribute("action") || window.location.pathname,
      validate: form.hasAttribute("data-validate"),
      transform: form.getAttribute("data-transform"),
      resetOnSuccess: form.hasAttribute("data-reset-on-success"),
      updateState: form.getAttribute("data-update-state"),
      successCallback: form.getAttribute("data-success"),
      errorCallback: form.getAttribute("data-error"),
      contentType:
        form.getAttribute("data-content-type") ||
        this.options.defaultContentType,
    };
  }

  async handleSubmit(form, config) {
    let formData,
      data = {};

    try {
      // Collect form data
      formData = new FormData(form);
      data = Object.fromEntries(formData);

      // Apply optional data transformation
      if (config.transform) {
        const transformFn = this.getGlobalFunction(config.transform);
        data = transformFn ? transformFn(data) : data;
      }

      // Perform optional validation
      if (config.validate) {
        const validateFn = this.getValidationFunction(form);
        const validationResult = validateFn ? validateFn(data) : true;

        if (validationResult !== true) {
          throw new Error(validationResult || "Validation failed");
        }
      }

      // Send request with flexible configuration
      const response = await this.sendRequest(config, data, form);
      const result = await response.json();

      // Handle successful submission
      this.handleSuccessfulSubmission(form, config, result, data);
    } catch (error) {
      this.handleSubmissionError(form, config, error, data);
    }
  }

  async sendRequest(config, data, form) {
    // Build body based on content type
    let body;
    if (config.contentType === "application/json") {
      body = JSON.stringify(data);
    } else if (config.contentType === "application/x-www-form-urlencoded") {
      // Prefer URLSearchParams for classic forms
      body = new URLSearchParams(new FormData(form));
    } else {
      // Fallback to multipart/form-data via FormData(form)
      body = new FormData(form);
    }

    const response = await fetch(config.action, {
      method: config.method,
      headers: {
        // Let browser set boundary for FormData; only set when not FormData
        ...(body instanceof FormData ? {} : { "Content-Type": config.contentType }),
        "X-Requested-With": "XMLHttpRequest",
      },
      body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    return response;
  }

  handleSuccessfulSubmission(form, config, result, originalData) {
    // Update application state if specified
    if (config.updateState) {
      const stateKey = config.updateState;
      ReactExpress.setState(stateKey, result.data || result, { sync: true });
    }

    // Reset form if configured
    if (config.resetOnSuccess) {
      form.reset();
    }

    // Trigger success callback
    this.triggerCallback(config.successCallback, result);

    // Dispatch success event
    form.dispatchEvent(
      new CustomEvent("formSuccess", {
        detail: { result, data: originalData },
      })
    );
  }

  handleSubmissionError(form, config, error, originalData) {
    console.error("Form submission error:", error);

    // Also log to overlay in dev (non-blocking)
    try {
      window.ReactExpress &&
        window.ReactExpress.ErrorOverlay &&
        window.ReactExpress.ErrorOverlay.log(error, {
          type: "form",
          formId: form.getAttribute("data-react-form"),
          action: config.action,
        });
    } catch {}

    // Trigger error callback
    this.triggerCallback(config.errorCallback, error);

    // Dispatch error event
    form.dispatchEvent(
      new CustomEvent("formError", {
        detail: {
          error: {
            message: error.message,
            field: error.field,
          },
          data: originalData,
        },
      })
    );
  }

  // Utility methods for function retrieval
  getGlobalFunction(functionName) {
    return typeof window[functionName] === "function"
      ? window[functionName]
      : null;
  }

  getValidationFunction(form) {
    const formId = form.getAttribute("data-react-form");
    const validateFn = window[`validate${formId}`];
    return typeof validateFn === "function" ? validateFn : null;
  }

  triggerCallback(callbackName, data) {
    const callback = this.getGlobalFunction(callbackName);
    if (callback) {
      callback(data);
    }
  }

  // Expose form retrieval method
  getForm(formId) {
    return this.forms.get(formId);
  }
}

// Initialize forms system with optional global configuration
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.forms = new FormSystem({
  defaultMethod: "post",
  defaultContentType: "application/json",
});
