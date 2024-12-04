# Suspense Module

The Suspense module provides advanced loading state management with customizable placeholders and lazy loading capabilities.

## Features

- Beautiful default loading animation
- Custom placeholder support
- Template-based placeholders
- Intersection Observer integration
- Error handling
- Smooth transitions

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

### Best Practices

1. Use appropriate placeholder types:
   - Default for simple cases
   - Inline for small custom loaders
   - Template files for complex loaders

2. Optimize loading:
   - Set appropriate viewport margins
   - Use template caching
   - Implement error fallbacks

3. Enhance user experience:
   - Add smooth transitions
   - Match placeholder size to content
   - Provide meaningful loading states

4. Handle errors gracefully:
   - Implement fallback content
   - Show error messages when appropriate
   - Provide retry mechanisms
