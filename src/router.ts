import type { RouterOptions, RouteRecord, RouteResult } from './types'

const DEFAULT_OPTIONS: RouterOptions = {
  caseSensitive: false,
  separator: '/',
}

const OPTION_VALIDATORS: { [K in keyof RouterOptions]?: (value: RouterOptions[K]) => void } = {
  separator(value: string) {
    if (!value) throw new Error('Option "separator" must not be empty')
  },
}

/**
 * Class implements generic routing functionality
 * It is optimized for HTTP requests, but it can be used for other tasks as well
 */
export class OrangeDragonflyRouter<T = unknown> {
  private readonly _EXTRACT_PATH_PARAMS: RegExp
  private readonly _ESCAPE_CHARACTERS: RegExp
  private _routes: RouteRecord<T>[]
  private _defaultRouteObject: T | null
  private _options: RouterOptions

  private static _router?: OrangeDragonflyRouter

  /**
   * Creates a new router instance
   * @param options - Partial router options to override defaults
   * @throws {Error} If any provided option value fails validation
   */
  constructor(options?: Partial<RouterOptions>) {
    this._EXTRACT_PATH_PARAMS = /{[#a-zA-Z0-9_.-]+}/g
    this._ESCAPE_CHARACTERS = /[.+*?^$|()[\]{}]/g
    this._routes = []
    this._defaultRouteObject = null
    this._options = { ...DEFAULT_OPTIONS, ...options }
    for (const [key, value] of Object.entries(this._options)) {
      const validator = OPTION_VALIDATORS[key as keyof RouterOptions] as ((v: unknown) => void) | undefined
      if (validator) validator(value)
    }
  }

  /**
   * Returns singleton router instance, creating one if it doesn't exist
   * @returns Shared router instance
   */
  static init<U = unknown>(): OrangeDragonflyRouter<U> {
    if (!this._router) this._router = new this()
    return this._router as OrangeDragonflyRouter<U>
  }

  /**
   * Returns the value of the specified option
   * @param option - Option name
   * @returns Current value of the option
   */
  getOption<K extends keyof RouterOptions>(option: K): RouterOptions[K] {
    return this._options[option]
  }

  /**
   * Sets the value of the specified option
   * @param option - Option name
   * @param value - New value for the option
   * @returns This router instance for method chaining
   * @throws {Error} If the value fails validation
   */
  setOption<K extends keyof RouterOptions>(option: K, value: RouterOptions[K]): this {
    const validator = OPTION_VALIDATORS[option] as ((v: RouterOptions[K]) => void) | undefined
    if (validator) validator(value)
    this._options[option] = value
    return this
  }

  /**
   * Sets the separator character for path segments
   * @param separator - Separator string (must not be empty)
   * @returns This router instance for method chaining
   * @throws {Error} If separator is empty
   * @deprecated Use setOption('separator', value) instead
   */
  setSeparator(separator: string): this {
    return this.setOption('separator', separator)
  }

  /**
   * Registers a route pattern
   * @param pathPattern - Pattern with wildcards defined as {param_name} or {#param_name} (for integers)
   * @param methods - HTTP method(s) for this route (e.g. 'GET', ['GET', 'POST'], or '*' for all)
   * @param routeObject - Data returned as "route_object" by {@link route}. Can be a callback, object, string, or any value
   * @returns This router instance for method chaining
   */
  register(pathPattern: string, methods: string | string[], routeObject: T): this {
    if (!Array.isArray(methods)) methods = [methods]
    methods = methods.map(v => v.toUpperCase())
    const paramNames = pathPattern.match(this._EXTRACT_PATH_PARAMS)
    const integers: string[] = []
    const params: string[] = []
    let pattern: string | RegExp
    if (paramNames) {
      pattern = pathPattern.replace(this._ESCAPE_CHARACTERS, x => `\\${x}`)
      for (let pName of paramNames) {
        pattern = pattern.replace(pName.replace('{', '\\{').replace('}', '\\}'), pName)
        if (pName.startsWith('{#')) {
          pattern = pattern.replace(pName, '([0-9]+)')
          pName = pName.slice(2, -1)
          integers.push(pName)
        } else {
          pattern = pattern.replace(pName, `([^${this._options.separator}]+)`)
          pName = pName.slice(1, -1)
        }
        if (params.includes(pName)) {
          throw new Error(`Parameters duplication in the route ${pathPattern}`)
        }
        params.push(pName)
      }
      pattern = new RegExp(`^${pattern}$`, this._options.caseSensitive ? '' : 'i')
    } else {
      pattern = pathPattern
    }
    this._routes.push({ pattern, pathPattern, params, methods, integers, routeObject })
    return this
  }

  /**
   * Registers the fallback route used when no other route matches
   * @param routeObject - Data returned as "route_object" by {@link route} when no pattern matches
   * @returns This router instance for method chaining
   */
  registerDefault(routeObject: T): this {
    this._defaultRouteObject = routeObject
    return this
  }

  /**
   * Resolves a path and method to a registered route
   * @param path - URL path to match (e.g. "/users/123/inbox")
   * @param method - HTTP method (case-insensitive)
   * @returns Route result containing matched route data, extracted params, and route object
   * @throws {Error} If no route matches and no default route is registered
   */
  route(path: string, method: string): RouteResult<T> {
    while (path.endsWith(this._options.separator) && (path.length > 1)) path = path.slice(0, -1)
    method = method.toUpperCase()
    let routeMatch: RouteRecord<T> | null
    let params: Record<string, string | number>
    let match: RegExpMatchArray | null
    for (const route of this._routes) {
      routeMatch = null
      params = {}
      if (typeof route.pattern === 'string') {
        const isMatch = this._options.caseSensitive ? route.pattern === path : route.pattern.toLowerCase() === path.toLowerCase()
        if (isMatch) routeMatch = route
      } else {
        match = path.match(route.pattern)
        if (match) {
          const groups = Array.from(match).slice(1)
          groups.forEach((v, i) => {
            params[route.params[i]] = route.integers.includes(route.params[i]) ? parseInt(v, 10) : v
          })
          routeMatch = route
        }
      }
      if (routeMatch) {
        if (route.methods.includes(method) || route.methods.includes('*')) {
          return { path, method, params, route: { ...route }, route_object: route.routeObject, is_default: false }
        }
      }
    }
    if (this._defaultRouteObject !== null) return { path, method, params: {}, route: null, route_object: this._defaultRouteObject, is_default: true }
    throw new Error('Route not found, default route is not defined')
  }
}
