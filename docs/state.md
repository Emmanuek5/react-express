# State Management Module (Unified with Hooks)

The state management module provides a reactive state management system for React Express applications. It is now unified with `ReactExpress.hooks`, so calls to `ReactExpress.setState/getState/subscribe/batchUpdate` delegate to the hooks store and event bus. This ensures consistent behavior, two-way bindings, formatter support, and effect/memo reactivity across the app.

Note:
- The legacy `data-type` attribute remains supported for back-compat.
- Prefer `data-format` with the formatter registry for display control.

## Features

- Reactive state management
- Real-time state synchronization
- Automatic DOM updates
- State subscriptions
- Batch updates
- Type-aware rendering

## API Reference

### State Management

#### `ReactExpress.setState(key, value, options = { sync: true })`
Sets a state value and updates all elements bound via hooks (`data-react-state`) and formatter rules. Triggers hooks reactivity (`useEffect`, `useMemo`, `onStateChange`).

```javascript
ReactExpress.setState('counter', 5);
ReactExpress.setState('user', { name: 'John' }, { sync: false });
```

Parameters:
- `key` (string): State identifier
- `value` (any): New state value
- `options` (object): 
  - `sync` (boolean): Whether to sync with server (default: true)

#### `ReactExpress.getState(key)`
Retrieves the current value of a state from the hooks store.

```javascript
const value = ReactExpress.getState('counter');
```

#### `ReactExpress.subscribe(keys, callback)`
Subscribes to changes in multiple state values using the hooks event bus. The callback runs when any of the keys changes.

```javascript
ReactExpress.subscribe(['counter', 'name'], ([count, name]) => {
  return `${name}: ${count}`;
});
```

Parameters:
- `keys` (string[]): Array of state keys to subscribe to
- `callback` (function): Function called when any subscribed state changes

#### `ReactExpress.batchUpdate(updates, options = { sync: true })`
Updates multiple state values at once.

```javascript
ReactExpress.batchUpdate({
  counter: 5,
  name: 'John',
  active: true
});
```

Parameters:
- `updates` (object): Key-value pairs of state updates
- `options` (object):
  - `sync` (boolean): Whether to sync with server (default: true)

### HTML Integration

#### Data Attributes

##### `data-react-state`
Binds an element to a state value (hooks-managed):

```html
<div data-react-state="counter">0</div>
<div data-react-state="user" data-type="json"></div>
```

##### `data-format` (recommended)
Specifies how to render state values using the formatter registry or inline expressions:

- Named formatter: `data-format="currency"`
- Global function name: `data-format="myFormatterFn"`
- Inline expression: `data-format="js:value * 2"`

##### `data-type` (back-compat)
Legacy attribute that maps to built-in formatters:

- `json`: Pretty-prints JSON (uses `textContent`; apply CSS `white-space: pre`)
- `list`: Renders arrays as list items (`<li>`)
- `todo`: Renders todo items

## Formatting and Display

Use the formatter registry for consistent display formatting:

```javascript
ReactExpress.formatters.add('currency', (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v));
```

```html
<div data-react-state="price" data-format="currency"></div>
```

Back-compat examples using `data-type`:

```html
<div data-react-state="user" data-type="json"></div>
<ul data-react-state="items" data-type="list"></ul>
<div data-react-state="todos" data-type="todo"></div>
```

## Server Synchronization

The state module automatically synchronizes with the server when enabled. Incoming socket updates are applied through the hooks store, triggering all bindings and reactive hooks:

1. Real-time updates via WebSocket
2. Initial state loading on page load
3. Batch updates for performance
4. Error handling and recovery

Tip: For local-only changes, pass `{ sync: false }` to `setState` or use a separate key for transient UI state.

## Best Practices

1. Use batch updates when changing multiple states
2. Consider disabling sync for temporary local states
3. Provide appropriate data-type attributes for complex data
4. Use subscriptions for computed values
5. Handle initial state loading properly
