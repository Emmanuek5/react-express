# State Management

ReactExpress provides two complementary layers:

- The hooks/VDOM layer (single rendering source of truth)
- An optional Store facade (Vuex-like) that forwards state changes into hooks

This unification ensures that all UI updates flow through the Virtual DOM renderer for batching and consistency.

## Store

The Store provides centralized state management (mutations, actions, modules) and forwards updates into `ReactExpress.hooks`, which drives the VDOM renderer. Treat the Store as an orchestrator; rendering still goes through hooks.

### Creating a Store

```javascript
const store = ReactExpress.createStore({
  state: { count: 0, todos: [] },
  mutations: {
    INCREMENT(state) { state.count++; },
    ADD_TODO(state, todo) { state.todos.push(todo); }
  },
  actions: {
    async fetchTodos({ commit }) {
      const todos = await api.getTodos();
      commit('ADD_TODO', todos);
    }
  }
});
```

### Store API

#### State
- Access the reactive state object directly via `store.state`
- Mutate state only via mutations; commits are forwarded into hooks so bound UI updates render via VDOM

#### Mutations
- Synchronous functions that directly modify state
- Called using `store.commit('mutationName', payload)`
- Must be defined in store options

#### Actions
- Asynchronous operations that can commit mutations
- Called using `store.dispatch('actionName', payload)`
- Receive context object with { state, commit, dispatch }

#### Modules
- Break down large stores into modules
- Each module can have its own state, mutations, and actions
- Automatically namespaced under the module key

### Integration with Hooks/VDOM

Store commits update hooks state keys, which in turn update any `[data-react-state]` bindings and VDOM-rendered content.

```html
<button id="inc">+</button>
<div data-react-state="count">0</div>
```

```javascript
// Initialize a hooks binding for the key (Store constructor also does this)
const [getCount] = ReactExpress.hooks.useState('count', store.state.count);

// Commit through the store; hooks/VDOM will update the bound element
document.getElementById('inc').addEventListener('click', () => {
  store.commit('INCREMENT');
});
```

## Reactive System

The reactive system (`client/reactive-state.js`) provides fine-grained reactivity for computed values and watchers. It is independent but can be used to power store state.

### Creating Reactive State

```javascript
const state = ReactExpress.reactive.createReactive({ count: 0, message: 'Hello' });
```

### Computed Properties

Create derived state with lazy recomputation when dependencies change:

```javascript
const doubleCount = ReactExpress.reactive.computed(() => state.count * 2);
```

### Watchers

Watch for state changes and react accordingly:

```javascript
const stop = ReactExpress.reactive.watch(() => {
  console.log('Count changed:', state.count);
  // Optional cleanup
  return () => {/* cleanup */};
});
```

Notes:
- Shallow reactivity: only top-level props on the reactive object are proxied.
- Computed subscribers: reading only a computed inside a watcher will not subscribe to its deps; also read the underlying props or structure your watcher accordingly.

## Best Practices

1. **State Mutations**
   - Always use mutations to change state
   - Keep mutations simple and focused
   - Avoid directly modifying state outside mutations

2. **Actions**
   - Use actions for async operations
   - Actions can dispatch other actions
   - Keep business logic in actions

3. **Modules**
   - Split large stores into modules
   - Keep related state together
   - Use namespacing to avoid naming conflicts

4. **Hooks Integration**
   - Use `ReactExpress.hooks.useState(key, initial)` for UI state
   - Let the Store orchestrate domain state; it forwards changes into hooks
   - Use computed properties for derived state (outside of hooks), or `useEffect` to derive another key

## Performance Considerations

- Hooks + VDOM batch DOM updates for minimal reflows
- Store commits forward only top-level keys; structure state to avoid excessive fan-out
- Reactive system caches computed values until marked stale
- Clean up watchers to avoid memory leaks
