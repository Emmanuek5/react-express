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

### Global Instance

The router is auto-initialized and available as a singleton:

```html
<script>
  // Use the global instance
  const router = window.ReactExpress.router;
  router.on('afterNavigate', (url) => console.log('navigated:', url));
</script>
```

### Router Configuration

#### Constructor Options
```javascript
const router = new Router({
  animations: true,           // Enable page transitions
  cacheTimeout: 300000,      // Cache timeout (5 minutes)
  prefetchDelay: 100,        // Delay between prefetch requests
  preserveScroll: true       // Preserve/restore scroll on history navigation
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

#### Global DOM Event: `routeChanged`
The router dispatches a global event after navigation:

```javascript
window.addEventListener('routeChanged', (e) => {
  const { url, title } = e.detail;
  // custom logic
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

Notes:
- `prefetch` (no value) = eager prefetch.
- `prefetch="visible"` = prefetch when the link becomes visible in viewport.

### Important Implementation Requirements

### Full Page Replacement

**NEW BEHAVIOR**: The router now performs complete page replacement instead of targeting specific containers. This ensures:

- Complete JavaScript re-execution on navigation
- Full page state reset between routes
- Proper cleanup of previous page resources
- Consistent behavior between HMR and routing

### Page Structure Requirements

1. **Page Template Files**
   - Each page template should be a complete HTML document
   - Include all necessary scripts, styles, and content
   - Example:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Page Title</title>
     <style>/* page styles */</style>
   </head>
   <body>
     <div data-content>
       <!-- Your page content -->
     </div>
     <script>
       // Page-specific JavaScript will execute on navigation
     </script>
   </body>
   </html>
   ```

2. **JavaScript Execution**
   - All inline scripts are re-executed on navigation
   - External scripts are loaded and cached appropriately
   - ReactExpress components are automatically re-initialized

This ensures that navigating from page A to page B completely replaces A with B, including all JavaScript functionality.

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

Details:
- Pages are cached per absolute URL for up to `cacheTimeout` ms.
- Prefetch uses the same cache to avoid duplicate network requests.

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
