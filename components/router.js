/**
 * Class implements generic routing functionality
 * It is optimized for HTTP requests, but it can be used for other tasks as well
 */
class OrangeDragonflyRouter {
  /**
   * Create router
   */
  constructor () {
    this._EXTRACT_PATH_PARAMS = /{[#a-zA-Z0-9_.-]+}/g
    this._ESCAPE_CHARACTERS = /[.+*?^$()[\]{}]/g
    this._routes = []
    this._defaultRouteObject = null
    this._separator = '/'
  }

  /**
   * Singleton init method
   * @return {OrangeDragonflyRouter}
   */
  static init () {
    if (!this._router) this._router = new this()
    return this._router
  }

  /**
   * If you want to use this router for something other than HTTP routes, you may need to change separator from "/" to something else like " "
   * @param separator
   * @return {OrangeDragonflyRouter}
   */
  setSeparator (separator) {
    this._separator = separator
    return this
  }

  /**
   * Registers path
   * @param {string} pathPattern Pattern with wildcards defined as {param_name} or {#param_name} (for integers)
   * @param {string|string[]} methods List of methods for the path (one path can be registered multiple times with different methods)
   * @param {*} routeObject Data to be returned as property "route_object" by method "route". It can be callback, object, string or however else you want to identify the route
   * @return {OrangeDragonflyRouter}
   */
  register (pathPattern, methods, routeObject) {
    if (!Array.isArray(methods)) methods = [methods]
    methods = methods.map(v => v.toUpperCase())
    const paramNames = pathPattern.match(this._EXTRACT_PATH_PARAMS)
    const integers = []
    const params = []
    let pattern
    if (paramNames) {
      pattern = pathPattern.replace(this._ESCAPE_CHARACTERS, x => `\\${x}`)
      for (let pName of paramNames) {
        pattern = pattern.replace(pName.replace('{', '\\{').replace('}', '\\}'), pName)
        if (pName.startsWith('{#')) {
          pattern = pattern.replace(pName, '([0-9]+)')
          pName = pName.slice(2, -1)
          integers.push(pName)
        } else {
          pattern = pattern.replace(pName, `([^${this._separator}]+)`)
          pName = pName.slice(1, -1)
        }
        params.push(pName)
      }
      pattern = new RegExp(`^${pattern}$`)
    } else {
      pattern = pathPattern
    }
    this._routes.push({ pattern, params, methods, integers, routeObject })
    return this
  }

  /**
   * Registers "route_object" for the default path
   * @param {*} routeObject Data to be returned as property "route_object" by method "route". It can be callback, object, string or however else you want to identify the route
   * @return {OrangeDragonflyRouter}
   */
  registerDefault (routeObject) {
    this._defaultRouteObject = routeObject
    return this
  }

  /**
   * Performs routing
   * @param {string} path Path (like /account/123/inbox)
   * @param {string} method HTTP method
   * @return {{path: string, method: string, params: Object, route_object: *, is_default: boolean}}
   */
  route (path, method) {
    while (path.endsWith(this._separator) && (path.length > 1)) path = path.slice(0, -1)
    method = method.toUpperCase()
    let routeMatch, params, match
    for (const route of this._routes) {
      routeMatch = null
      params = {}
      if (typeof route.pattern === 'string') {
        if (route.pattern === path) routeMatch = route
      } else {
        match = path.match(route.pattern)
        if (match) {
          for (let i = 1; i <= match.length; i++) {
            params[route.params[i - 1]] = route.integers.includes(route.params[i - 1]) ? parseInt(match[i]) : match[i]
          }
          routeMatch = route
        }
      }
      if (routeMatch) {
        if (route.methods.includes(method) || route.methods.includes('*')) {
          return { path, method, params, route_object: route.routeObject, is_default: false }
        }
      }
    }
    if (this._defaultRouteObject) return { path, method, params: {}, route_object: this._defaultRouteObject, is_default: true }
    throw new Error('Route not found, default route is not defined')
  }
}

module.exports = OrangeDragonflyRouter
