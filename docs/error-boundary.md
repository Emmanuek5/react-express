# Error Boundary

Error Boundaries provide a way to handle JavaScript errors in React Express components, preventing the entire application from breaking when an error occurs in a component.

## Usage

```javascript
const errorBoundary = createErrorBoundary({
  fallback: (error) => `<div>Custom error message: ${error.message}</div>`,
  onError: (error) => console.error('Caught an error:', error)
});

// Wrap your component with error boundary
const protectedComponent = errorBoundary.wrapComponent(yourComponent, {
  init: (comp) => {
    // Your initialization logic
  },
  render: (state, el) => {
    // Your render logic
  }
});
```

## API Reference

### `createErrorBoundary(options)`

Creates a new error boundary instance.

#### Options

- `fallback` (optional): A function that receives the error and returns HTML string for the fallback UI. If not provided, a default fallback UI will be used.
- `onError` (optional): A callback function that gets called when an error occurs.

### `ErrorBoundary.wrapComponent(element, options)`

Wraps a component with error boundary protection.

#### Parameters

- `element`: The component element to wrap
- `options`: Component options object
  - `init` (optional): Initialization function for the component
  - `render` (optional): Render function for the component

#### Behavior

1. The error boundary catches errors during:
   - Component initialization
   - Component rendering
   - Event handling

2. When an error occurs:
   - The error UI (fallback) is displayed
   - The `onError` callback is called (if provided)
   - The error is prevented from propagating up the component tree

## Default Fallback UI

If no custom fallback is provided, the error boundary will display a default error UI that shows:
- An "Something went wrong" heading
- The error message

## Example

```javascript
const myComponent = {
  init: (comp) => {
    // This might throw an error
    riskyOperation();
  },
  render: (state, el) => {
    el.innerHTML = '<div>My Component</div>';
  }
};

const errorBoundary = createErrorBoundary({
  fallback: (error) => `
    <div class="custom-error">
      <h3>Oops!</h3>
      <p>${error.message}</p>
      <button onclick="location.reload()">Retry</button>
    </div>
  `,
  onError: (error) => {
    console.error('Component failed:', error);
    // Send to error reporting service
  }
});

const safeMountedComponent = errorBoundary.wrapComponent(myComponent);
```

## Best Practices

1. Use error boundaries for recovering from unexpected errors
2. Provide meaningful fallback UIs that help users understand what went wrong
3. Implement error logging in the `onError` callback for monitoring and debugging
4. Consider providing retry mechanisms in your fallback UI
5. Don't use error boundaries for flow control or expected errors
