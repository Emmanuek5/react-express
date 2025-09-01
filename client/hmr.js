class HotModuleReplacement {
  constructor() {
    this.socket = null;
    this.updateListeners = new Set();
    this._debounceTimer = null;
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
      console.error("Socket not initialized for HMR");
      return;
    }

    // Coalesce rapid updates into a single patch
    this.socket.on("hmr:update", (data) => {
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(async () => {
        try {
          console.log("Received HMR update:", data);
          await this.processUpdate();
        } catch (error) {
          this.handleUpdateError(error);
        }
      }, 100);
    });
  }

  /**
   * Process HMR update
   * @private
   */
  async processUpdate() {
    const response = await fetch(
      `/__react-express/placeholder${window.location.pathname}`,
      { headers: { "X-HMR-Request": "true" } }
    );
    const html = await response.text();

    // Create temporary container to parse content
    const temp = document.createElement("html");
    temp.innerHTML = html;

    // Preserve current state and UI context
    const stateValues = this.captureStateValues();
    const formStates = this.captureFormStates();
    const focusAndScroll = this.captureFocusAndScroll();

    // Identify root containers
    const currentContainer = this.getRootContainer(document);
    const nextContainer = this.getRootContainer(temp);

    // Merge only the target container
    this.mergeContent(currentContainer, nextContainer);

    // Restore states and UI context
    this.restoreStateValues(stateValues);
    this.restoreFormStates(formStates);
    this.restoreFocusAndScroll(focusAndScroll);

    // Re-execute scripts inside the updated container and hot-swap stylesheets
    this.processScripts(currentContainer);
    this.processStyles();
    
    // Re-initialize ReactExpress systems (state, components)
    try {
      if (window.ReactExpress && typeof window.ReactExpress.initializeState === 'function') {
        window.ReactExpress.initializeState();
      }
    } catch (e) {
      try {
        window.ReactExpress &&
          window.ReactExpress.ErrorOverlay &&
          window.ReactExpress.ErrorOverlay.log(e, { type: 'hmr-init', phase: 'state' });
      } catch {}
    }
    try {
      if (window.ReactExpress && typeof window.ReactExpress.initializeComponents === 'function') {
        window.ReactExpress.initializeComponents(currentContainer);
      }
    } catch (e) {
      try {
        window.ReactExpress &&
          window.ReactExpress.ErrorOverlay &&
          window.ReactExpress.ErrorOverlay.log(e, { type: 'hmr-init', phase: 'components' });
      } catch {}
    }

    // Dispatch successful update event
    this.dispatchUpdateEvent(true);
  }

  /**
   * Locate the root container for patching
   * @param {Document|HTMLElement} root
   */
  getRootContainer(root) {
    const scope = /** @type {Document} */ (root.nodeType === 9 ? root : root.ownerDocument);
    return (
      (root.querySelector && root.querySelector('[data-react-root]')) ||
      (root.querySelector && root.querySelector('main')) ||
      (scope && scope.body) ||
      document.body
    );
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
   * Merge content while preserving critical scripts and handling styles
   * @private
   * @param {HTMLElement} oldContainer - Current content container
   * @param {HTMLElement} newContainer - New content container
   */
  mergeContent(oldContainer, newContainer) {
    // Replace only the target container content
    oldContainer.innerHTML = newContainer ? newContainer.innerHTML : '';
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
  processScripts(container) {
    if (!container) return;
    const scripts = Array.from(container.querySelectorAll("script")).filter(
      (script) =>
        !script.hasAttribute("data-processed") &&
        !(script.src && (script.src.includes("socket.io") || script.src.includes("react-express.bundle.js"))) &&
        !script.hasAttribute("data-hmr-skip")
    );

    for (const script of scripts) {
      try {
        const newScript = document.createElement("script");
        Array.from(script.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });

        if (!script.src) {
          newScript.textContent = script.textContent;
        }

        newScript.setAttribute("data-processed", "true");
        script.parentNode.replaceChild(newScript, script);
      } catch (scriptError) {
        console.error("Error processing script:", scriptError);
        try {
          window.ReactExpress &&
            window.ReactExpress.ErrorOverlay &&
            window.ReactExpress.ErrorOverlay.log(scriptError, { type: 'script' });
        } catch {}
      }
    }
  }

  /**
   * Process and add new styles
   * @private
   */
  processStyles() {
    // Hot-swap stylesheets by cache-busting href
    const timestamp = Date.now();
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    links.forEach((link) => {
      try {
        const url = new URL(link.href, window.location.origin);
        url.searchParams.set('hmr', String(timestamp));
        const newLink = link.cloneNode(true);
        newLink.href = url.toString();
        link.parentNode.replaceChild(newLink, link);
      } catch (e) {
        // Fallback: force reload if URL parsing fails
        link.href = link.href + (link.href.includes('?') ? '&' : '?') + 'hmr=' + timestamp;
      }
    });
  }

  /**
   * Handle update errors
   * @private
   * @param {Error} error - Update error
   */
  handleUpdateError(error) {
    console.error("HMR update failed:", error);
    // Never force reload; log to overlay and keep app running
    try {
      window.ReactExpress &&
        window.ReactExpress.ErrorOverlay &&
        window.ReactExpress.ErrorOverlay.log(error, { type: 'hmr' });
    } catch {}
    this.dispatchUpdateEvent(false, error);
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
    // Notify custom listeners
    this.updateListeners.forEach((listener) => {
      try { listener({ success, path: window.location.pathname, error }); } catch {}
    });
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

  /**
   * Capture focus element and window scroll
   */
  captureFocusAndScroll() {
    const active = document.activeElement;
    let selector = null;
    if (active && active !== document.body) {
      if (active.id) selector = `#${CSS.escape(active.id)}`;
      else if (active.name) selector = `${active.tagName.toLowerCase()}[name="${CSS.escape(active.name)}"]`;
    }
    return {
      selector,
      selectionStart: /** @type {any} */(active).selectionStart ?? null,
      selectionEnd: /** @type {any} */(active).selectionEnd ?? null,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };
  }

  /**
   * Restore focus element and window scroll
   */
  restoreFocusAndScroll(ctx) {
    try {
      if (ctx.selector) {
        const el = document.querySelector(ctx.selector);
        if (el && typeof el.focus === 'function') {
          el.focus();
          if (ctx.selectionStart != null && ctx.selectionEnd != null && typeof el.setSelectionRange === 'function') {
            el.setSelectionRange(ctx.selectionStart, ctx.selectionEnd);
          }
        }
      }
    } catch {}
    window.scrollTo({ left: ctx.scrollX || 0, top: ctx.scrollY || 0, behavior: 'auto' });
  }
}

// Create a singleton instance
const hmr = new HotModuleReplacement();

export const initHMR = (socket) => {
  hmr.init(socket);
};

// Ensure global namespace exists and expose API on window.ReactExpress
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.initHMR = initHMR;
window.ReactExpress.hmr = hmr;
