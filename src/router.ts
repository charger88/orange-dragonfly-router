import type { ODRouterOptions, RouteRecord, ODRouterRouteResult } from './types'

type InternalRouteRecord<T = unknown> = RouteRecord<T> & {
  staticLowerCasePattern: string | null
  integerParams: boolean[]
  hasWildcardMethod: boolean
  isProxy: boolean
}

const DEFAULT_OPTIONS: ODRouterOptions = {
  caseSensitive: false,
  separator: '/',
}

const OPTION_VALIDATORS: { [K in keyof ODRouterOptions]?: (value: ODRouterOptions[K]) => void } = {
  separator(value: string) {
    if (!value) throw new Error('Option "separator" must not be empty')
  },
}

/**
 * Class implements generic routing functionality
 * It is optimized for HTTP requests, but it can be used for other tasks as well
 */
export class ODRouter<T = unknown> {
  private readonly _EXTRACT_PATH_PARAMS: RegExp
  private _routes: InternalRouteRecord<T>[]
  private _defaultRouteObject: T | null
  private _options: ODRouterOptions

  private static _router?: ODRouter

  /**
   * Creates a new router instance
   * @param options - Partial router options to override defaults
   * @throws {Error} If any provided option value fails validation
   */
  constructor(options?: Partial<ODRouterOptions>) {
    this._EXTRACT_PATH_PARAMS = /{[#+a-zA-Z0-9_.-]+}/g
    this._routes = []
    this._defaultRouteObject = null
    this._options = { ...DEFAULT_OPTIONS, ...options }
    for (const [key, value] of Object.entries(this._options)) {
      const validator = OPTION_VALIDATORS[key as keyof ODRouterOptions] as ((v: unknown) => void) | undefined
      if (validator) validator(value)
    }
  }

  private _cloneRouteRecord(route: RouteRecord<T>): RouteRecord<T> {
    return {
      pattern: typeof route.pattern === 'string' ? route.pattern : new RegExp(route.pattern.source, route.pattern.flags),
      pathPattern: route.pathPattern,
      params: [...route.params],
      methods: [...route.methods],
      integers: [...route.integers],
      routeObject: route.routeObject,
    }
  }

  private _escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  private _buildSegmentPattern(): string {
    const separator = this._escapeRegex(this._options.separator)
    return `((?:(?!${separator}).)+)`
  }

  /**
   * Returns singleton router instance, creating one if it doesn't exist
   * @returns Shared router instance
   */
  static init<U = unknown>(): ODRouter<U> {
    if (!this._router) this._router = new this()
    return this._router as ODRouter<U>
  }

  /**
   * Returns the value of the specified option
   * @param option - Option name
   * @returns Current value of the option
   */
  getOption<K extends keyof ODRouterOptions>(option: K): ODRouterOptions[K] {
    return this._options[option]
  }

  /**
   * Returns registered routes in registration order
   * @returns Shallow copy of registered route records
   */
  get routes(): RouteRecord<T>[] {
    return this._routes.map(route => this._cloneRouteRecord(route))
  }

  /**
   * Sets the value of the specified option
   * @param option - Option name
   * @param value - New value for the option
   * @returns This router instance for method chaining
   * @throws {Error} If the value fails validation
   */
  setOption<K extends keyof ODRouterOptions>(option: K, value: ODRouterOptions[K]): this {
    const validator = OPTION_VALIDATORS[option] as ((v: ODRouterOptions[K]) => void) | undefined
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
   * @param pathPattern - Pattern with wildcards defined as {param_name}, {#param_name} (for integers), or {+param_name} (string incl. separators)
   * @param methods - HTTP method(s) for this route (e.g. 'GET', ['GET', 'POST'], or '*' for all)
   * @param routeObject - Data returned as "route_object" by {@link route}. Can be a callback, object, string, or any value
   * @returns This router instance for method chaining
   */
  register(pathPattern: string, methods: string | string[], routeObject: T): this {
    if (!Array.isArray(methods)) methods = [methods]
    methods = methods.map(v => v.toUpperCase())
    const hasWildcardMethod = methods.includes('*')
    const paramNames = pathPattern.match(this._EXTRACT_PATH_PARAMS)
    const integers: string[] = []
    const params: string[] = []
    const integerParams: boolean[] = []
    let staticLowerCasePattern: string | null = null
    let pattern: string | RegExp
    if (paramNames) {
      pattern = this._escapeRegex(pathPattern)
      for (let pName of paramNames) {
        let isInteger = false
        pattern = pattern.replace(this._escapeRegex(pName), pName)
        if (pName.startsWith('{#')) {
          pattern = pattern.replace(pName, '([0-9]+)')
          pName = pName.slice(2, -1)
          integers.push(pName)
          isInteger = true
        } else if (pName.startsWith('{+')) {
          pattern = pattern.replace(pName, '(.+)')
          pName = pName.slice(2, -1)
        } else {
          pattern = pattern.replace(pName, () => this._buildSegmentPattern())
          pName = pName.slice(1, -1)
        }
        if (params.includes(pName)) {
          throw new Error(`Parameters duplication in the route ${pathPattern}`)
        }
        params.push(pName)
        integerParams.push(isInteger)
      }
      pattern = new RegExp(`^${pattern}$`, this._options.caseSensitive ? '' : 'i')
    } else {
      pattern = pathPattern
      staticLowerCasePattern = pathPattern.toLowerCase()
    }
    this._routes.push({
      pattern,
      pathPattern,
      params,
      methods,
      integers,
      routeObject,
      staticLowerCasePattern,
      integerParams,
      hasWildcardMethod,
      isProxy: pathPattern.includes('{+'),
    })
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
  route(path: string, method: string): ODRouterRouteResult<T> {
    const separator = this._options.separator
    const separatorLength = separator.length
    while (path.endsWith(separator) && (path.length > separatorLength)) path = path.slice(0, -separatorLength)
    method = method.toUpperCase()
    const caseSensitive = this._options.caseSensitive
    const normalizedPath = caseSensitive ? path : path.toLowerCase()
    let deferredProxyMatch: InternalRouteRecord<T> | null = null
    let deferredProxyParams: Record<string, string | number> = {}
    let routeMatch: RegExpMatchArray | null | boolean
    for (const route of this._routes) {
      if (typeof route.pattern === 'string') {
        routeMatch = caseSensitive ? route.pattern === path : route.staticLowerCasePattern === normalizedPath
      } else {
        routeMatch = path.match(route.pattern)
      }
      if (routeMatch) {
        if (route.hasWildcardMethod || route.methods.includes(method)) {
          const params: Record<string, string | number> = {}
          if (Array.isArray(routeMatch)) {
            for (let i = 1; i < routeMatch.length; i++) {
              const paramIndex = i - 1
              const value = routeMatch[i]
              params[route.params[paramIndex]] = route.integerParams[paramIndex] ? parseInt(value, 10) : value
            }
          }
          if (route.isProxy) {
            if (!deferredProxyMatch) {
              deferredProxyMatch = route
              deferredProxyParams = params
            }
            continue
          }
          return { path, method, params, route: this._cloneRouteRecord(route), route_object: route.routeObject, is_default: false }
        }
      }
    }
    if (deferredProxyMatch) {
      return {
        path,
        method,
        params: deferredProxyParams,
        route: this._cloneRouteRecord(deferredProxyMatch),
        route_object: deferredProxyMatch.routeObject,
        is_default: false,
      }
    }
    if (this._defaultRouteObject !== null) return { path, method, params: {}, route: null, route_object: this._defaultRouteObject, is_default: true }
    throw new Error('Route not found, default route is not defined')
  }
}
