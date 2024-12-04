// React Express Forms - Easy form handling and validation
class FormSystem {
    constructor() {
        this.forms = new Map();
        this.initializeForms();
    }

    initializeForms() {
        // Find all forms with data-react-form attribute
        document.querySelectorAll('form[data-react-form]').forEach(form => {
            this.setupForm(form);
        });

        // Set up a mutation observer to watch for new forms
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.matches('form[data-react-form]')) {
                        this.setupForm(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    setupForm(form) {
        const formId = form.getAttribute('data-react-form');
        if (this.forms.has(formId)) return;

        // Get form configuration from data attributes
        const config = {
            method: form.getAttribute('method')?.toLowerCase() || 'post',
            action: form.getAttribute('action') || window.location.pathname,
            validate: form.hasAttribute('data-validate'),
            transform: form.hasAttribute('data-transform'),
            resetOnSuccess: form.hasAttribute('data-reset-on-success'),
            updateState: form.getAttribute('data-update-state'),
            successCallback: form.getAttribute('data-success'),
            errorCallback: form.getAttribute('data-error')
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit(form, config);
        });

        this.forms.set(formId, { form, config });
    }

    async handleSubmit(form, config) {
        try {
            // Get form data
            const formData = new FormData(form);
            let data = Object.fromEntries(formData);

            // Apply custom transform if specified
            if (config.transform) {
                const transformFn = window[config.transform];
                if (typeof transformFn === 'function') {
                    data = transformFn(data);
                }
            }

            // Validate if required
            if (config.validate) {
                const validateFn = window[`validate${form.getAttribute('data-react-form')}`];
                if (typeof validateFn === 'function') {
                    const validationResult = validateFn(data);
                    if (validationResult !== true) {
                        throw new Error(validationResult || 'Validation failed');
                    }
                }
            }

            // Send the request
            const response = await fetch(config.action, {
                method: config.method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Update state if specified
            if (config.updateState) {
                const stateKey = config.updateState;
                ReactExpress.setState(stateKey, result, { sync: true });
            }

            // Reset form if specified
            if (config.resetOnSuccess) {
                form.reset();
            }

            // Call success callback if specified
            if (config.successCallback && typeof window[config.successCallback] === 'function') {
                window[config.successCallback](result);
            }

            // Dispatch success event
            form.dispatchEvent(new CustomEvent('formSuccess', { 
                detail: { result, data } 
            }));

        } catch (error) {
            console.error('Form submission error:', error);

            // Call error callback if specified
            if (config.errorCallback && typeof window[config.errorCallback] === 'function') {
                window[config.errorCallback](error);
            }

            // Dispatch error event
            form.dispatchEvent(new CustomEvent('formError', { 
                detail: { error, data } 
            }));
        }
    }

    // Helper method to get form instance
    getForm(formId) {
        return this.forms.get(formId);
    }
}

// Initialize forms system
window.ReactExpress = window.ReactExpress || {};
window.ReactExpress.forms = new FormSystem();
