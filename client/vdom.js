class VirtualDOM {
  constructor() {
    this.currentTree = null;
  }

  createElement(type, props = {}, ...children) {
    return {
      type,
      props: { ...props, children: children.flat() },
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
          element.removeAttribute(key);
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
          element.setAttribute(key, value);
        }
      }
    });
  }

  render(vnode, container) {
    if (!this.currentTree) {
      // First render
      this.currentTree = vnode;
      container.appendChild(this.createDOMElement(vnode));
    } else {
      // Subsequent renders - perform diffing
      this.diff(this.currentTree, vnode, container);
      this.currentTree = vnode;
    }
  }
}

// Initialize ReactExpress virtual DOM
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.createElement = (type, props, ...children) => {
  return window.ReactExpress.vdom.createElement(type, props, ...children);
};
window.ReactExpress.vdom = new VirtualDOM();
