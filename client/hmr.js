class HotModuleReplacement {
  constructor() {
    this.socket = null;
    this.updateListeners = new Set();
  }

  /**
   * Initialize HMR with a socket connection
   * @param {Socket} socket - Socket.io connection
   */
  init(socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  /**
   * Set up socket listeners for HMR updates
   * @private
   */
  setupSocketListeners() {
    if (!this.socket) {
      console.error('Socket not initialized for HMR');
      return;
    }

    this.socket.on("hmr:update", async (data) => {
      try {
        console.log("Received HMR update:", data);
        await this.processUpdate();
      } catch (error) {
        this.handleUpdateError(error);
      }
    });
  }

  /**
   * Process HMR update
   * @private
   */
  async processUpdate() {
    const response = await fetch(
      `/__react-express/placeholder${window.location.pathname}`,
      {
        headers: { "X-HMR-Request": "true" },
      }
    );
    const html = await response.text();

    // Create temporary container to parse content
    const temp = document.createElement("div");
    temp.innerHTML = html;

    // Preserve current state
    const stateValues = this.captureStateValues();
    const formStates = this.captureFormStates();

    // Identify the main content container
    const contentContainer =
      document.querySelector("body") || document.documentElement;
    const newContentContainer = temp.querySelector("body") || temp;

    // Merge content
    this.mergeContent(contentContainer, newContentContainer);

    // Restore states
    this.restoreStateValues(stateValues);
    this.restoreFormStates(formStates);

    // Re-execute scripts
    this.processScripts();

    // Dispatch successful update event
    this.dispatchUpdateEvent(true);
  }

  /**
   * Capture current state values
   * @private
   * @returns {Map} Map of state values
   */
  captureStateValues() {
    const stateValues = new Map();
    document.querySelectorAll("[data-react-state]").forEach((el) => {
      stateValues.set(el.getAttribute("data-react-state"), el.textContent);
    });
    return stateValues;
  }

  /**
   * Capture current form states
   * @private
   * @returns {Map} Map of form states
   */
  captureFormStates() {
    const formStates = new Map();
    document.querySelectorAll("input, select, textarea").forEach((input) => {
      formStates.set(input, {
        value: input.value,
        type: input.type,
        checked: input.checked,
        selectionStart: input.selectionStart,
        selectionEnd: input.selectionEnd,
      });
    });
    return formStates;
  }

  /**
   * Merge content while preserving critical scripts
   * @private
   * @param {HTMLElement} oldContainer - Current content container
   * @param {HTMLElement} newContainer - New content container
   */
  mergeContent(oldContainer, newContainer) {
    // Preserve scripts and socket.io
    const preserveScripts = Array.from(
      document.getElementsByTagName("script")
    ).filter(
      (script) =>
        script.src.includes("socket.io") || script.src.includes("react-express")
    );

    // Replace entire body content
    oldContainer.innerHTML = newContainer.innerHTML;

    // Restore critical scripts
    preserveScripts.forEach((script) => {
      oldContainer.appendChild(script.cloneNode(true));
    });
  }

  /**
   * Restore state values
   * @private
   * @param {Map} stateValues - Captured state values
   */
  restoreStateValues(stateValues) {
    stateValues.forEach((value, key) => {
      const el = document.querySelector(`[data-react-state="${key}"]`);
      if (el) el.textContent = value;
    });
  }

  /**
   * Restore form states
   * @private
   * @param {Map} formStates - Captured form states
   */
  restoreFormStates(formStates) {
    formStates.forEach((state, input) => {
      const selector = `${input.tagName.toLowerCase()}[name="${input.name}"]`;
      const matchingInput = document.querySelector(selector);

      if (matchingInput) {
        matchingInput.value = state.value;
        matchingInput.checked = state.checked;

        if (state.type === "text" || state.type === "textarea") {
          matchingInput.setSelectionRange(
            state.selectionStart,
            state.selectionEnd
          );
        }
      }
    });
  }

  /**
   * Process and re-execute scripts
   * @private
   */
  processScripts() {
    const scripts = Array.from(
      document.getElementsByTagName("script")
    ).filter((script) => !script.hasAttribute("data-processed"));

    for (const script of scripts) {
      try {
        const newScript = document.createElement("script");
        Array.from(script.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });

        if (!script.src) {
          newScript.textContent = script.textContent;
          script.parentNode.replaceChild(newScript, script);
        } else {
          // For external scripts, just replace
          script.parentNode.replaceChild(newScript, script);
        }

        script.setAttribute("data-processed", "true");
      } catch (scriptError) {
        console.error("Error processing script:", scriptError);
      }
    }
  }

  /**
   * Handle update errors
   * @private
   * @param {Error} error - Update error
   */
  handleUpdateError(error) {
    console.error("HMR update failed:", error);

    // Force reload for critical errors
    if (error.message.includes("SyntaxError")) {
      location.reload();
    } else {
      this.dispatchUpdateEvent(false, error);
    }
  }

  /**
   * Dispatch HMR update event
   * @private
   * @param {boolean} success - Update success status
   * @param {Error} [error] - Optional error
   */
  dispatchUpdateEvent(success, error = null) {
    const event = new CustomEvent("hmr:updated", {
      detail: {
        success,
        path: window.location.pathname,
        ...(error ? { error } : {}),
      },
    });
    window.dispatchEvent(event);
  }

  /**
   * Add a custom update listener
   * @param {Function} listener - Update listener function
   * @returns {Function} Unsubscribe function
   */
  addUpdateListener(listener) {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }
}

// Create a singleton instance
const hmr = new HotModuleReplacement();

export const initHMR = (socket) => {
  hmr.init(socket);
};

ReactExpress.initHMR = initHMR;
ReactExpress.hmr = hmr;
