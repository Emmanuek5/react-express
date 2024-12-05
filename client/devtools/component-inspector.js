// Component Inspector for React-Express DevTools
class ComponentInspector {
  constructor() {
    this.selectedElement = null;
    this.highlightOverlay = null;
    this.isInspecting = false;
    this.boundHandleMouseOver = this.handleMouseOver.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);
  }

  initialize() {
    // Create inspector panel
    const panel = document.getElementById('react-express-devtools');
    if (!panel) return;

    const inspectorContainer = document.createElement('div');
    inspectorContainer.id = 'component-inspector';
    inspectorContainer.style.cssText = `
      padding: 16px;
      height: 100%;
      overflow: auto;
    `;

    const header = document.createElement('div');
    header.innerHTML = `
      <h3 style="margin: 0 0 16px 0;">Component Inspector</h3>
      <button id="toggle-inspect">Start Inspecting</button>
    `;

    const details = document.createElement('div');
    details.id = 'inspector-details';
    details.style.marginTop = '16px';

    inspectorContainer.appendChild(header);
    inspectorContainer.appendChild(details);
    panel.appendChild(inspectorContainer);

    // Initialize highlight overlay
    this.createHighlightOverlay();

    // Add event listeners
    document.getElementById('toggle-inspect')?.addEventListener('click', () => {
      this.toggleInspector();
    });
  }

  createHighlightOverlay() {
    this.highlightOverlay = document.createElement('div');
    this.highlightOverlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9998;
      background: rgba(67, 133, 244, 0.2);
      border: 2px solid #4385f4;
      display: none;
    `;
    document.body.appendChild(this.highlightOverlay);
  }

  toggleInspector() {
    this.isInspecting = !this.isInspecting;
    const toggleBtn = document.getElementById('toggle-inspect');
    if (toggleBtn) {
      toggleBtn.textContent = this.isInspecting ? 'Stop Inspecting' : 'Start Inspecting';
    }

    if (this.isInspecting) {
      document.addEventListener('mouseover', this.boundHandleMouseOver);
      document.addEventListener('click', this.boundHandleClick);
    } else {
      document.removeEventListener('mouseover', this.boundHandleMouseOver);
      document.removeEventListener('click', this.boundHandleClick);
      this.hideHighlight();
    }
  }

  handleMouseOver(event) {
    if (!this.isInspecting) return;
    event.stopPropagation();

    const target = this.findReactExpressElement(event.target);
    if (target) {
      this.highlightElement(target);
    } else {
      this.hideHighlight();
    }
  }

  handleClick(event) {
    if (!this.isInspecting) return;
    event.preventDefault();
    event.stopPropagation();

    const target = this.findReactExpressElement(event.target);
    if (target) {
      this.selectElement(target);
      this.toggleInspector(); // Stop inspecting after selection
    }
  }

  findReactExpressElement(element) {
    let current = element;
    while (current && current !== document.body) {
      if (current.hasAttribute('data-react-express-component')) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  highlightElement(element) {
    const rect = element.getBoundingClientRect();
    Object.assign(this.highlightOverlay.style, {
      display: 'block',
      top: rect.top + window.scrollY + 'px',
      left: rect.left + window.scrollX + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px'
    });
  }

  hideHighlight() {
    if (this.highlightOverlay) {
      this.highlightOverlay.style.display = 'none';
    }
  }

  selectElement(element) {
    this.selectedElement = element;
    this.updateInspectorDetails();
  }

  updateInspectorDetails() {
    const details = document.getElementById('inspector-details');
    if (!details || !this.selectedElement) return;

    const componentName = this.selectedElement.getAttribute('data-react-express-component');
    const state = window.ReactExpress?.getState?.(this.selectedElement.id) || {};

    details.innerHTML = `
      <div style="background: #f5f5f5; padding: 12px; border-radius: 4px;">
        <h4 style="margin: 0 0 8px 0;">Selected Component: ${componentName || 'Unknown'}</h4>
        <div>
          <strong>ID:</strong> ${this.selectedElement.id || 'None'}
        </div>
        <div style="margin-top: 8px;">
          <strong>State:</strong>
          <pre style="margin: 8px 0; background: #fff; padding: 8px; border-radius: 4px;">${
            JSON.stringify(state, null, 2) || 'No state'
          }</pre>
        </div>
      </div>
    `;
  }

  cleanup() {
    this.isInspecting = false;
    document.removeEventListener('mouseover', this.boundHandleMouseOver);
    document.removeEventListener('click', this.boundHandleClick);
    this.highlightOverlay?.remove();
    document.getElementById('component-inspector')?.remove();
  }
}

// Register with DevTools
if (window.ReactExpress?.DevTools) {
  window.ReactExpress.DevTools.registerTool('componentInspector', new ComponentInspector());
}

export default ComponentInspector;
