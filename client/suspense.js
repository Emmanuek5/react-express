class LoaderManager {
  static #instances = new WeakMap();
  static #styleInjected = false;
  static #cache = new Map();

  constructor(config = {}) {
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 5000,
      defaultCacheDuration: 5 * 60 * 1000, // 5 minutes
      ...config,
    };
  }

  static styles = `
    @keyframes loader-pulse {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .react-express-loader {
      background: linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loader-pulse 1.5s infinite;
      padding: 20px;
      text-align: center;
      color: #888;
    }
  `;

  static defaultPlaceholder = `
    <div class="react-express-loader">Loading...</div>
  `;

  static getInstance(container) {
    if (!this.#instances.has(container)) {
      this.#instances.set(container, new LoaderManager());
    }
    return this.#instances.get(container);
  }

  static init() {
    if (!this.#styleInjected) {
      const style = document.createElement("style");
      style.textContent = this.styles;
      document.head.appendChild(style);
      this.#styleInjected = true;
    }

    this.setupMutationObserver();
    this.processContainers();
  }

  static setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.hasAttribute("data-suspense")) {
              this.getInstance(node).processContainer(node);
            }
            const children = node.querySelectorAll("[data-suspense]");
            children.forEach((child) =>
              this.getInstance(child).processContainer(child)
            );
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  static processContainers() {
    document.querySelectorAll("[data-suspense]").forEach((container) => {
      this.getInstance(container).processContainer(container);
    });
  }

  async processContainer(container) {
    if (container.hasAttribute("data-processed")) return;

    const apiEndpoint = container.getAttribute("data-api");
    if (!apiEndpoint) return;

    container.setAttribute("data-processed", "true");
    await this.loadContent(container);
  }

  async loadContent(container) {
    const apiEndpoint = container.getAttribute("data-api");
    const cacheKey = container.getAttribute("data-cache-key") || apiEndpoint;
    const cacheDuration =
      parseInt(container.getAttribute("data-cache-duration")) ||
      this.config.defaultCacheDuration;

    try {
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        await this.renderContent(container, cachedData);
        return;
      }

      container._originalContent = container.innerHTML;
      container.innerHTML = this.getPlaceholder(container);

      const data = await this.fetchWithRetry(apiEndpoint);
      this.setCachedData(cacheKey, data, cacheDuration);
      await this.renderContent(container, data);
    } catch (error) {
      this.handleError(container, error);
    }
  }

  getCachedData(key) {
    const cacheItem = LoaderManager.#cache.get(key);
    if (!cacheItem) return null;

    const { data, expiry } = cacheItem;
    if (Date.now() > expiry) {
      LoaderManager.#cache.delete(key);
      return null;
    }

    return data;
  }

  setCachedData(key, data, duration) {
    LoaderManager.#cache.set(key, {
      data,
      expiry: Date.now() + duration,
    });
  }

  async fetchWithRetry(url, attempt = 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout
      );

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }

      if (attempt < this.config.retryAttempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.retryDelay)
        );
        return this.fetchWithRetry(url, attempt + 1);
      }

      throw error;
    }
  }

  getPlaceholder(container) {
    // Check for inline placeholder element
    const inlinePlaceholder = container.querySelector(
      "[data-suspense-placeholder]"
    );
    if (inlinePlaceholder) {
      const content = inlinePlaceholder.innerHTML;
      inlinePlaceholder.remove();
      return content;
    }

    // Fall back to attribute-based placeholder
    const placeholderAttr = container.getAttribute("data-suspense-placeholder");
    if (placeholderAttr) {
      if (placeholderAttr.startsWith("#")) {
        const template = document.querySelector(placeholderAttr);
        return template ? template.innerHTML : LoaderManager.defaultPlaceholder;
      }
      return placeholderAttr;
    }

    return LoaderManager.defaultPlaceholder;
  }

  async renderContent(container, data) {
    container.innerHTML = container._originalContent;

    const bindPromises = Array.from(
      container.querySelectorAll("[data-bind]")
    ).map(async (element) => {
      const bindPath = element.getAttribute("data-bind");
      const value = this.getNestedValue(data, bindPath);

      if (value !== undefined) {
        if (element.tagName === "IMG") {
          await this.loadImage(element, value);
        } else if (["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)) {
          element.value = value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          element.textContent = value;
        }
      }
    });

    await Promise.all(bindPromises);
    container.setAttribute("data-loaded", "true");
    container.dispatchEvent(
      new CustomEvent("content-loaded", { detail: data })
    );
  }

  async loadImage(imgElement, src) {
    return new Promise((resolve, reject) => {
      imgElement.onload = resolve;
      imgElement.onerror = reject;
      imgElement.src = src;
    });
  }

  handleError(container, error) {
    const errorTemplate = document.querySelector("#error-template");
    const errorHTML = errorTemplate
      ? errorTemplate.innerHTML
      : `
      <div class="suspense-error" style="color: red; padding: 10px; background: #ffeeee; border: 1px solid red;">
        <strong>Error Loading Content</strong>
        <p>${error.message}</p>
        <button class="retry-button">Retry</button>
      </div>
    `;

    container.innerHTML = errorHTML;
    container.setAttribute("data-error", "true");

    container.querySelector(".retry-button")?.addEventListener("click", () => {
      this.loadContent(container);
    });

    container.dispatchEvent(
      new CustomEvent("content-error", { detail: error })
    );
    console.error("Loader Manager error:", error);
  }

  getNestedValue(obj, path) {
    return path
      .split(".")
      .reduce(
        (acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined),
        obj
      );
  }

  // Static method to clear cache
  static clearCache(key) {
    if (key) {
      this.#cache.delete(key);
    } else {
      this.#cache.clear();
    }
  }
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => LoaderManager.init());

// Export for module environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = LoaderManager;
} else {
  window.ReactExpress = window.ReactExpress || {};
  window.ReactExpress.LoaderManager = LoaderManager;
}
