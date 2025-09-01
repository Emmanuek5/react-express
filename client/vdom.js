class VirtualDOM {
  constructor() {
    // Keep a separate virtual tree per container
    this.trees = new WeakMap(); // container -> vnode
    // Batch renders per microtask
    this.queue = new Map(); // container -> latest vnode
    this.scheduled = false;
  }

  createElement(type, props = {}, ...children) {
    const flat = children
      .flat()
      .filter((c) => c !== null && c !== undefined && c !== false && c !== true);
    return {
      type,
      props: { ...props, children: flat },
    };
  }

  createDOMElement(vnode) {
    if (typeof vnode === "string" || typeof vnode === "number") {
      return document.createTextNode(vnode);
    }

    const element = document.createElement(vnode.type);

    // Set properties
    Object.entries(vnode.props || {}).forEach(([name, value]) => {
      if (name === "children") return;
      if (name.startsWith("on")) {
        element.addEventListener(name.toLowerCase().slice(2), value);
      } else if (name === 'className') {
        element.setAttribute('class', value);
      } else if (name === 'style' && value && typeof value === 'object') {
        element.setAttribute('style', this._styleToString(value));
      } else if (typeof value === 'boolean') {
        if (value) element.setAttribute(name, "");
      } else {
        element.setAttribute(name, value);
      }
    });

    // Append children
    (vnode.props.children || []).forEach((child) => {
      element.appendChild(this.createDOMElement(child));
    });

    return element;
  }

  diff(oldNode, newNode, parent, index = 0) {
    if (!oldNode) {
      parent.appendChild(this.createDOMElement(newNode));
      return;
    }

    if (!newNode) {
      parent.removeChild(parent.childNodes[index]);
      return;
    }

    if (this.nodeChanged(oldNode, newNode)) {
      parent.replaceChild(
        this.createDOMElement(newNode),
        parent.childNodes[index]
      );
      return;
    }

    // Update properties
    if (oldNode.props && newNode.props) {
      this.updateProps(parent.childNodes[index], oldNode.props, newNode.props);
    }

    // Recursively diff children
    const maxLength = Math.max(
      oldNode.props?.children?.length || 0,
      newNode.props?.children?.length || 0
    );

    for (let i = 0; i < maxLength; i++) {
      this.diff(
        oldNode.props?.children?.[i],
        newNode.props?.children?.[i],
        parent.childNodes[index],
        i
      );
    }
  }

  nodeChanged(node1, node2) {
    return (
      typeof node1 !== typeof node2 ||
      (typeof node1 === "string" && node1 !== node2) ||
      node1.type !== node2.type
    );
  }

  updateProps(element, oldProps, newProps) {
    // Remove old properties
    Object.keys(oldProps).forEach((key) => {
      if (key === "children") return;
      if (!(key in newProps)) {
        if (key.startsWith("on")) {
          element.removeEventListener(
            key.toLowerCase().slice(2),
            oldProps[key]
          );
        } else {
          const attr = key === 'className' ? 'class' : key;
          element.removeAttribute(attr);
        }
      }
    });

    // Set new properties
    Object.entries(newProps).forEach(([key, value]) => {
      if (key === "children") return;
      if (oldProps[key] !== value) {
        if (key.startsWith("on")) {
          if (oldProps[key]) {
            element.removeEventListener(
              key.toLowerCase().slice(2),
              oldProps[key]
            );
          }
          element.addEventListener(key.toLowerCase().slice(2), value);
        } else {
          const attr = key === 'className' ? 'class' : key;
          if (attr === 'style' && value && typeof value === 'object') {
            element.setAttribute('style', this._styleToString(value));
          } else if (typeof value === 'boolean') {
            if (value) element.setAttribute(attr, ""); else element.removeAttribute(attr);
          } else {
            element.setAttribute(attr, value);
          }
        }
      }
    });
  }

  render(vnode, container, options = {}) {
    // Queue and batch renders by container
    this.queue.set(container, vnode);
    if (options && options.sync) {
      this._flush();
    } else {
      this._schedule();
    }
  }

  _schedule() {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => this._flush());
  }

  _flush() {
    if (!this.queue.size) { this.scheduled = false; return; }
    const entries = Array.from(this.queue.entries());
    this.queue.clear();
    this.scheduled = false;
    for (const [container, vnode] of entries) {
      this._commit(container, vnode);
    }
  }

  _commit(container, vnode) {
    const prev = this.trees.get(container);

    // Initial render clears SSR content
    if (prev === undefined) {
      container.innerHTML = '';
    }

    // Handle raw HTML vnodes by writing innerHTML directly
    if (this._isRaw(vnode)) {
      container.innerHTML = vnode.__raw || '';
      this.trees.set(container, vnode);
      return;
    }

    if (prev === undefined) {
      container.appendChild(this.createDOMElement(vnode));
      this.trees.set(container, vnode);
      return;
    }

    if (this._isRaw(prev)) {
      // Transition from raw -> vnode: clear and rebuild
      container.innerHTML = '';
      container.appendChild(this.createDOMElement(vnode));
      this.trees.set(container, vnode);
      return;
    }

    // Diff existing tree
    this.diff(prev, vnode, container);
    this.trees.set(container, vnode);
  }

  _isRaw(vnode) {
    return vnode && typeof vnode === 'object' && Object.prototype.hasOwnProperty.call(vnode, '__raw');
  }

  raw(html) {
    return { __raw: String(html ?? '') };
  }

  _styleToString(obj) {
    return Object.entries(obj)
      .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${v}`)
      .join(';');
  }
}


// Initialize ReactExpress virtual DOM
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.createElement = (type, props, ...children) => {
  return window.ReactExpress.vdom.createElement(type, props, ...children);
};
window.ReactExpress.vdom = new VirtualDOM();
