This extension keeps your pinned tabs alive when using multiple windows.

When closing a window with pinned tabs, the pinned tabs will be copied to another window.

# Development
Builds have been tested in the following environments:
Node v18.4.0
Npm v8.12.1

It's likely to work with other versions of Node and npm as well.

## Building

```
npm install
npm run build
```

Build is placed in `/dist`

## Packaging

Note: this must have `zip` installed.

```
npm install
npm run package
```

Package is placed in `/package`

# Permissions
- Tabs: to access information about tabs & pinned tabs
- Cookies: When "transferring" tabs, we effectively recreate them, and copy over certain parameters. One of these is the `cookieStoreId`, which is e.g. needed for multi-account containers. We need the cookies permission to access this value.
- Storage: for persisting tab info between browser sessions (work in progress)
