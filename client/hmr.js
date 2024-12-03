export const initHMR = (socket) => {
  socket.on("hmr:update", async (data) => {
    try {
      const currentPath = window.location.pathname;
      const response = await fetch(currentPath, {
        headers: {
          "X-HMR-Request": "true",
        },
      });
      const html = await response.text();

      const temp = document.createElement("div");
      temp.innerHTML = html;

      // Update only non-suspense content immediately
      const currentContent = document.body;
      const newContent = temp.querySelector("body") || temp;

      // Preserve form states and interactive elements
      const preserveElements = (oldEl, newEl) => {
        const forms = oldEl.querySelectorAll("input, select, textarea");
        forms.forEach((form) => {
          const newForm = newEl.querySelector(`[name="${form.name}"]`);
          if (newForm) {
            newForm.value = form.value;
            if (document.activeElement === form) {
              setTimeout(() => newForm.focus(), 0);
            }
          }
        });
      };

      // Store scroll position
      const scrollPos = { x: window.scrollX, y: window.scrollY };

      // Update content while preserving suspense containers
      preserveElements(currentContent, newContent);
      currentContent.innerHTML = newContent.innerHTML;

      // Restore scroll position
      window.scrollTo(scrollPos.x, scrollPos.y);

      // Re-run scripts
      document
        .querySelectorAll("script:not([data-processed])")
        .forEach((script) => {
          if (!script.src) {
            eval(script.textContent);
            script.setAttribute("data-processed", "true");
          }
        });

      window.dispatchEvent(new CustomEvent("hmr:updated"));
    } catch (error) {
      console.error("HMR update failed:", error);
      window.location.reload();
    }
  });
};
