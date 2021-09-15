# Orange Dragonfly Router

This package provides generic routing functionality. It is optimized for HTTP requests, but it can be used for other tasks as well.

## OrangeDragonflyRouter

Main class of the package is `Router`.

### `OrangeDragonflyRouter.init`

Static singleton initiation method.

Returns link to the router object.

### `setSeparator`

If you want to use this router for something other than HTTP routes, you may need to change separator from "/" to something else like " "

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
const { Router } = require('orange-dragonfly-router')

Router.init()
 .register('/users/{#id}', 'GET', () => console.log('user route'))
 .register('/users/{#id}/{action}', 'GET', () => console.log('user action route'))
 .register('/authorization', 'GET', () => console.log('authorization route'))
 .registerDefault(() => console.log('default route'))

function callbackForHTTPRequests(path, method) {
  const route = Router.init().route(path, method);
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

See [tests](./tests/router.test.js) for more examples