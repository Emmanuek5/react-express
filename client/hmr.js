export const initHMR = (socket) => {
  socket.on("hmr:update", async (data) => {
    try {
      const currentPath = window.location.pathname;
      const response = await fetch(
        `/__react-express/placeholder${currentPath}`,
        {
          headers: {
            "X-HMR-Request": "true",
          },
        }
      );
      const html = await response.text();

      const temp = document.createElement("div");
      temp.innerHTML = html;

      // Store current state and event handlers
      const stateElements = document.querySelectorAll("[data-react-state]");
      const stateValues = new Map();
      stateElements.forEach((el) => {
        stateValues.set(el.getAttribute("data-react-state"), el.textContent);
      });

      // Store scroll position
      const scrollPos = { x: window.scrollX, y: window.scrollY };

      // Get the current content and new content
      const currentContent =
        document.querySelector(".content") || document.body;
      const newContent = temp.querySelector(".content") || temp;

      // Preserve form states and interactive elements
      const preserveElements = (oldEl, newElement) => {
        // Preserve form values
        const forms = oldEl.querySelectorAll("input, select, textarea");
        forms.forEach((form) => {
          const newForm = newElement.querySelector(`[name="${form.name}"]`);
          if (newForm) {
            newForm.value = form.value;
            if (document.activeElement === form) {
              setTimeout(() => newForm.focus(), 0);
            }
          }
        });

        // Preserve event listeners and component state
        const elements = oldEl.querySelectorAll("[id], [data-component]");
        elements.forEach((el) => {
          const matchingElement =
            newElement.querySelector(`#${el.id}`) ||
            newElement.querySelector(
              `[data-component="${el.getAttribute("data-component")}"]`
            );
          if (matchingElement) {
            const oldClone = el.cloneNode(true);
            const newClone = matchingElement.cloneNode(true);
            if (oldClone.outerHTML !== newClone.outerHTML) {
              // Copy over event listeners and state
              Array.from(el.attributes).forEach((attr) => {
                if (
                  attr.name.startsWith("on") ||
                  attr.name === "value" ||
                  attr.name.startsWith("data-")
                ) {
                  matchingElement.setAttribute(attr.name, attr.value);
                }
              });
            }
          }
        });
      };

      // Update content while preserving state
      preserveElements(currentContent, newContent);

      // Only update changed parts to minimize DOM operations
      if (currentContent.innerHTML !== newContent.innerHTML) {
        const oldContent = currentContent.innerHTML;
        currentContent.innerHTML = newContent.innerHTML;

        // If update fails, rollback
        if (!currentContent.querySelector("[data-react-state]")) {
          currentContent.innerHTML = oldContent;
          throw new Error("Update broke state management");
        }
      }

      // Restore state values
      stateValues.forEach((value, key) => {
        const el = document.querySelector(`[data-react-state="${key}"]`);
        if (el) el.textContent = value;
      });

      // Restore scroll position
      window.scrollTo(scrollPos.x, scrollPos.y);

      // Re-run scripts
      const scripts = Array.from(
        currentContent.getElementsByTagName("script")
      ).filter((script) => !script.hasAttribute("data-processed"));

      for (const script of scripts) {
        try {
          if (!script.src) {
            eval(script.textContent);
          } else {
            const newScript = document.createElement("script");
            Array.from(script.attributes).forEach((attr) => {
              newScript.setAttribute(attr.name, attr.value);
            });
            script.parentNode.replaceChild(newScript, script);
          }
          script.setAttribute("data-processed", "true");
        } catch (scriptError) {
          console.error("Error executing script:", scriptError);
        }
      }

      // Dispatch successful update event
      window.dispatchEvent(
        new CustomEvent("hmr:updated", {
          detail: { success: true },
        })
      );
    } catch (error) {
      console.error("HMR update failed:", error);

      // Only reload for critical errors
      if (
        error.message.includes("SyntaxError") ||
        error.message.includes("broke state management")
      ) {
        console.warn("Critical error detected, forcing page reload");
      } else {
        // For non-critical errors, dispatch error event
        window.dispatchEvent(
          new CustomEvent("hmr:updated", {
            detail: { success: false, error },
          })
        );
      }
    }
  });
};
