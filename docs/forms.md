# Forms System

The Forms System in React Express provides a simple yet powerful way to handle form submissions with minimal JavaScript. It offers automatic form handling, validation, data transformation, and state management integration.

## Basic Usage

Add the `data-react-form` attribute to your form with a unique identifier:

```html
<form data-react-form="login" method="POST" action="/api/login">
    <input name="username" required>
    <input name="password" type="password" required>
    <button type="submit">Login</button>
</form>
```

The Forms System will automatically:
- Prevent default form submission
- Serialize form data to JSON
- Send AJAX requests
- Handle responses and errors
- Update state (if configured)
- Trigger appropriate callbacks and events

## Data Attributes

| Attribute | Description | Required |
|-----------|-------------|----------|
| `data-react-form="formId"` | Unique identifier for the form | Yes |
| `data-validate` | Enable custom validation | No |
| `data-transform` | Name of function to transform data | No |
| `data-reset-on-success` | Reset form after successful submission | No |
| `data-update-state="stateKey"` | Update state after submission | No |
| `data-success="callbackName"` | Success callback function name | No |
| `data-error="callbackName"` | Error callback function name | No |

## Features

### 1. Custom Validation

Add the `data-validate` attribute and define a validation function:

```html
<form data-react-form="signup" data-validate>
    <!-- form fields -->
</form>

<script>
    function validateSignup(data) {
        if (!data.email.includes('@')) {
            return 'Invalid email address';
        }
        if (data.password.length < 8) {
            return 'Password must be at least 8 characters';
        }
        return true; // Return true if validation passes
    }
</script>
```

### 2. Data Transformation

Transform form data before submission using the `data-transform` attribute:

```html
<form data-react-form="profile" data-transform="transformProfileData">
    <!-- form fields -->
</form>

<script>
    function transformProfileData(data) {
        return {
            ...data,
            timestamp: new Date().toISOString(),
            fullName: `${data.firstName} ${data.lastName}`
        };
    }
</script>
```

### 3. State Integration

Update React Express state after successful form submission:

```html
<form 
    data-react-form="userSettings"
    data-update-state="currentUser"
>
    <!-- form fields -->
</form>
```

### 4. Success and Error Callbacks

Handle success and error cases with custom callbacks:

```html
<form 
    data-react-form="contact"
    data-success="handleContactSuccess"
    data-error="handleContactError"
>
    <!-- form fields -->
</form>

<script>
    function handleContactSuccess(result) {
        showNotification('Message sent successfully!');
    }

    function handleContactError(error) {
        showNotification('Failed to send message: ' + error.message);
    }
</script>
```

### 5. Event Handling

Listen for form submission events:

```javascript
const form = document.querySelector('form[data-react-form="contact"]');

form.addEventListener('formSuccess', (e) => {
    const { result, data } = e.detail;
    console.log('Form submitted successfully:', result);
});

form.addEventListener('formError', (e) => {
    const { error, data } = e.detail;
    console.error('Form submission failed:', error);
});
```

## Complete Example

Here's a complete example showcasing all features:

```html
<form 
    data-react-form="userProfile"
    method="POST"
    action="/api/profile"
    data-validate
    data-transform="transformProfileData"
    data-reset-on-success
    data-update-state="currentUser"
    data-success="handleProfileSuccess"
    data-error="handleProfileError"
>
    <input name="name" required>
    <input name="email" type="email" required>
    <input name="age" type="number" required>
    <button type="submit">Update Profile</button>
</form>

<script>
    // Validation
    function validateUserProfile(data) {
        if (!data.email.includes('@')) {
            return 'Invalid email address';
        }
        if (data.age < 18) {
            return 'Must be 18 or older';
        }
        return true;
    }

    // Data transformation
    function transformProfileData(data) {
        return {
            ...data,
            age: Number(data.age),
            timestamp: new Date().toISOString()
        };
    }

    // Success callback
    function handleProfileSuccess(result) {
        showNotification('Profile updated successfully!');
    }

    // Error callback
    function handleProfileError(error) {
        showNotification('Failed to update profile: ' + error.message);
    }

    // Event listeners
    const form = document.querySelector('form[data-react-form="userProfile"]');
    
    form.addEventListener('formSuccess', (e) => {
        const { result } = e.detail;
        console.log('Profile updated:', result);
    });

    form.addEventListener('formError', (e) => {
        const { error } = e.detail;
        console.error('Profile update failed:', error);
    });
</script>
```

## Best Practices

1. **Always Use Validation**: For sensitive operations, always include validation both on the client and server side.

2. **Handle Errors Gracefully**: Provide meaningful error messages to users through error callbacks or event listeners.

3. **Use Data Transformation**: When form fields need preprocessing before submission, use the transform feature instead of manual form handling.

4. **State Management**: Use the state integration feature to keep your UI in sync with form submissions.

5. **Event Handling**: For complex UI updates, use event listeners instead of callbacks for better separation of concerns.

## Technical Details

The Forms System:
- Uses the Fetch API for AJAX requests
- Automatically sets `Content-Type: application/json` and `X-Requested-With: XMLHttpRequest` headers
- Serializes form data to JSON before submission
- Supports all HTTP methods (GET, POST, PUT, DELETE, etc.)
- Automatically handles form discovery through MutationObserver
- Integrates with React Express's state management system
