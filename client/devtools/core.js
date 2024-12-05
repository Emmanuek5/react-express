// Core DevTools functionality for React-Express
class ReactExpressDevTools {
  constructor() {
    this.isEnabled = false;
    this.tools = new Map();
    this.listeners = new Set();
  }

  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.initializeDevTools();
    this.notifyListeners('enabled');
  }

  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    this.cleanup();
    this.notifyListeners('disabled');
  }

  registerTool(name, tool) {
    this.tools.set(name, tool);
    if (this.isEnabled) {
      tool.initialize?.();
    }
  }

  addEventListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => listener(event, data));
  }

  initializeDevTools() {
    // Create DevTools panel
    const panel = document.createElement('div');
    panel.id = 'react-express-devtools';
    panel.style.cssText = `
      position: fixed;
      bottom: 0;
      right: 0;
      width: 300px;
      height: 400px;
      background: #ffffff;
      border: 1px solid #ccc;
      border-radius: 4px 0 0 0;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      z-index: 9999;
      display: none;
    `;

    // Add toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'DevTools';
    toggleBtn.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      z-index: 10000;
      padding: 8px 16px;
      background: #4a90e2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;

    toggleBtn.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    document.body.appendChild(panel);
    document.body.appendChild(toggleBtn);

    // Initialize registered tools
    this.tools.forEach(tool => tool.initialize?.());
  }

  cleanup() {
    const panel = document.getElementById('react-express-devtools');
    panel?.remove();
    
    const toggleBtn = document.querySelector('button');
    toggleBtn?.remove();

    // Cleanup registered tools
    this.tools.forEach(tool => tool.cleanup?.());
  }

  // Debug logging
  log(message, type = 'info') {
    if (!this.isEnabled) return;
    
    const timestamp = new Date().toISOString();
    console.log(`[ReactExpressDevTools][${type}][${timestamp}]:`, message);
  }
}

// Initialize DevTools globally
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.DevTools = new ReactExpressDevTools();

// Export for module usage
export default window.ReactExpress.DevTools;
