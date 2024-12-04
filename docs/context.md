# Context API

The Context API provides a way to pass data through the component tree without having to pass props manually at every level.

## Features

- Context Providers and Consumers
- Reactive updates
- HTML attribute-based API
- Nested contexts support
- Automatic cleanup

## API Reference

### Creating Context

```javascript
const ThemeContext = ReactExpress.createContext('light');
```

### HTML Integration

#### Provider
```html
<div data-context="theme" data-context-value="dark">
  <!-- Child content -->
</div>
```

#### Consumer
```html
<div data-context-consumer="theme">
  Current theme: {value}
</div>
```

### JavaScript API

#### Creating Context
```javascript
const UserContext = ReactExpress.createContext({
  name: 'Guest',
  role: 'visitor'
});
```

#### Provider Methods
```javascript
UserContext.Provider({
  name: 'John',
  role: 'admin'
});
```

#### Consumer Methods
```javascript
UserContext.Consumer(value => {
  console.log('User updated:', value);
});
```

## Examples

### Theme Switching
```html
<!-- Create context -->
<script>
  const ThemeContext = ReactExpress.createContext('light');
</script>

<!-- Provider with controls -->
<div data-context="theme" data-context-value="light">
  <button onclick="this.parentElement.setAttribute('data-context-value', 'dark')">
    Switch to Dark
  </button>
  
  <!-- Consumer -->
  <div data-context-consumer="theme">
    Current theme: {value}
  </div>
  
  <!-- Nested consumer with custom template -->
  <div data-context-consumer="theme">
    <button class="btn-{value}">Themed Button</button>
  </div>
</div>
```

### User Authentication
```html
<script>
  const AuthContext = ReactExpress.createContext({
    user: null,
    isAuthenticated: false
  });
</script>

<div data-context="auth" data-context-value='{"user": "john", "isAuthenticated": true}'>
  <div data-context-consumer="auth">
    Welcome, {value.user}!
  </div>
</div>
```

## Best Practices

1. **Context Organization**
   - Create contexts for specific domains
   - Keep context values focused
   - Consider default values carefully

2. **Performance**
   - Avoid unnecessary provider updates
   - Use multiple contexts instead of one large context
   - Consider memoization for complex values

3. **Error Handling**
   - Provide meaningful default values
   - Handle missing providers gracefully
   - Validate context values

4. **Nested Contexts**
   - Keep nesting shallow when possible
   - Consider context composition
   - Watch for circular dependencies

## Common Patterns

### Theme Provider
```html
<div data-context="theme" data-context-value="light">
  <style>
    .theme-light { background: white; color: black; }
    .theme-dark { background: black; color: white; }
  </style>
  
  <div data-context-consumer="theme">
    <div class="theme-{value}">
      Themed content
    </div>
  </div>
</div>
```

### Authentication Flow
```html
<div data-context="auth" data-context-value='{"isAuthenticated": false}'>
  <div data-context-consumer="auth">
    {value.isAuthenticated ? 
      '<div>Welcome back!</div>' : 
      '<button>Login</button>'}
  </div>
</div>
```

### Localization
```html
<div data-context="locale" data-context-value='{"lang": "en"}'>
  <div data-context-consumer="locale">
    {value.lang === 'en' ? 'Hello' : 'Bonjour'}
  </div>
</div>
```

## Error Boundaries

The Context API includes built-in error handling:

1. Missing Provider fallback to default value
2. Invalid context value handling
3. Circular dependency detection
4. Template parsing error recovery
