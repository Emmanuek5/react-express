export const LoaderManager = {
  defaultPlaceholder: `
    <div class="react-express-loader" style="
      background: linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loader-pulse 1.5s ease-in-out infinite;
      min-height: 100px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div class="loader-content" style="opacity: 0.5;">Loading...</div>
    </div>
  `,

  styles: `
    @keyframes loader-pulse {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .react-express-loader {
      transition: opacity 0.3s ease-in-out;
    }
  `,

  init() {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = this.styles;
    document.head.appendChild(styleSheet);
    this.setupSuspenseContainers();
    this.initializeIntersectionObserver();
  },

  async loadPlaceholder(container) {
    const placeholderPath = container.getAttribute("data-placeholder-file");
    if (!placeholderPath) return null;

    try {
      // Remove leading slash if present
      const normalizedPath = placeholderPath.replace(/^\//, "");
      const response = await fetch(
        `/__react-express/placeholder/${normalizedPath}`
      );
      if (!response.ok) return null;
      return await response.text();
    } catch (error) {
      console.error("Error loading placeholder:", error);
      return null;
    }
  },

  async setupSuspenseContainers() {
    const containers = document.querySelectorAll("[data-suspense]");
    for (const container of containers) {
      if (!container.hasAttribute("data-setup")) {
        let placeholder = container.getAttribute("data-placeholder");

        // If no inline placeholder but has a placeholder file, load it
        if (!placeholder && container.hasAttribute("data-placeholder-file")) {
          placeholder = await this.loadPlaceholder(container);
        }

        // Fall back to default if no placeholder was found
        placeholder = placeholder || this.defaultPlaceholder;

        container.setAttribute("data-original-content", container.innerHTML);
        container.setAttribute("data-setup", "true");
        container.setAttribute("data-placeholder-content", placeholder);

        if (!container.hasAttribute("data-loaded")) {
          container.innerHTML = placeholder;
        }
      }
    }
  },

  initializeIntersectionObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            !entry.target.hasAttribute("data-loaded")
          ) {
            this.loadContent(entry.target);
          }
        });
      },
      {
        rootMargin: "50px",
      }
    );

    document.querySelectorAll("[data-suspense]").forEach((container) => {
      observer.observe(container);
    });
  },

  handleError(container) {
    // On error, either show nothing or keep the placeholder based on container attributes
    const keepPlaceholder = container.hasAttribute(
      "data-keep-placeholder-on-error"
    );
    if (keepPlaceholder) {
      container.innerHTML =
        container.getAttribute("data-placeholder-content") ||
        this.defaultPlaceholder;
    } else {
      container.innerHTML = "";
    }
    // Mark as error state but don't show visible error
    container.setAttribute("data-error", "true");
  },

  async loadContent(container) {
    const componentPath = container.getAttribute("data-component-file");
    if (!componentPath) return;

    try {
      // Show loading state if placeholder exists
      const placeholder = await this.loadPlaceholder(container) || this.defaultPlaceholder;
      const originalContent = container.innerHTML;
      container.innerHTML = placeholder;

      // Fetch the component content
      const response = await fetch(`/__react-express/component/${componentPath}`);
      if (!response.ok) {
        throw new Error(`Failed to load component: ${response.statusText}`);
      }

      const content = await response.text();
      
      // Create temporary container to parse content
      const temp = document.createElement("div");
      temp.innerHTML = content;

      // Handle scripts before replacing content
      const scripts = Array.from(temp.getElementsByTagName("script"));
      
      // Replace the content
      container.innerHTML = content;

      // Re-execute scripts
      scripts.forEach(script => {
        const newScript = document.createElement("script");
        Array.from(script.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.textContent = script.textContent;
        script.parentNode.replaceChild(newScript, script);
      });

      // Mark as loaded
      container.setAttribute("data-loaded", "true");
      
      // Register for HMR updates
      if (window.ReactExpress && window.ReactExpress.hmr) {
        window.ReactExpress.hmr.registerComponent(container, componentPath);
      }

    } catch (error) {
      this.handleError(container);
      console.error("Error loading component:", error);
    }
  },
};

export const initSuspense = () => {
  LoaderManager.init();

  // Handle dynamic content updates
  document.addEventListener("react-express:content-update", () => {
    LoaderManager.setupSuspenseContainers();
  });
};
