# Debug Logging Guide

The frontend has been configured with conditional debug logging to reduce console noise during development.

## Environment Variables

To enable debug logging, set these environment variables in your `.env.local` file:

```bash
# Enable auth-related debug logs
DEBUG_AUTH=true

# Enable platform/tenant context debug logs
DEBUG_PLATFORM=true

# Enable login form debug logs
DEBUG_LOGIN=true

# Enable CSRF service debug logs
DEBUG_CSRF=true
```

## Debug Categories

### `DEBUG_AUTH=true`
- AuthContext user profile fetching
- 401 authentication status checks
- ContextAwareLayout authentication redirects
- Secure login token processing

### `DEBUG_PLATFORM=true`
- PlatformContext initialization
- Host/subdomain detection logic
- Tenant context determination

### `DEBUG_LOGIN=true`
- LoginForm component mounting/unmounting
- Login attempt restoration after Fast Refresh
- Form state management

### `DEBUG_CSRF=true`
- CSRF token management
- Token clearing operations
- Protection initialization

## Usage

1. Create/edit `.env.local` in the frontend directory
2. Add the debug variables you want to enable
3. Restart the development server
4. Debug logs will appear in the browser console

## Clean Console by Default

Without these environment variables, the console will be clean and only show:
- Actual errors (not expected 401s)
- Critical warnings
- Turbopack hot reloading messages
- Network requests (from browser dev tools)

This provides a much cleaner development experience while still allowing detailed debugging when needed. 