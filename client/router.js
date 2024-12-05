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
      const response = await fetch(url, {
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

      // Rest of the existing fetchPage method...
    } catch (error) {
      await this.handleError("fetchError", error, { url });
      throw error;
    }
  }

  async loadResource(resource, isPageStyle = false) {
    // Modify loadResource to add data attributes for style tracking
    return new Promise((resolve, reject) => {
      try {
        // Remove existing element with same ID if it exists
        if (resource.id) {
          const existing = document.getElementById(resource.id);
          if (existing) {
            existing.remove();
          }
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
          this.loadedResources.add(resource.content);
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
          this.loadedResources.add(
            resource.src || resource.href || resource.content
          );
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

      const currentContent = document.querySelector("[data-content]");
      if (this.options.animations && currentContent) {
        currentContent.classList.add("transitioning");
        await new Promise((resolve) => setTimeout(resolve, 300)); // Wait for transition
      }

      const pageData = await this.fetchPage(url);

      // Update the page title
      document.title = pageData.title;

      // Clean up old page-specific styles
      const oldStyles = document.querySelectorAll(
        "style[data-page-style], link[data-page-style]"
      );
      oldStyles.forEach((style) => style.remove());
      // Comprehensive style cleanup
      const removePageSpecificStyles = () => {
        // Remove all page-specific styles and previously loaded dynamic styles
        const stylesToRemove = [
          "style[data-page-style]", // Inline styles from previous page
          "link[data-page-style]", // Stylesheet links from previous page
          "style[data-dynamic-style]", // Any dynamically added styles
          "link[data-dynamic-style]", // Any dynamically added stylesheet links
        ];

        document
          .querySelectorAll(stylesToRemove.join(", "))
          .forEach((style) => {
            style.remove();
          });

        // Optional: Clear loaded resources tracking for styles
        this.loadedResources = new Set(
          Array.from(this.loadedResources).filter(
            (resource) =>
              !resource.includes("data-page-style") &&
              !resource.includes("data-dynamic-style")
          )
        );
      };

      // Call style cleanup before loading new resources
      removePageSpecificStyles();

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

      // Replace the content
      if (currentContent) {
        currentContent.innerHTML = pageData.content;

        // Execute inline scripts in order
        for (const scriptContent of pageData.inlineScripts) {
          const script = document.createElement("script");
          script.textContent = scriptContent;
          currentContent.appendChild(script);
        }

        if (this.options.animations) {
          currentContent.classList.remove("transitioning");
        }
      } else {
        console.error("No [data-content] element found");
        // window.location.href = url; // Fallback to regular navigation
        return;
      }

      // Update browser history
      if (addToHistory) {
        window.history.pushState({ url }, pageData.title, url);
      }

      // Re-initialize components
      if (window.ReactExpress) {
        window.ReactExpress.initializeState();
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

            // Update content
            currentContent.innerHTML = notFoundPageData.content;

            // Execute inline scripts
            for (const scriptContent of notFoundPageData.inlineScripts) {
              const script = document.createElement("script");
              script.textContent = scriptContent;
              currentContent.appendChild(script);
            }
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
