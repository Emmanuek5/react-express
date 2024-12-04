# Hot Module Reloading (HMR)

The HMR module provides hot module reloading capabilities for React Express applications, enabling instant updates without full page reloads.

## Features

- Live page updates
- Form state preservation
- Scroll position retention
- Script re-execution
- Error recovery
- Suspense compatibility

## API Reference

### HMR Initialization

```javascript
initHMR(socket)
```

Initializes the HMR system with a WebSocket connection.

### Events

#### `hmr:update`
Triggered when a file change is detected:
```javascript
socket.on("hmr:update", async (data) => {
  // Handle update
});
```

#### `hmr:updated`
Dispatched after successful update:
```javascript
window.addEventListener("hmr:updated", () => {
  // Handle post-update tasks
});
```

### State Preservation

The HMR module automatically preserves:

1. Form input values
2. Focus states
3. Scroll positions
4. Interactive element states

### Update Process

1. Fetch new content
2. Parse HTML
3. Preserve states
4. Update DOM
5. Re-run scripts
6. Restore states

### Error Handling

The module includes fallback mechanisms:

1. Console error logging
2. Full page reload fallback
3. Network error handling
4. Parse error handling

## Integration

### Server-side Setup

```javascript
const hmr = reactExpress({
  hmr: true,
  // other options...
});
```

### Client-side Setup

```html
<!-- Auto-initialized with React Express -->
<script src="/__react-express/hmr.js"></script>
```

### Headers

The module uses custom headers for HMR requests:
```javascript
headers: {
  "X-HMR-Request": "true"
}
```

## Best Practices

1. Development Setup:
   - Enable HMR in development only
   - Configure appropriate file watching
   - Set up proper WebSocket connections

2. State Management:
   - Use proper state containers
   - Implement state rehydration
   - Handle complex state carefully

3. Error Handling:
   - Implement proper error boundaries
   - Provide fallback content
   - Log errors appropriately

4. Performance:
   - Optimize update frequency
   - Handle large DOM trees efficiently
   - Manage script re-execution carefully

5. Security:
   - Disable HMR in production
   - Validate WebSocket connections
   - Sanitize updated content

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
