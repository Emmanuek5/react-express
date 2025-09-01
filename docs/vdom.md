# Virtual DOM Implementation

The Virtual DOM (VDOM) is a key feature of ReactExpress that enables efficient DOM updates and component rendering. It provides a lightweight abstraction layer between your components and the actual DOM, optimizing performance by minimizing direct DOM manipulations.

## Core Concepts

### Virtual DOM Trees (per container)
The Virtual DOM maintains a separate tree per render container. Trees are kept in memory and diffed on each render to compute minimal DOM mutations.

### Diffing Algorithm
On updates, the VDOM diffs the previous and next virtual trees and applies the minimal changes to the real DOM. Children are reconciled by index (keys are not yet supported).

## API Reference

### VirtualDOM Class

#### Constructor
```javascript
const vdom = new VirtualDOM();
```
Creates a new Virtual DOM instance. Internally tracks a tree per container.

#### Methods

##### createElement(type, props, ...children)
Creates a virtual DOM node.
- `type`: The HTML tag name (e.g., 'div', 'span')
- `props`: Object of attributes/props; supports `className`, `style` objects, boolean attributes, and `on*` event handlers
- `children`: Child vnodes or strings; `null/undefined/false/true` are ignored

##### render(vnode, container, options?)
Queues a render of a virtual node to a DOM container. Renders are batched per microtask.
- `vnode`: Virtual DOM node or string; use `vdom.raw(html)` for raw HTML
- `container`: DOM element container
- `options.sync` (boolean): flush immediately instead of batching

##### diff(oldNode, newNode, parent, index)
Performs diffing between old and new nodes. Children are reconciled by index (no keys yet).

##### raw(html)
Creates a raw HTML vnode that sets `container.innerHTML` directly.

```javascript
vdom.render(vdom.raw('<li>Unsafe if untrusted</li>'), container);
```

## Usage Example

```javascript
const vdom = new VirtualDOM();

// Create a virtual element
const virtualElement = vdom.createElement(
  'div',
  { class: 'container' },
  vdom.createElement('h1', {}, 'Hello'),
  vdom.createElement('p', {}, 'World')
);

// Render to DOM (batched)
vdom.render(virtualElement, document.getElementById('root'));

// Render synchronously
vdom.render(virtualElement, document.getElementById('root'), { sync: true });
```

## Integration with ReactExpress

The Virtual DOM is initialized as part of ReactExpress and is available globally as:

```javascript
window.ReactExpress.vdom
```

ReactExpress hooks-based state bindings render via the VDOM for non-input elements. If your formatter returns `{ __html }`, the VDOM will use `vdom.raw()` under the hood. Inputs (`<input>`, `<select>`, `<textarea>`) are updated directly for correctness.

## Performance Considerations

- Batches DOM updates per microtask to minimize reflows
- Diffing algorithm computes minimal necessary changes
- Event listeners are attached via `on*` props and updated during diff

## Best Practices

1. Avoid direct DOM manipulation in components
2. Prefer `ReactExpress.createElement` and VDOM render for templated output
3. Keep component trees shallow when possible for optimal diffing performance
4. Keys are not yet supported; lists are reconciled by index
