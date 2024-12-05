# Suspense Module

The Suspense module provides advanced loading state management with customizable placeholders, lazy loading, and dynamic data binding capabilities.

## Features

- Beautiful default loading animation
- Custom placeholder support
- Template-based placeholders
- Intersection Observer integration
- Error handling
- Smooth transitions
- **API Request Integration**
- **Dynamic Data Binding**
- **Advanced Caching**
- **Retry Mechanisms**
- **Flexible Placeholders**

## API Reference

### LoaderManager

The main object that handles suspense functionality.

#### Configuration

##### Default Placeholder
```javascript
LoaderManager.defaultPlaceholder = `
  <div class="react-express-loader">
    <div class="loader-content">Loading...</div>
  </div>
`;
```

##### Styles
```javascript
LoaderManager.styles = `
  @keyframes loader-pulse {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;
```

### HTML Integration

#### Data Attributes

##### `data-suspense`
Marks a container for suspense handling:
```html
<div data-suspense="user-profile">
  Content to load
</div>
```

##### `data-placeholder`
Defines an inline placeholder:
```html
<div data-suspense="dashboard" 
     data-placeholder="<div>Loading dashboard...</div>">
  Dashboard content
</div>
```

##### `data-placeholder-file`
Specifies a template file for the placeholder:
```html
<div data-suspense="profile" 
     data-placeholder-file="/templates/profile-loader.ejs">
  Profile content
</div>
```

##### `data-api`
Specifies an API endpoint to fetch data from:
```html
<div 
  data-suspense
  data-api="/api/user-profile">
  <!-- Content will be dynamically populated -->
</div>
```

##### `data-bind`
Maps API response fields to specific elements:
```html
<div 
 data-suspense
  data-api="/api/user-profile">
  <h2 data-bind="name">Name Loading...</h2>
  <p data-bind="email">Email Loading...</p>
  <p data-bind="role">Role Loading...</p>
</div>
```

#### Advanced Usage Example

```html
<!-- User Profile with Complex Data Binding -->
<div 
  data-suspense
  data-api="/api/complex-profile"
  data-component-path="UserProfile">
  
  <!-- Nested Data Binding -->
  <h1 data-bind="user.fullName">Loading Name...</h1>
  <div class="contact-info">
    <p data-bind="user.contact.email">Loading Email...</p>
    <p data-bind="user.contact.phone">Loading Phone...</p>
  </div>
  
  <!-- List Rendering -->
  <ul class="skills">
    <li data-bind="user.skills.0">Skill 1</li>
    <li data-bind="user.skills.1">Skill 2</li>
    <li data-bind="user.skills.2">Skill 3</li>
  </ul>
</div>
```

### Custom Placeholders

### Placeholder Types

#### 1. Inline HTML Placeholder
You can define a custom placeholder directly in the HTML:

```html
<div 
  data-suspense 
  data-api="/api/user-profile"
  data-suspense-placeholder="<div class='custom-loader'>Loading custom...</div>">
  <!-- Original content -->
</div>
```

#### 2. Template Reference Placeholder
Create a template and reference it by ID:

```html
<!-- Define a template -->
<template id="custom-loader">
  <div class="custom-loader">
    <span class="loader-icon">🔄</span>
    Loading content...
  </div>
</template>

<!-- Use the template -->
<div 
  data-suspense 
  data-api="/api/user-profile"
  data-suspense-placeholder="#custom-loader">
  <!-- Original content -->
</div>
```

#### 3. Default Placeholder
If no custom placeholder is defined, a default loader will be used:

```html
<div 
  data-suspense 
  data-api="/api/user-profile">
  <!-- Will use the default loader -->
</div>
```

### Placeholder Precedence
1. Custom `data-suspense-placeholder` takes highest priority
2. Fallback to default loader if no custom placeholder is defined

### Lazy Loading

The module uses Intersection Observer for lazy loading:

1. Content loads when container enters viewport
2. Configurable root margin (default: 50px)
3. Automatic cleanup and error handling

### Placeholder System

Three types of placeholders:

1. **Default**: Built-in animated loader
2. **Inline**: Custom HTML via data-placeholder
3. **Template**: External template via data-placeholder-file

### CSS Customization

#### Default Loader Styling
```css
.react-express-loader {
  background: linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loader-pulse 1.5s ease-in-out infinite;
  min-height: 100px;
  border-radius: 4px;
}

.loader-content {
  opacity: 0.5;
}
```

### Error Handling

The module includes comprehensive error handling:

1. Placeholder loading errors
2. Content loading errors
3. Template parsing errors
4. Network errors
5. API request errors

The Suspense module automatically handles errors during API requests:
- Displays error messages
- Prevents application from breaking
- Logs detailed error information

### Advanced Features

#### Basic Usage

```html
<div 
  data-suspense 
  data-api="/api/user-profile">
  <!-- Original content as fallback -->
  <h3 data-bind="name">Loading Name...</h3>
</div>
```

#### Placeholders

##### Inline Placeholder
```html
<div 
  data-suspense 
  data-api="/api/data"
  data-suspense-placeholder="<div>Custom Loading...</div>">
  <!-- Content -->
</div>
```

##### Template Placeholder
```html
<template id="custom-loader">
  <div class="loader">Loading...</div>
</template>

<div 
  data-suspense 
  data-api="/api/data"
  data-suspense-placeholder="#custom-loader">
  <!-- Content -->
</div>
```

#### Advanced Configuration

##### Caching
```html
<div 
  data-suspense 
  data-api="/api/data"
  data-cache-key="unique-cache-key"
  data-cache-duration="300000">  <!-- Cache for 5 minutes -->
  <!-- Content -->
</div>
```

#### Error Handling

##### Custom Error Template
```html
<template id="error-template">
  <div class="error-container">
    <p>Failed to load content</p>
    <button class="retry-button">Retry</button>
  </div>
</template>
```

#### Data Binding

##### Nested Data Binding
```html
<div data-suspense data-api="/api/profile">
  <h1 data-bind="user.name">Name</h1>
  <p data-bind="user.contact.email">Email</p>
</div>
```

#### Event Handling

```javascript
document.querySelector('[data-suspense]').addEventListener('content-loaded', (event) => {
  console.log('Loaded data:', event.detail);
});

document.querySelector('[data-suspense]').addEventListener('content-error', (event) => {
  console.error('Loading error:', event.detail);
});
```

### Configuration Options

#### Global Configuration
```javascript
const loader = new LoaderManager({
  retryAttempts: 3,     // Number of retry attempts
  retryDelay: 1000,     // Delay between retries (ms)
  timeout: 5000,        // Request timeout (ms)
  defaultCacheDuration: 300000 // Default cache duration (5 minutes)
});
```

#### Static Methods
```javascript
// Clear entire cache
LoaderManager.clearCache();

// Clear specific cache entry
LoaderManager.clearCache('unique-key');
```

### Best Practices

1. Always provide fallback content
2. Use meaningful cache keys
3. Handle potential errors
4. Optimize placeholder designs
5. Consider network conditions

### Performance Considerations

- Caching reduces unnecessary network requests
- Retry mechanism improves reliability
- Placeholder provides better user experience
- Minimal performance overhead

### Browser Compatibility

Requires modern browsers supporting:
- `fetch` API
- `AbortController`
- `MutationObserver`
- ES6+ features
