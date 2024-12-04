# State Management

ReactExpress provides a powerful state management system inspired by Vuex/Redux patterns, combined with a reactive state system for efficient updates and computed properties.

## Store

The Store provides centralized state management with mutations, actions, and modular architecture.

### Creating a Store

```javascript
const store = ReactExpress.createStore({
  state: {
    count: 0,
    todos: []
  },
  mutations: {
    INCREMENT(state) {
      state.count++
    },
    ADD_TODO(state, todo) {
      state.todos.push(todo)
    }
  },
  actions: {
    async fetchTodos({ state, commit }) {
      const todos = await api.getTodos()
      commit('ADD_TODO', todos)
    }
  }
})
```

### Store API

#### State
- Access the reactive state object directly through `store.state`
- State is automatically reactive and will trigger updates when modified through mutations

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

### Integration with Components

The store automatically integrates with the hooks system:

```javascript
function Counter() {
  const count = ReactExpress.hooks.useState(state => state.count)
  
  return {
    onClick: () => store.commit('INCREMENT'),
    template: `<div>Count: ${count}</div>`
  }
}
```

## Reactive System

The reactive system provides fine-grained reactivity for state management.

### Creating Reactive State

```javascript
const state = ReactExpress.reactive.createReactive({
  count: 0,
  message: 'Hello'
})
```

### Computed Properties

Create derived state that automatically updates:

```javascript
const doubleCount = ReactExpress.reactive.computed(() => {
  return state.count * 2
})
```

### Watchers

Watch for state changes and react accordingly:

```javascript
ReactExpress.reactive.watch(() => {
  console.log('Count changed:', state.count)
  // Return cleanup function if needed
  return () => {
    // Cleanup
  }
})
```

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

4. **Component Integration**
   - Use `useState` hook for component state
   - Avoid storing component-local state in the store
   - Use computed properties for derived state

## Performance Considerations

- The reactive system tracks dependencies automatically
- Only affected components are updated when state changes
- Computed properties are cached until dependencies change
- Watchers are automatically cleaned up when components unmount
