// Router module for handling dynamic page navigation
class Router {
  constructor() {
    this.cache = new Map();
    this.prefetchQueue = new Set();
    this.loadedResources = new Set();
    this.init();
    this.initPrefetch();
  }

  init() {
    // Listen for clicks on links with data-route attribute
    document.addEventListener("click", async (e) => {
      const link = e.target.closest("a[data-route]");
      if (!link) return;

      e.preventDefault(); // Prevent default navigation
      await this.navigateTo(link.href);
    });

    // Handle browser back/forward buttons
    window.addEventListener("popstate", async (e) => {
      if (e.state && e.state.url) {
        await this.navigateTo(e.state.url, false);
      }
    });
  }

  initPrefetch() {
    // Find all links with prefetch attribute
    const prefetchLinks = document.querySelectorAll("a[prefetch]");
    prefetchLinks.forEach((link) => {
      this.prefetchQueue.add(link.href);
    });

    // Start prefetching after a short delay
    setTimeout(() => this.startPrefetching(), 100);

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
      setTimeout(prefetchNextUrl, 100);
    };

    prefetchNextUrl();
  }

  async fetchPage(url) {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    try {
      const response = await fetch(url, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Extract head styles and resources
      const headStyles = Array.from(
        doc.head.querySelectorAll("style, link[rel='stylesheet']")
      ).map((element) => {
        if (element.tagName.toLowerCase() === "style") {
          return {
            type: "inline-style",
            content: element.textContent,
            id: element.id || null,
          };
        } else {
          return {
            type: "style",
            href: element.href,
            id: element.id || null,
          };
        }
      });

      // Extract the content and resources
      const content = doc.querySelector("[data-content]");
      const inlineScripts = Array.from(content.getElementsByTagName("script"));
      const contentStyles = Array.from(content.querySelectorAll("style")).map(
        (style) => ({
          type: "inline-style",
          content: style.textContent,
          id: style.id || null,
        })
      );

      // Get all external resources
      const externalScripts = Array.from(doc.getElementsByTagName("script"))
        .filter((script) => script.src)
        .map((script) => ({
          type: "script",
          src: script.src,
          async: script.async,
          defer: script.defer,
          id: script.id || null,
        }));

      // Remove inline scripts from content (we'll execute them separately)
      inlineScripts.forEach((script) => script.remove());

      const pageData = {
        title: doc.title,
        content: content.innerHTML,
        inlineScripts: inlineScripts.map((script) => script.textContent),
        externalScripts,
        headStyles,
        contentStyles,
        timestamp: Date.now(),
      };

      // Cache the page data
      this.cache.set(url, pageData);

      // Clean old cache entries after 5 minutes
      setTimeout(() => {
        this.cache.delete(url);
      }, 5 * 60 * 1000);

      return pageData;
    } catch (error) {
      console.error("Failed to fetch page:", error);
      throw error;
    }
  }

  async loadResource(resource) {
    const resourceKey = resource.src || resource.href || resource.content;
    if (this.loadedResources.has(resourceKey)) {
      return;
    }

    return new Promise((resolve, reject) => {
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
        document.head.appendChild(style);
        this.loadedResources.add(resourceKey);
        resolve();
        return;
      }

      let element;

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
      }

      element.onload = () => {
        this.loadedResources.add(resourceKey);
        resolve();
      };
      element.onerror = reject;

      document.head.appendChild(element);
    });
  }

  async navigateTo(url, addToHistory = true) {
    try {
      const pageData = await this.fetchPage(url);

      // Update the page title
      document.title = pageData.title;

      // Load all resources first
      const resourcePromises = [
        ...pageData.headStyles.map((style) => this.loadResource(style)),
        ...pageData.contentStyles.map((style) => this.loadResource(style)),
        ...pageData.externalScripts.map((script) => this.loadResource(script)),
      ];

      await Promise.all(resourcePromises);

      // Replace the content
      const currentContent = document.querySelector("[data-content]");
      if (currentContent) {
        currentContent.innerHTML = pageData.content;

        // Execute inline scripts in order
        for (const scriptContent of pageData.inlineScripts) {
          const script = document.createElement("script");
          script.textContent = scriptContent;
          currentContent.appendChild(script);
        }
      } else {
        console.error("No [data-content] element found");
        window.location.href = url; // Fallback to regular navigation
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
    } catch (error) {
      console.error("Navigation failed:", error);
      // Fallback to regular navigation on error
      window.location.href = url;
    }
  }
}

// Initialize the router
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.router = new Router();
