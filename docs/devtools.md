# React-Express DevTools

React-Express comes with built-in developer tools to help you debug and inspect your applications. Similar to React DevTools, these tools provide component inspection, state monitoring, and debugging capabilities.

## Getting Started

The DevTools are automatically initialized in development mode and disabled in production. You can control this behavior using the `devTools` option when initializing React-Express:

```javascript
// Disable DevTools
reactExpress(app, {
  devTools: false
});

// Enable only in specific conditions
reactExpress(app, {
  devTools: process.env.ENABLE_DEVTOOLS === 'true'
});
```

By default:
- Development mode (`NODE_ENV !== 'production'`): DevTools enabled
- Production mode (`NODE_ENV === 'production'`): DevTools disabled

## Features

### DevTools Panel

The DevTools panel provides a centralized interface for all debugging tools:

- Toggle visibility using the "DevTools" button
- Dockable panel at the bottom-right of your screen
- Collapsible sections for different tools

### Component Inspector

The Component Inspector allows you to examine and debug React-Express components in real-time:

```javascript
// Enable component inspection
window.ReactExpress.DevTools.enable();
```

#### Usage

1. Click the "DevTools" button to open the panel
2. Click "Start Inspecting" to enter inspection mode
3. Hover over components to see them highlighted
4. Click on a component to select it and view details

#### Features

- **Visual Highlighting**: Components are highlighted as you hover over them
- **Component Details**: View component name, ID, and structure
- **State Inspection**: Real-time view of component state
- **Interactive Selection**: Click to select and inspect specific components

### API Reference

#### ReactExpressDevTools

The core DevTools class that manages all debugging features.

```javascript
// Access DevTools globally
const devTools = window.ReactExpress.DevTools;

// Enable/Disable DevTools
devTools.enable();
devTools.disable();

// Register a custom tool
devTools.registerTool('myTool', toolInstance);

// Listen for DevTools events
devTools.addEventListener((event, data) => {
  console.log(`DevTools event: ${event}`, data);
});
```

#### ComponentInspector

The component inspection tool for examining React-Express components.

```javascript
// Access Component Inspector
const inspector = window.ReactExpress.DevTools.tools.get('componentInspector');

// Methods
inspector.toggleInspector();  // Start/Stop inspection mode
inspector.selectElement(element);  // Programmatically select an element
```

## Integration with Error Boundary

The DevTools integrate seamlessly with React-Express's Error Boundary system:

```javascript
window.ReactExpress.createErrorBoundary({
  onError: (error) => {
    // DevTools will automatically log the error
    console.error('Component error:', error);
  }
});
```

## Best Practices

1. **Development Only**: Consider disabling DevTools in production:
   ```javascript
   if (process.env.NODE_ENV === 'production') {
     window.ReactExpress.DevTools.disable();
   }
   ```

2. **Custom Tools**: Extend DevTools with your own debugging tools:
   ```javascript
   class CustomTool {
     initialize() {
       // Setup your tool
     }
     cleanup() {
       // Cleanup when disabled
     }
   }
   window.ReactExpress.DevTools.registerTool('customTool', new CustomTool());
   ```

3. **Performance**: The Component Inspector adds minimal overhead, but consider disabling it when measuring performance.

## Troubleshooting

Common issues and solutions:

1. **DevTools Not Appearing**
   - Ensure the bundle includes DevTools files
   - Check browser console for errors
   - Verify ReactExpress initialization

2. **Component Not Highlighting**
   - Verify component has `data-react-express-component` attribute
   - Check z-index conflicts
   - Ensure component is properly mounted

3. **State Not Updating**
   - Verify component ID is set
   - Check state management integration
   - Console log state changes

## Contributing

The DevTools system is extensible. To contribute:

1. Fork the repository
2. Create your feature branch
3. Add your tool to `/client/devtools/`
4. Update documentation
5. Submit a pull request

## Future Enhancements

Planned features for future releases:

- Performance profiling
- Network request monitoring
- State time-travel debugging
- Component tree visualization
- Custom theme support
