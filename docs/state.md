# State Management Module

The state management module provides a reactive state management system for React Express applications. It enables real-time state synchronization between the client and server, with automatic DOM updates and subscription capabilities.

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
Sets a state value and updates all subscribed elements.

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
Retrieves the current value of a state.

```javascript
const value = ReactExpress.getState('counter');
```

#### `ReactExpress.subscribe(keys, callback)`
Subscribes to changes in multiple state values.

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
Binds an element to a state value:

```html
<div data-react-state="counter">0</div>
<div data-react-state="user" data-type="json"></div>
```

##### `data-type`
Specifies how to render complex state values:

- `json`: Pretty-prints JSON objects
- `list`: Renders arrays as list items
- `todo`: Special rendering for todo items

## Type-Specific Rendering

The state module includes specialized rendering for different data types:

### JSON Objects
```html
<div data-react-state="user" data-type="json"></div>
```

### Lists
```html
<ul data-react-state="items" data-type="list"></ul>
```

### Todo Items
```html
<div data-react-state="todos" data-type="todo"></div>
```

## Server Synchronization

The state module automatically synchronizes with the server when enabled:

1. Real-time updates via WebSocket
2. Initial state loading on page load
3. Batch updates for performance
4. Error handling and recovery

## Best Practices

1. Use batch updates when changing multiple states
2. Consider disabling sync for temporary local states
3. Provide appropriate data-type attributes for complex data
4. Use subscriptions for computed values
5. Handle initial state loading properly
