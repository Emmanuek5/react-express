# Router Module

The Router module provides advanced client-side routing capabilities with prefetching, middleware support, and smooth page transitions.

## Features

- SPA-like navigation
- Intelligent prefetching
- Page transition animations
- Middleware support
- Navigation lifecycle hooks
- Error boundaries
- Resource management
- Cache control

## API Reference

### Router Configuration

#### Constructor Options
```javascript
const router = new Router({
  animations: true,           // Enable page transitions
  cacheTimeout: 300000,      // Cache timeout (5 minutes)
  prefetchDelay: 100         // Delay between prefetch requests
});
```

### Core Methods

#### `navigateTo(url, addToHistory = true)`
Navigates to a new page using client-side routing.

```javascript
router.navigateTo('/dashboard');
router.navigateTo('/profile', false); // Don't add to history
```

#### `use(middleware)`
Adds a navigation middleware.

```javascript
router.use(async (url) => {
  if (url.startsWith('/admin')) {
    const isAdmin = await checkAdminStatus();
    return isAdmin; // Cancel navigation if not admin
  }
  return true;
});
```

#### `on(event, callback)`
Subscribes to router events.

```javascript
router.on('beforeNavigate', (url) => {
  showLoadingIndicator();
});

router.on('afterNavigate', (url, pageData) => {
  hideLoadingIndicator();
});

router.on('onError', (type, error, context) => {
  handleError(error);
});
```

### HTML Integration

#### Data Attributes

##### `data-route`
Enables client-side routing for links:
```html
<a href="/dashboard" data-route>Dashboard</a>
```

##### `prefetch`
Enables prefetching for links:
```html
<a href="/profile" prefetch>Profile</a>
<a href="/settings" prefetch="visible">Settings</a>
```

### Page Transitions

#### CSS Classes
The router automatically manages transition classes:

```css
[data-content] {
  transition: opacity 0.3s ease-in-out;
}

[data-content].transitioning {
  opacity: 0;
}
```

### Resource Management

The router handles various types of resources:

- Scripts (async/defer)
- Stylesheets
- Inline styles
- Inline scripts

Features:
- Automatic deduplication
- Resource timeout handling
- Proper cleanup
- Error recovery

### Caching

The router implements an intelligent caching system:

1. Page content caching
2. Resource caching
3. Configurable timeout
4. Automatic cache cleanup

### Error Handling

Comprehensive error handling with:

1. Error boundaries
2. Fallback navigation
3. Resource timeout handling
4. Error event hooks

## Best Practices

1. Use data-route for internal navigation
2. Implement proper error handling
3. Configure appropriate cache timeouts
4. Use prefetch for important links
5. Add transition animations for smooth UX
6. Implement navigation guards with middleware
7. Monitor navigation events with hooks
