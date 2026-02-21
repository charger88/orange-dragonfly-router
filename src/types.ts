export interface ODRouterOptions {
  caseSensitive: boolean
  separator: string
}

export interface RouteRecord<T = unknown> {
  pattern: string | RegExp
  pathPattern: string
  params: string[]
  methods: string[]
  integers: string[]
  routeObject: T
}

export interface ODRouterRouteResult<T = unknown> {
  path: string
  method: string
  params: Record<string, string | number>
  route: RouteRecord<T> | null
  route_object: T
  is_default: boolean
}
