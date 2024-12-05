# Animations

React Express provides a powerful and easy-to-use animations system that allows you to add smooth transitions and effects to your components. The animations module offers both pre-built animations and the ability to create custom animations.

## Basic Usage

Import the animation utilities you need:

```javascript
import { fade, slide, scale, sequence, addCustomAnimation } from 'react-express';
```

## Built-in Animations

### Fade Animation

```javascript
// Fade in
fade(element, { direction: 'in', duration: 500 });

// Fade out
fade(element, { direction: 'out', duration: 300 });
```

### Slide Animation

```javascript
// Slide in from left
slide(element, { direction: 'in', duration: 500 });

// Slide out to right
slide(element, { direction: 'out', duration: 300 });
```

### Scale Animation

```javascript
// Scale up
scale(element, { direction: 'in', duration: 500 });

// Scale down
scale(element, { direction: 'out', duration: 300 });
```

## Animation Options

All animation methods accept an options object with the following properties:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| duration | number | 300 | Animation duration in milliseconds |
| direction | string | 'in' | Animation direction ('in' or 'out') |
| easing | string | 'ease' | CSS easing function |
| delay | number | 0 | Delay before animation starts (ms) |

## Animation Sequences

You can chain multiple animations together using the `sequence` function:

```javascript
sequence([
  { 
    element: headerElement, 
    type: 'fade', 
    direction: 'in' 
  },
  { 
    element: contentElement, 
    type: 'slide', 
    direction: 'in', 
    delay: 200 
  },
  { 
    element: footerElement, 
    type: 'scale', 
    direction: 'in', 
    delay: 400 
  }
]);
```

## Custom Animations

You can create custom animations using the `addCustomAnimation` function:

```javascript
// Add a bounce animation
addCustomAnimation('bounce', {
  '0%': { transform: 'translateY(0)' },
  '50%': { transform: 'translateY(-20px)' },
  '100%': { transform: 'translateY(0)' }
});

// Use the custom animation
animate(element, {
  type: 'bounce',
  duration: 1000,
  easing: 'ease-in-out'
});
```

## Advanced Usage

### Promise-based API

All animation methods return a Promise that resolves when the animation completes:

```javascript
async function animateContent() {
  await fade(element1, { direction: 'in' });
  await slide(element2, { direction: 'in' });
  console.log('Animations complete!');
}
```

### Multiple Elements

You can animate multiple elements simultaneously:

```javascript
Promise.all([
  fade(element1, { direction: 'in' }),
  slide(element2, { direction: 'in' }),
  scale(element3, { direction: 'in' })
]).then(() => {
  console.log('All animations complete!');
});
```

## Best Practices

1. **Performance**: Keep animations short and simple. Long or complex animations can impact performance.
2. **Timing**: Use appropriate durations. Most UI animations should be between 200-500ms.
3. **Easing**: Choose appropriate easing functions for natural-feeling animations.
4. **Accessibility**: Respect user preferences for reduced motion using CSS `@media (prefers-reduced-motion)`.

## Browser Support

The animations module uses the Web Animations API and CSS animations, which are supported in all modern browsers. For older browsers, consider adding appropriate polyfills.
