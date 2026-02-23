# Orange Dragonfly Router

Lightweight path router for JavaScript/TypeScript applications.

It is optimized for HTTP-style routing, but it also supports non-HTTP matching by changing the path separator (for example, space-delimited commands).

## Features

- Static and parameterized routes
- Typed integer parameters (`{#id}`)
- Greedy proxy-style parameters that can include separators (`{+path}`)
- Case-sensitive or case-insensitive matching
- Custom separators (not only `/`)
- Route matching by method (`GET`, `POST`, `*`, etc.)
- Optional default route fallback
- TypeScript support with typed `route_object`

## Installation

```bash
npm install orange-dragonfly-router
```

Requirements:

- Node.js `>=18`

## Imports

### ESM

```javascript
import { ODRouter } from 'orange-dragonfly-router'
```

### CommonJS

```javascript
const { ODRouter } = require('orange-dragonfly-router')
```

### TypeScript

```typescript
import { ODRouter } from 'orange-dragonfly-router'
import type { ODRouterRouteResult, ODRouterOptions } from 'orange-dragonfly-router'
```

## Quick Start

```javascript
import { ODRouter } from 'orange-dragonfly-router'

const router = new ODRouter()
  .register('/users/{#id}', 'GET', 'user route')
  .register('/users/{#id}/{action}', 'GET', 'user action route')
  .register('/proxy/{+path}', 'GET', 'proxy route')
  .registerDefault('not found')

console.log(router.route('/users/42', 'GET'))
// => { path: '/users/42', method: 'GET', params: { id: 42 }, ... }

console.log(router.route('/proxy/images/icons/logo.svg', 'GET').params.path)
// => 'images/icons/logo.svg'
```

## Placeholder Syntax

Use placeholders inside `{}` in `pathPattern`:

| Placeholder | Meaning | Example match | Returned type |
| --- | --- | --- | --- |
| `{name}` | String parameter (does not include separator) | `/users/john` | `string` |
| `{#name}` | Integer parameter (`0-9+`) | `/users/123` | `number` |
| `{+name}` | Greedy string parameter (can include separator, proxy-style) | `/proxy/a/b/c` | `string` |

Examples:

```javascript
router.register('/users/{id}', 'GET', 'user by name')      // { id: 'alice' }
router.register('/users/{#id}', 'GET', 'user by id')       // { id: 42 }
router.register('/proxy/{+path}', 'GET', 'proxy handler')  // { path: 'a/b/c' }
```

Notes:

- Parameter names must be unique within one route pattern.
- `{+name}` is greedy and matches one or more characters.
- `{name}` and `{+name}` return strings; `{#name}` returns a number.

## API

### `ODRouter`

Main router class.

### `new ODRouter(options?)`

Creates a new router instance.

```javascript
const router = new ODRouter({ caseSensitive: true })
```

#### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `caseSensitive` | `boolean` | `false` | When `true`, path matching is case-sensitive. |
| `separator` | `string` | `'/'` | Segment separator. Use `' '` or another non-empty string for non-HTTP routing. |

Important:

- Set `caseSensitive` and `separator` before calling `register()`. Routes are compiled when registered.

### `ODRouter.init()`

Returns a shared singleton router instance.

```javascript
const router = ODRouter.init()
```

Important:

- `init()` always returns the same instance.
- Routes registered through one `init()` reference are visible through all others.
- Use `new ODRouter()` if you need an isolated router instance.

### `router.register(pathPattern, methods, routeObject)`

Registers a route.

Parameters:

- `pathPattern` (`string`): Route pattern, including optional placeholders.
- `methods` (`string | string[]`): HTTP method or list of methods. Values are normalized to uppercase. Use `'*'` to match any method.
- `routeObject` (`unknown`): Custom value returned as `route_object` from `route()`.

Returns:

- `this` (for chaining)

Example:

```javascript
router
  .register('/users/{#id}', 'GET', 'get user')
  .register('/users/{#id}', ['PUT', 'PATCH'], 'update user')
  .register('/health', '*', 'health')
```

### `router.registerDefault(routeObject)`

Registers a fallback route object used when no route matches.

Returns:

- `this` (for chaining)

### `router.route(path, method)`

Matches a path + method and returns a route result object.

Parameters:

- `path` (`string`)
- `method` (`string`)

Returns (`ODRouterRouteResult<T>`):

```ts
{
  path: string
  method: string
  params: Record<string, string | number>
  route: object | null
  route_object: T
  is_default: boolean
}
```

Behavior:

- `method` is matched case-insensitively (internally converted to uppercase).
- Trailing separators are trimmed before matching (`/users/42/` matches `/users/{#id}`).
- If no route matches and no default route is registered, `route()` throws an error.
- `route` is the matched route record (or `null` when the default route is used).

### `router.getOption(option)`

Returns the current option value.

### `router.setOption(option, value)`

Updates an option and returns `this`.

```javascript
router.setOption('caseSensitive', true)
router.setOption('separator', '.')
```

### `router.setSeparator(separator)` (deprecated)

Deprecated alias for:

```javascript
router.setOption('separator', separator)
```

### `router.routes`

Returns the registered route records in registration order.

The returned array is a shallow copy, so mutating the array itself does not mutate router state.

## TypeScript Example (Typed `route_object`)

```typescript
import { ODRouter } from 'orange-dragonfly-router'

type Handler = () => void

const router = new ODRouter<Handler>()
  .register('/users/{#id}', 'GET', () => console.log('user route'))
  .registerDefault(() => console.log('default route'))

const result = router.route('/users/15', 'GET')
result.route_object() // typed as Handler
```

## Non-HTTP Example (Custom Separator)

```javascript
const router = new ODRouter({ separator: ' ' })
  .register('order {#qty} {item}', '', 'order')
  .register('say hello', '', 'hello')
  .registerDefault('unknown')

console.log(router.route('order 3 pizzas', '').params)
// => { qty: 3, item: 'pizzas' }
```

## Matching Rules and Notes

- Routes are checked in registration order.
- The first matching route wins.
- Duplicate parameter names in one pattern throw an error.
- `separator` must not be empty.
- Static route matching respects `caseSensitive`.

## More Examples

See [`tests/router.test.ts`](./tests/router.test.ts) for additional usage and edge cases.
