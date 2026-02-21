# Orange Dragonfly Router

This package provides generic routing functionality. It is optimized for HTTP requests, but it can be used for other tasks as well.

## Installation

```
npm install orange-dragonfly-router
```

## Usage

### CommonJS

```javascript
const { ODRouter } = require('orange-dragonfly-router')
```

### ESM

```javascript
import { ODRouter } from 'orange-dragonfly-router'
```

### TypeScript

```typescript
import { ODRouter } from 'orange-dragonfly-router'
import type { ODRouterRouteResult } from 'orange-dragonfly-router'
```

The class supports a generic type parameter for route objects:

```typescript
const router = ODRouter.init<() => void>()
  .register('/users/{#id}', 'GET', () => console.log('user route'))
  .registerDefault(() => console.log('default route'))

const result = router.route('/users/15', 'GET')
result.route_object() // typed as () => void
```

## ODRouter

Main class of the package.

### Constructor

Creates a new router instance. Accepts an optional `options` object.

```javascript
const router = new ODRouter({ caseSensitive: true })
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `caseSensitive` | `boolean` | `false` | When `true`, path matching is case-sensitive. When `false` (default), `/Users` matches `/users`, `/USERS`, etc. |
| `separator` | `string` | `'/'` | Character used to split path segments. Change to `' '` (space) or another character for non-HTTP routing. Must not be empty. |

### `ODRouter.init`

Static singleton initiation method.

Returns link to the router object.

**Note:** `init()` returns a shared singleton instance. All calls to `init()` return the same router, regardless of the generic type parameter. Routes registered through one reference are visible to all others. If you need a fresh router, use `new ODRouter()` instead.

### `getOption`

Returns the value of the specified option.

* `option` - Option name (e.g. `'caseSensitive'`)

### `routes`

Returns registered routes in registration order.

Returns a shallow-copied array of route records, so mutating the returned array itself does not change router state.

### `setOption`

Sets the value of the specified option.

* `option` - Option name
* `value` - New value for the option

Returns link to object itself

**Note:** `caseSensitive` and `separator` affect how routes are compiled. Set these options before calling `register`.

### `setSeparator`

**Deprecated.** Use `setOption('separator', value)` instead.

Sets the separator character. Throws an error if the value is empty.

Returns link to object itself

### `register`

Registers path. Arguments:

* `pathPattern` Pattern with wildcards defined as {param_name} or {#param_name} (for integers)
* `methods` List of methods for the path (one path can be registered multiple times with different methods)
* `routeObject` Data to be returned as property "route_object" by method "route". It can be callback, object, string or however else you want to identify the route

Returns link to object itself

### `registerDefault`

Registers "route_object" for the default path. Arguments:

* `routeObject` Data to be returned as property "route_object" by method "route". It can be callback, object, string or however else you want to identify the route

Returns link to object itself

### `route`

Performs routing. Arguments:

* `path` Path (like /account/123/inbox)
* `method` HTTP method

Returns object:

* `path` - value provided as `path` argument
* `method` - value provided as `method` argument (transformed to uppercase)
* `params` - parameters extracted from the path
* `route` - route record object (or null if default route was used)
* `route_object` - Custom data registered via method `register`
* `is_default` - Shows if default route was used

Example:

```json
{
  "path": "/users/125/inbox",
  "method": "GET",
  "params": {"id": 125, "action": "inbox"},
  "route_object": "Custom data registered via method register",
  "is_default": false
}
```

## Example

```javascript
import { ODRouter } from 'orange-dragonfly-router'

ODRouter.init()
 .register('/users/{#id}', 'GET', () => console.log('user route'))
 .register('/users/{#id}/{action}', 'GET', () => console.log('user action route'))
 .register('/authorization', 'GET', () => console.log('authorization route'))
 .registerDefault(() => console.log('default route'))

function callbackForHTTPRequests(path, method) {
  const route = ODRouter.init().route(path, method);
  route.route_object();
  console.log(route.params);
}

callbackForHTTPRequests('/users/125', 'GET');

/*
Expected output:
"user route"
{"id": 125}
*/

```

See [tests](./tests/router.test.ts) for more examples
