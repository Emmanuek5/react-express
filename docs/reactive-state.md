# Reactive State

ReactExpress includes a lightweight reactive system that provides shallow reactivity, computed values, and watchers. It can be used standalone or to power store state, while rendering is unified through Hooks + VDOM.

- File: `client/reactive-state.js`
- Global: `window.ReactExpress.reactive`

## API Overview

- `createReactive(target): object`
  - Returns a Proxy providing shallow reactivity for the target's top-level properties.
- `computed(fn): () => any`
  - Returns a getter function that lazily recomputes when its dependencies change.
- `watch(effect: () => (void | (() => void))): () => void`
  - Runs `effect` immediately; re-runs when any accessed reactive prop changes.
  - Returns a stop function that calls the last cleanup, if provided.

## Usage

### Create reactive state
```js
const state = ReactExpress.reactive.createReactive({ count: 0, msg: 'Hello' });
```

### Computed values
```js
const double = ReactExpress.reactive.computed(() => state.count * 2);
// Use as a function
console.log(double());
```

### Watch for changes
```js
const stop = ReactExpress.reactive.watch(() => {
  console.log('count changed to', state.count);
  // Optional cleanup on next run
  return () => { /* cleanup */ };
});

// Later, when you no longer need it
stop();
```

## Integration Notes

- Hooks/VDOM are the single rendering source of truth. The reactive system is a utility for data derivation and effects; UI updates should flow through hooks.
- The Store may internally use reactive state, but commits forward into `ReactExpress.hooks` to drive VDOM updates.

## Gotchas and Limitations

- Shallow reactivity only: only top-level properties of the object passed to `createReactive` are tracked.
- Computed subscriptions: reading a computed value inside a watcher does not subscribe the watcher to the computed's dependencies. Ensure the watcher also reads the underlying reactive props it depends on.
- Cleanup behavior: `watch()` returns a stop function that runs the last provided cleanup. Current implementation does not remove dependency references from internal subscriber sets; prefer scoping watchers carefully and calling `stop()` when done.

## Patterns

- Derive domain data with `computed`, then mirror into hooks state when needed for UI:
```js
const state = ReactExpress.reactive.createReactive({ a: 1, b: 2 });
const sum = ReactExpress.reactive.computed(() => state.a + state.b);

const [getSum, setSum] = ReactExpress.hooks.useState('sum', sum());

ReactExpress.reactive.watch(() => {
  setSum(sum()); // Drive the UI through hooks
});
```

- Use Store for mutations and actions; keep heavy derivations in computed values where appropriate, but always render via hooks/VDOM.
