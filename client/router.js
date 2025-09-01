// Router module for handling dynamic page navigation with enhanced features
class Router {
  constructor(options = {}) {
    this.cache = new Map();
    this.prefetchQueue = new Set();
    this.loadedResources = new Set();
    this.middlewares = [];
    this.hooks = {
      beforeNavigate: [],
      afterNavigate: [],
      onError: [],
    };
    this.options = {
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      prefetchDelay: 100,
      animations: true,
      preserveScroll: true,
      ...options,
    };

    this.init();
    this.initPrefetch();
  }

  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  on(event, callback) {
    if (this.hooks[event]) {
      this.hooks[event].push(callback);
    }
    return this;
  }

  init() {
    // Listen for clicks on links with data-route attribute
    document.addEventListener("click", async (e) => {
      const link = e.target.closest("a[data-route]");
      if (!link) return;

      e.preventDefault();
      await this.navigateTo(link.href);
    });

    // Handle browser back/forward buttons
    window.addEventListener("popstate", async (e) => {
      if (e.state && e.state.url) {
        // capture the scroll position stored in history state
        this.pendingScrollY =
          typeof e.state.scrollY === "number" ? e.state.scrollY : 0;
        await this.navigateTo(e.state.url, false);
      }
    });

    // Add transition styles
    if (this.options.animations) {
      const style = document.createElement("style");
      style.textContent = `
        [data-content] { transition: opacity 0.3s ease-in-out; }
        [data-content].transitioning { opacity: 0; }
      `;
      document.head.appendChild(style);
    }
  }

  initPrefetch() {
    // Find all links with prefetch attribute
    const prefetchLinks = document.querySelectorAll("a[prefetch]");
    prefetchLinks.forEach((link) => {
      const mode = link.getAttribute("prefetch");
      if (mode && mode.toLowerCase() === "visible") {
        // Only prefetch when visible via IntersectionObserver below
        return;
      }
      // Eager prefetch by default when attribute is present
      this.prefetchQueue.add(link.href);
    });

    // Start prefetching after a short delay
    setTimeout(() => this.startPrefetching(), this.options.prefetchDelay);

    // Set up Intersection Observer for dynamic prefetching
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const link = entry.target;
            if (link.hasAttribute("prefetch") && !this.cache.has(link.href)) {
              this.prefetchQueue.add(link.href);
              this.startPrefetching();
            }
          }
        });
      },
      { rootMargin: "50px" }
    );

    // Observe all prefetch links
    prefetchLinks.forEach((link) => observer.observe(link));
  }

  async startPrefetching() {
    if (this.isPrefetching) return;
    this.isPrefetching = true;

    const prefetchNextUrl = async () => {
      if (this.prefetchQueue.size === 0) {
        this.isPrefetching = false;
        return;
      }

      const url = this.prefetchQueue.values().next().value;
      this.prefetchQueue.delete(url);

      try {
        await this.fetchPage(url);
      } catch (error) {
        console.warn(`Failed to prefetch ${url}:`, error);
      }

      // Continue with next URL after a small delay
      setTimeout(prefetchNextUrl, this.options.prefetchDelay);
    };

    prefetchNextUrl();
  }

  async fetchPage(url) {
    try {
      // Normalize URL for consistent cache keys
      const absoluteUrl = new URL(url, window.location.href).href;

      // Serve from cache if fresh
      const cached = this.cache.get(absoluteUrl);
      if (
        cached &&
        Date.now() - cached.ts < (this.options.cacheTimeout || 0)
      ) {
        return cached.data;
      }

      const response = await fetch(absoluteUrl, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Cache-Control": "no-cache",
        },
      });

      // Explicitly handle 404 and other error status codes
      if (response.status === 404) {
        // Trigger 404 specific handling
        const error = new Error("Page Not Found");
        error.status = 404;
        throw error;
      }

      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        throw error;
      }

      const html = await response.text();

      // Parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Extract title
      const title = (doc.querySelector("title")?.textContent || "").trim() ||
        document.title;

      // For full page replacement, use the entire body
      const fetchedContentEl = doc.body || doc.documentElement;

      // Build content HTML without inline scripts/styles (they are handled separately)
      const contentClone = fetchedContentEl.cloneNode(true);
      contentClone.querySelectorAll("script, style").forEach((el) => el.remove());
      const content = contentClone.innerHTML;

      // Collect styles from head
      const headStyles = [];
      doc
        .querySelectorAll('head link[rel="stylesheet"]')
        .forEach((link) => {
          headStyles.push({
            type: "style",
            href: link.href,
            id: link.id || undefined,
          });
        });
      doc.querySelectorAll("head style").forEach((style) => {
        headStyles.push({
          type: "inline-style",
          content: style.textContent || "",
          id: style.id || undefined,
        });
      });

      // Collect styles from within content
      const contentStyles = [];
      fetchedContentEl.querySelectorAll("style").forEach((style) => {
        contentStyles.push({
          type: "inline-style",
          content: style.textContent || "",
          id: style.id || undefined,
        });
      });

      // Collect external scripts (head + body)
      const externalScripts = [];
      doc.querySelectorAll("script[src]").forEach((s) => {
        externalScripts.push({
          type: "script",
          src: s.src,
          async: !!s.async,
          defer: !!s.defer,
          id: s.id || undefined,
          scriptType: s.type || undefined,
        });
      });

      // Collect inline scripts from entire document (execute later in order)
      const inlineScripts = [];
      doc
        .querySelectorAll("script:not([src])")
        .forEach((script) => {
          inlineScripts.push(script.textContent || "");
        });

      const pageData = {
        title,
        content,
        headStyles,
        contentStyles,
        externalScripts,
        inlineScripts,
      };

      // Cache the result
      this.cache.set(absoluteUrl, { data: pageData, ts: Date.now() });
      return pageData;
    } catch (error) {
      await this.handleError("fetchError", error, { url });
      throw error;
    }
  }

  async loadResource(resource, isPageStyle = false) {
    // Modify loadResource to add data attributes for style tracking & dedupe
    return new Promise((resolve, reject) => {
      try {
        // Remove existing element with same ID if it exists
        if (resource.id) {
          const existing = document.getElementById(resource.id);
          if (existing) {
            existing.remove();
          }
        }

        // Build a resource key for deduplication (skip for page-specific styles)
        let resourceKey = null;
        if (resource.type === "script" && resource.src) {
          resourceKey = `script:${resource.src}`;
        } else if (resource.type === "style" && resource.href) {
          resourceKey = `style:${resource.href}`;
        } else if (resource.type === "inline-style" && resource.content) {
          resourceKey = `inline-style:${resource.content}`;
        }

        if (!isPageStyle && resourceKey && this.loadedResources.has(resourceKey)) {
          // Already loaded
          resolve();
          return;
        }

        if (resource.type === "inline-style") {
          const style = document.createElement("style");
          if (resource.id) style.id = resource.id;
          style.textContent = resource.content;

          // Add page-specific or dynamic style attribute
          style.setAttribute(
            isPageStyle ? "data-page-style" : "data-dynamic-style",
            ""
          );

          document.head.appendChild(style);
          if (!isPageStyle && resourceKey) this.loadedResources.add(resourceKey);
          resolve();
          return;
        }

        let element;

        const timeout = setTimeout(() => {
          reject(
            new Error(
              `Resource loading timeout: ${
                resource.src || resource.href || resource.content
              }`
            )
          );
        }, 10000);

        if (resource.type === "script") {
          element = document.createElement("script");
          if (resource.id) element.id = resource.id;
          element.src = resource.src;
          element.async = resource.async;
          element.defer = resource.defer;
          if (resource.scriptType) element.type = resource.scriptType;
        } else if (resource.type === "style") {
          element = document.createElement("link");
          if (resource.id) element.id = resource.id;
          element.rel = "stylesheet";
          element.href = resource.href;

          // Add page-specific or dynamic style attribute
          element.setAttribute(
            isPageStyle ? "data-page-style" : "data-dynamic-style",
            ""
          );
        }

        element.onload = () => {
          clearTimeout(timeout);
          if (!isPageStyle && resourceKey) this.loadedResources.add(resourceKey);
          resolve();
        };
        element.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };

        document.head.appendChild(element);
      } catch (error) {
        reject(error);
      }
    });
  }

  async navigateTo(url, addToHistory = true) {
    try {
      // Run before navigate hooks
      for (const hook of this.hooks.beforeNavigate) {
        await hook(url);
      }

      // Run middlewares
      for (const middleware of this.middlewares) {
        const result = await middleware(url);
        if (result === false) return; // Middleware cancelled navigation
      }

      // Save current entry scroll position before navigating away
      if (this.options.preserveScroll) {
        try {
          const currentState = history.state || {};
          history.replaceState(
            { ...currentState, url: window.location.href, scrollY: window.scrollY },
            document.title,
            window.location.href
          );
        } catch {}
      }

      const currentContent = document.querySelector("[data-content]");
      if (this.options.animations && currentContent) {
        currentContent.classList.add("transitioning");
        await new Promise((resolve) => setTimeout(resolve, 300)); // Wait for transition
      }

      const pageData = await this.fetchPage(url);

      // Update the page title
      document.title = pageData.title;

      // Clean up old page-specific styles (do not touch persistent resources)
      document
        .querySelectorAll(
          "style[data-page-style], link[data-page-style], style[data-dynamic-style], link[data-dynamic-style]"
        )
        .forEach((el) => el.remove());

      // Load all resources first
      const resourcePromises = [
        ...pageData.headStyles.map((style) => {
          // Add data-page-style attribute to identify page-specific styles
          const styledResource = { ...style, type: style.type };
          return this.loadResource(styledResource, true);
        }),
        ...pageData.contentStyles.map((style) => {
          const styledResource = { ...style, type: style.type };
          return this.loadResource(styledResource, true);
        }),
        ...pageData.externalScripts.map((script) => this.loadResource(script)),
      ];

      await Promise.all(resourcePromises);

      // Replace the entire page content
      this.replaceEntirePageContent(pageData);

      if (this.options.animations) {
        const newContent = document.querySelector("[data-content]");
        if (newContent) {
          newContent.classList.remove("transitioning");
        }
      }

      // Scroll handling
      if (this.options.preserveScroll) {
        if (typeof this.pendingScrollY === "number") {
          window.scrollTo(0, this.pendingScrollY);
          this.pendingScrollY = undefined;
        } else {
          window.scrollTo(0, 0);
        }
      }

      // Update browser history
      if (addToHistory) {
        const state = { url, scrollY: this.options.preserveScroll ? 0 : undefined };
        window.history.pushState(state, pageData.title, url);
      }

      // Re-initialize state and components for new content
      try {
        if (window.ReactExpress && typeof window.ReactExpress.initializeState === 'function') {
          window.ReactExpress.initializeState();
        }
      } catch (e) {
        try {
          window.ReactExpress &&
            window.ReactExpress.ErrorOverlay &&
            window.ReactExpress.ErrorOverlay.log(e, { type: 'router-init', phase: 'state' });
        } catch {}
      }
      try {
        if (window.ReactExpress && typeof window.ReactExpress.initializeComponents === 'function') {
          window.ReactExpress.initializeComponents(document.body);
        }
      } catch (e) {
        try {
          window.ReactExpress &&
            window.ReactExpress.ErrorOverlay &&
            window.ReactExpress.ErrorOverlay.log(e, { type: 'router-init', phase: 'components' });
        } catch {}
      }

      // Re-initialize prefetching for new content
      this.initPrefetch();

      // Dispatch a custom event
      window.dispatchEvent(
        new CustomEvent("routeChanged", {
          detail: { url, title: pageData.title },
        })
      );

      // Run after navigate hooks
      for (const hook of this.hooks.afterNavigate) {
        await hook(url, pageData);
      }
    } catch (error) {
      // Enhanced error handling
      if (error.status === 404) {
        // Try to load a custom 404 page
        try {
          const notFoundPageData = await this.fetchPage("/404.html");

          // Update page content with 404 page
          const currentContent = document.querySelector("[data-content]");
          if (currentContent) {
            document.title = notFoundPageData.title || "Page Not Found";

            // Clean up existing styles
            const oldStyles = document.querySelectorAll(
              "style[data-page-style], link[data-page-style]"
            );
            oldStyles.forEach((style) => style.remove());

            // Load 404 page resources
            const resourcePromises = [
              ...notFoundPageData.headStyles.map((style) =>
                this.loadResource(style, true)
              ),
              ...notFoundPageData.contentStyles.map((style) =>
                this.loadResource(style, true)
              ),
              ...notFoundPageData.externalScripts.map((script) =>
                this.loadResource(script)
              ),
            ];
            await Promise.all(resourcePromises);

            // Replace entire page content with 404 page
            this.replaceEntirePageContent(notFoundPageData);
          }

          // Update browser history to show original URL
          window.history.replaceState({ url }, document.title, url);
        } catch (fallbackError) {
          // Fallback if custom 404 page fails
          console.error("Failed to load custom 404 page:", fallbackError);

          // Basic 404 content as last resort
          const currentContent = document.querySelector("[data-content]");
          if (currentContent) {
            document.title = "Page Not Found";
            currentContent.innerHTML = `
              <div class="error-container">
                <h1>404 - Page Not Found</h1>
                <p>The page you are looking for does not exist.</p>
                <a href="/">Return to Home</a>
              </div>
            `;
          }
        }
      } else {
        // Handle other types of errors
        await this.handleError("navigationError", error, { url });
        window.location.href = url;
      }
    }
  }

  /**
   * Replace entire page content with new page data
   * @private
   * @param {Object} pageData - New page data
   */
  replaceEntirePageContent(pageData) {
    // Update document title
    document.title = pageData.title;

    // Preserve critical scripts before replacing body content
    const criticalScripts = Array.from(document.querySelectorAll('script[src*="react-express.bundle.js"], script[src*="socket.io"]'));
    
    // Replace entire body content
    document.body.innerHTML = pageData.content;

    // Re-add critical scripts to maintain ReactExpress functionality
    criticalScripts.forEach(script => {
      const newScript = document.createElement('script');
      if (script.src) newScript.src = script.src;
      if (script.textContent) newScript.textContent = script.textContent;
      Array.from(script.attributes).forEach(attr => {
        if (attr.name !== 'src') {
          newScript.setAttribute(attr.name, attr.value);
        }
      });
      document.body.appendChild(newScript);
    });

    // Execute inline scripts after ensuring ReactExpress is available
    const executeScripts = () => {
      if (!window.ReactExpress || !window.ReactExpress.createElement) {
        setTimeout(executeScripts, 50);
        return;
      }
      
      for (const scriptContent of pageData.inlineScripts) {
        try {
          const script = document.createElement("script");
          script.textContent = scriptContent;
          document.body.appendChild(script);
        } catch (error) {
          console.error('Error executing inline script:', error);
          try {
            window.ReactExpress &&
              window.ReactExpress.ErrorOverlay &&
              window.ReactExpress.ErrorOverlay.log(error, { type: 'script-execution' });
          } catch {}
        }
      }
    };
    
    executeScripts();
  }

  async handleError(type, error, context) {
    console.error(`${type}:`, error);
    for (const hook of this.hooks.onError) {
      try {
        await hook(type, error, context);
      } catch (hookError) {
        console.error("Error in error hook:", hookError);
      }
    }
  }
}

// Initialize the router with default options
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.router = new Router({
  animations: true,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  prefetchDelay: 100,
});
