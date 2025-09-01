# Hot Module Reloading (HMR)

**UPDATED BEHAVIOR**: The HMR module now performs complete page replacement instead of container-scoped patching. This ensures consistent behavior with the router and proper JavaScript re-execution during development updates.

## Features

- **Full page replacement** (complete body content update)
- Form state preservation (value/checked/selection)
- Focus and window scroll preservation
- Stylesheet hot-swap (cache-busted href)
- Debounced updates (server + client)
- Complete script re-execution (excluding core HMR/socket scripts)
- Custom update listeners
- Error overlay (dev-only)
- Dev-only placeholder route with path sanitization

## API Reference

### HMR Initialization

```js
initHMR(socket)
```

Initializes HMR with a Socket.io connection. In dev, React Express injects this automatically when `hmr: true`.

### Events

- `hmr:update` (internal): emitted by the server (debounced) when a file changes.
- `hmr:updated`: dispatched on `window` when the client finishes processing an update.

```js
window.addEventListener('hmr:updated', (e) => {
  const { success, path, error } = e.detail;
  // Handle post-update tasks
});
```

### State Preservation

The HMR module automatically preserves:

1. Form input values (value, checked, selection for text/textarea)
2. Focused element (by id or name) and selection range
3. Window scroll position

### Update Process

1. Fetch placeholder HTML for the current route (dev-only endpoint)
2. Parse complete HTML document using DOMParser
3. Preserve state, focus, and scroll
4. **Replace entire body content** and update document title
5. **Re-execute all scripts** (excluding core HMR/socket scripts)
6. Hot-swap stylesheets with cache-busting
7. Restore state, focus, and scroll
8. Re-initialize ReactExpress components
9. Dispatch `hmr:updated`

### Error Handling

The module includes non-blocking mechanisms:

1. Console error logging (proxied into the Error Overlay)
2. Error Overlay queue with next/prev navigation (no auto reload)
3. Network error handling
4. Parse error handling

#### Error Overlay

Provides a non-blocking UI for runtime and HMR errors in development.

- Features:
  - Queues errors (max 200) with deduplication
  - Next/Prev navigation and counter
  - Keyboard: Left/Right to navigate, Escape to close
  - Global listeners: `error`, `unhandledrejection`, and `hmr:updated`
  - Does not reload the page; app continues running

- Public API (dev only):
```js
// Show overlay if hidden
ReactExpress.ErrorOverlay.show()

// Log error into the queue
ReactExpress.ErrorOverlay.log(new Error('msg'), { type: 'custom' })

// Hide overlay
ReactExpress.ErrorOverlay.hide()

// Navigate
ReactExpress.ErrorOverlay.next()
ReactExpress.ErrorOverlay.prev()

// Clear queue
ReactExpress.ErrorOverlay.clear()
```

Overlay activation is gated by `window.ReactExpress.__DEV__` which is set automatically when `hmr` is enabled on the server.

## Integration

#### Server-side Setup

```ts
const plugin = reactExpress({
  hmr: process.env.NODE_ENV !== 'production',
  viewsDir: 'views'
});
```

The server mounts a dev-only placeholder route `GET /__react-express/placeholder/*` and emits debounced `hmr:update` events via Socket.io. Paths are sanitized to remain within `viewsDir`.

#### Client-side Setup

No manual setup is required. In dev, React Express injects the boot script, initializes state, loaders, and calls `ReactExpress.initHMR(socket)`.

### Headers

HMR fetch requests add a custom header:
```js
{ 'X-HMR-Request': 'true' }
```

## Best Practices

1. **Development Setup**
   - Enable HMR only in development
   - Keep your templates under a single `viewsDir`
   - Use the default debounce (or increase for noisy setups)

2. **State Management**
   - Let Hooks/VDOM drive UI; HMR patches markup but state comes from hooks
   - Avoid storing ephemeral UI state in templates

3. **Error Handling**
   - Add error boundaries
   - Listen for `hmr:updated` details to surface errors

4. **Performance**
   - Full page replacement ensures complete state reset
   - JavaScript re-execution guarantees fresh component initialization
   - VDOM sections are automatically re-initialized

5. **Security**
   - HMR is disabled in production
   - Placeholder paths are normalized and restricted to `viewsDir`

## Troubleshooting

Common issues and solutions:

1. Updates not applying:
   - Check WebSocket connection
   - Verify file watching
   - Check for JavaScript errors

2. State loss:
   - Verify state preservation logic
   - Check form element names
   - Implement manual state handling

3. Script errors:
   - Check script dependencies
   - Verify script execution order
   - Implement proper error handling
