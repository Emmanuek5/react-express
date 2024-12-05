// Animation utility for React Express
// Provides a simple API for handling animations with support for:
// - Fade in/out
// - Slide in/out
// - Scale
// - Custom keyframes
// - Animation queuing

class AnimationManager {
  constructor() {
    this.animations = new Map();
    this.defaultDuration = 300;
    this.defaultEasing = 'ease';
  }

  /**
   * Applies an animation to an element
   * @param {HTMLElement} element - The target element
   * @param {Object} options - Animation options
   * @returns {Promise} Resolves when animation completes
   */
  animate(element, options = {}) {
    const {
      type = 'fade',
      duration = this.defaultDuration,
      easing = this.defaultEasing,
      direction = 'in',
      delay = 0
    } = options;

    const animation = this._getAnimation(type, direction);
    
    return new Promise((resolve) => {
      element.style.animation = `${animation.name} ${duration}ms ${easing} ${delay}ms`;
      
      if (!this._hasKeyframes(animation.name)) {
        this._insertKeyframes(animation);
      }

      const cleanup = () => {
        element.style.animation = '';
        element.removeEventListener('animationend', onEnd);
        resolve();
      };

      const onEnd = () => cleanup();
      element.addEventListener('animationend', onEnd);
    });
  }

  /**
   * Creates a sequence of animations
   * @param {Array} sequence - Array of animation steps
   * @returns {Promise} Resolves when sequence completes
   */
  sequence(sequence) {
    return sequence.reduce(
      (promise, { element, ...options }) => 
        promise.then(() => this.animate(element, options)),
      Promise.resolve()
    );
  }

  /**
   * Fades an element in or out
   * @param {HTMLElement} element - The target element
   * @param {Object} options - Animation options
   */
  fade(element, options = {}) {
    return this.animate(element, { ...options, type: 'fade' });
  }

  /**
   * Slides an element in or out
   * @param {HTMLElement} element - The target element
   * @param {Object} options - Animation options
   */
  slide(element, options = {}) {
    return this.animate(element, { ...options, type: 'slide' });
  }

  /**
   * Scales an element
   * @param {HTMLElement} element - The target element
   * @param {Object} options - Animation options
   */
  scale(element, options = {}) {
    return this.animate(element, { ...options, type: 'scale' });
  }

  /**
   * Adds custom keyframes animation
   * @param {string} name - Animation name
   * @param {Object} keyframes - Keyframe definitions
   */
  addCustomAnimation(name, keyframes) {
    if (this._hasKeyframes(name)) return;
    
    const keyframeStr = this._generateKeyframeString(name, keyframes);
    this._insertStyleSheet(keyframeStr);
  }

  // Private methods
  _getAnimation(type, direction) {
    const animations = {
      fade: {
        in: {
          name: 'reactExpressFadeIn',
          keyframes: {
            from: { opacity: 0 },
            to: { opacity: 1 }
          }
        },
        out: {
          name: 'reactExpressFadeOut',
          keyframes: {
            from: { opacity: 1 },
            to: { opacity: 0 }
          }
        }
      },
      slide: {
        in: {
          name: 'reactExpressSlideIn',
          keyframes: {
            from: { transform: 'translateX(-100%)' },
            to: { transform: 'translateX(0)' }
          }
        },
        out: {
          name: 'reactExpressSlideOut',
          keyframes: {
            from: { transform: 'translateX(0)' },
            to: { transform: 'translateX(100%)' }
          }
        }
      },
      scale: {
        in: {
          name: 'reactExpressScaleIn',
          keyframes: {
            from: { transform: 'scale(0)' },
            to: { transform: 'scale(1)' }
          }
        },
        out: {
          name: 'reactExpressScaleOut',
          keyframes: {
            from: { transform: 'scale(1)' },
            to: { transform: 'scale(0)' }
          }
        }
      }
    };

    return animations[type][direction];
  }

  _hasKeyframes(name) {
    const styleSheets = document.styleSheets;
    for (let i = 0; i < styleSheets.length; i++) {
      try {
        const rules = styleSheets[i].cssRules;
        for (let j = 0; j < rules.length; j++) {
          if (rules[j].type === CSSRule.KEYFRAMES_RULE && rules[j].name === name) {
            return true;
          }
        }
      } catch (e) {
        continue; // Skip cross-origin stylesheets
      }
    }
    return false;
  }

  _insertKeyframes(animation) {
    const keyframeStr = this._generateKeyframeString(
      animation.name,
      animation.keyframes
    );
    this._insertStyleSheet(keyframeStr);
  }

  _generateKeyframeString(name, keyframes) {
    const keyframeDefinitions = Object.entries(keyframes)
      .map(([key, value]) => {
        const cssProperties = Object.entries(value)
          .map(([prop, val]) => `${prop}: ${val};`)
          .join(' ');
        return `${key} { ${cssProperties} }`;
      })
      .join(' ');

    return `@keyframes ${name} { ${keyframeDefinitions} }`;
  }

  _insertStyleSheet(css) {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
}

// Create singleton instance
const animations = new AnimationManager();

// Export animation utilities
export const animate = (element, options) => animations.animate(element, options);
export const fade = (element, options) => animations.fade(element, options);
export const slide = (element, options) => animations.slide(element, options);
export const scale = (element, options) => animations.scale(element, options);
export const sequence = (sequence) => animations.sequence(sequence);
export const addCustomAnimation = (name, keyframes) => 
  animations.addCustomAnimation(name, keyframes);

export default animations;
