import { ODRouter } from '../src/index'

const generateRouter = () => {
  return ODRouter.init<string>()
    .register('/users/{#id}', 'GET', 'user route')
    .register('/users/{#id}/{action}', 'GET', 'user action route')
    .register('/authorization', 'GET', 'authorization route')
    .registerDefault('default route')
}

test('successful routing', () => {
  const router = generateRouter()

  expect(router.route('/users/15/test', 'get').route_object).toBe('user action route')
  expect(router.route('/users/15/test/', 'get').route_object).toBe('user action route')
  expect(router.route('/users/15', 'get').route_object).toBe('user route')
  expect(router.route('/users/15/', 'get').route_object).toBe('user route')
  expect(router.route('/authorization', 'get').route_object).toBe('authorization route')
  expect(router.route('/test', 'get').route_object).toBe('default route')
  expect(router.route('/users/15', 'post').route_object).toBe('default route')
  expect(router.route('/', 'get').route_object).toBe('default route')
  expect(router.route('/users/test/15', 'get').route_object).toBe('default route')
  expect(router.route('/users/15a', 'get').route_object).toBe('default route')
})

test('successful params', () => {
  const router = generateRouter()
  expect(Object.keys(router.route('/users/15', 'get').params)).toEqual(['id'])
  expect(router.route('/users/15', 'get').params.id).toBe(15)
  expect(router.route('/users/15/', 'get').params.id).toBe(15)
  expect(router.route('/users/15/test', 'get').params.id).toBe(15)
  expect(router.route('/users/15/test', 'get').params.action).toBe('test')
  expect(router.route('/users/15/test/', 'get').params.action).toBe('test')
})

test('original pattern', () => {
  const router = generateRouter()
  expect(router.route('/users/15', 'get').route!.pathPattern).toBe('/users/{#id}')
})

test('not HTTP scenario', () => {
  const router = ODRouter.init<string>()
    .setOption('separator', ' ')
    .register('I want to order {#n} {item} {time}', '', 'Food order with date')
    .register('I want to order {#n} {item}', '', 'Food order')
    .register('Call the manager', '', 'Oops')
    .registerDefault('Unknown request')

  expect(router.route('Test', '').route_object).toBe('Unknown request')
  expect(router.route('Call the manager', '').route_object).toBe('Oops')
  expect(router.route('I want to order 10 pizzas', '').route_object).toBe('Food order')
  expect(router.route('I want to order 10 pizzas', '').params.n).toBe(10)
  expect(router.route('I want to order 10 pizzas', '').params.item).toBe('pizzas')
  expect(router.route('I want to order 5 hamburgers tomorrow', '').route_object).toBe('Food order with date')
  expect(router.route('I want to order 5 hamburgers tomorrow', '').params.n).toBe(5)
  expect(router.route('I want to order 5 hamburgers tomorrow', '').params.item).toBe('hamburgers')
  expect(router.route('I want to order 5 hamburgers tomorrow', '').params.time).toBe('tomorrow')
})

test('routes getter returns registered routes in order', () => {
  const router = new ODRouter<string>()
    .register('/users/{#id}', 'GET', 'user route')
    .register('/authorization', ['GET', 'POST'], 'authorization route')

  const routes = router.routes

  expect(routes).toHaveLength(2)
  expect(routes[0].pathPattern).toBe('/users/{#id}')
  expect(routes[0].routeObject).toBe('user route')
  expect(routes[1].pathPattern).toBe('/authorization')
  expect(routes[1].methods).toEqual(['GET', 'POST'])

  routes.pop()
  expect(router.routes).toHaveLength(2)
})

test('route not found without default throws error', () => {
  const router = new ODRouter<string>()
    .register('/test', 'GET', 'test')

  expect(() => router.route('/missing', 'GET')).toThrow('Route not found, default route is not defined')
})

test('wildcard method *', () => {
  const router = new ODRouter<string>()
    .register('/any', '*', 'wildcard route')

  expect(router.route('/any', 'GET').route_object).toBe('wildcard route')
  expect(router.route('/any', 'POST').route_object).toBe('wildcard route')
  expect(router.route('/any', 'DELETE').route_object).toBe('wildcard route')
})

test('multiple methods as array', () => {
  const router = new ODRouter<string>()
    .register('/resource', ['GET', 'POST'], 'multi-method route')
    .registerDefault('default')

  expect(router.route('/resource', 'GET').route_object).toBe('multi-method route')
  expect(router.route('/resource', 'POST').route_object).toBe('multi-method route')
  expect(router.route('/resource', 'DELETE').route_object).toBe('default')
})

test('method matching is case-insensitive', () => {
  const router = new ODRouter<string>()
    .register('/test', 'get', 'found')

  expect(router.route('/test', 'GET').route_object).toBe('found')
  expect(router.route('/test', 'get').route_object).toBe('found')
  expect(router.route('/test', 'Get').route_object).toBe('found')
})

test('route result has correct structure', () => {
  const router = new ODRouter<string>()
    .register('/users/{#id}', 'GET', 'user')
    .registerDefault('default')

  const matched = router.route('/users/42', 'GET')
  expect(matched.path).toBe('/users/42')
  expect(matched.method).toBe('GET')
  expect(matched.params).toEqual({ id: 42 })
  expect(matched.route_object).toBe('user')
  expect(matched.is_default).toBe(false)
  expect(matched.route).not.toBeNull()

  const defaulted = router.route('/missing', 'GET')
  expect(defaulted.path).toBe('/missing')
  expect(defaulted.method).toBe('GET')
  expect(defaulted.params).toEqual({})
  expect(defaulted.route_object).toBe('default')
  expect(defaulted.is_default).toBe(true)
  expect(defaulted.route).toBeNull()
})

test('duplicate route registration uses first match', () => {
  const router = new ODRouter<string>()
    .register('/test', 'GET', 'first')
    .register('/test', 'GET', 'second')

  expect(router.route('/test', 'GET').route_object).toBe('first')
})

test('same path with different methods', () => {
  const router = new ODRouter<string>()
    .register('/resource', 'GET', 'get handler')
    .register('/resource', 'POST', 'post handler')

  expect(router.route('/resource', 'GET').route_object).toBe('get handler')
  expect(router.route('/resource', 'POST').route_object).toBe('post handler')
})

test('pipe character in path pattern is escaped', () => {
  const router = new ODRouter<string>()
    .register('/a|b', 'GET', 'literal pipe')
    .registerDefault('default')

  expect(router.route('/a|b', 'GET').route_object).toBe('literal pipe')
  expect(router.route('/a', 'GET').route_object).toBe('default')
  expect(router.route('/b', 'GET').route_object).toBe('default')
})

test('root path routing', () => {
  const router = new ODRouter<string>()
    .register('/', 'GET', 'root')

  expect(router.route('/', 'GET').route_object).toBe('root')
})

test('case-insensitive routing by default (static pattern)', () => {
  const router = new ODRouter<string>()
    .register('/Users', 'GET', 'users')
    .registerDefault('default')

  expect(router.route('/users', 'GET').route_object).toBe('users')
  expect(router.route('/USERS', 'GET').route_object).toBe('users')
  expect(router.route('/Users', 'GET').route_object).toBe('users')
})

test('case-insensitive routing by default (parameterized pattern)', () => {
  const router = new ODRouter<string>()
    .register('/Users/{#id}/Profile', 'GET', 'profile')
    .registerDefault('default')

  expect(router.route('/users/42/profile', 'GET').route_object).toBe('profile')
  expect(router.route('/USERS/42/PROFILE', 'GET').route_object).toBe('profile')
  expect(router.route('/Users/42/Profile', 'GET').route_object).toBe('profile')
})

test('case-sensitive routing with option (static pattern)', () => {
  const router = new ODRouter<string>({ caseSensitive: true })
    .register('/Users', 'GET', 'users')
    .registerDefault('default')

  expect(router.route('/Users', 'GET').route_object).toBe('users')
  expect(router.route('/users', 'GET').route_object).toBe('default')
  expect(router.route('/USERS', 'GET').route_object).toBe('default')
})

test('case-sensitive routing with option (parameterized pattern)', () => {
  const router = new ODRouter<string>({ caseSensitive: true })
    .register('/Users/{#id}/Profile', 'GET', 'profile')
    .registerDefault('default')

  expect(router.route('/Users/42/Profile', 'GET').route_object).toBe('profile')
  expect(router.route('/users/42/profile', 'GET').route_object).toBe('default')
})

test('duplicated parameters trigger error', () => {
  const router = new ODRouter()
  expect(() => router.register('/test/{id}/value/{id}', 'GET', 'test value')).toThrow('Parameters duplication in the route /test/{id}/value/{id}')
})

test('duplicated parameters trigger error even with #', () => {
  const router = new ODRouter()
  expect(() => router.register('/test/{#id}/value/{id}', 'GET', 'test value')).toThrow('Parameters duplication in the route /test/{#id}/value/{id}')
})

test('getOption returns current option value', () => {
  const router = new ODRouter<string>()
  expect(router.getOption('caseSensitive')).toBe(false)

  const routerSensitive = new ODRouter<string>({ caseSensitive: true })
  expect(routerSensitive.getOption('caseSensitive')).toBe(true)
})

test('setOption updates option value', () => {
  const router = new ODRouter<string>()
  expect(router.getOption('caseSensitive')).toBe(false)

  router.setOption('caseSensitive', true)
  expect(router.getOption('caseSensitive')).toBe(true)
})

test('setOption returns this for chaining', () => {
  const router = new ODRouter<string>()
    .setOption('caseSensitive', true)
    .register('/test', 'GET', 'found')

  expect(router.route('/test', 'GET').route_object).toBe('found')
})

test('separator option via constructor', () => {
  const router = new ODRouter<string>({ separator: ' ' })
    .register('hello {name}', '', 'greeting')

  expect(router.route('hello world', '').route_object).toBe('greeting')
  expect(router.route('hello world', '').params.name).toBe('world')
  expect(router.getOption('separator')).toBe(' ')
})

test('separator option via setOption', () => {
  const router = new ODRouter<string>()
    .setOption('separator', '.')
    .register('com.example.{action}', '', 'java style')

  expect(router.route('com.example.run', '').route_object).toBe('java style')
  expect(router.route('com.example.run', '').params.action).toBe('run')
})

test('setSeparator still works (deprecated)', () => {
  const router = new ODRouter<string>()
    .setSeparator(' ')
    .register('ping {target}', '', 'ping')

  expect(router.route('ping server', '').route_object).toBe('ping')
  expect(router.getOption('separator')).toBe(' ')
})

test('empty separator throws in constructor', () => {
  expect(() => new ODRouter({ separator: '' })).toThrow('Option "separator" must not be empty')
})

test('empty separator throws in setOption', () => {
  const router = new ODRouter()
  expect(() => router.setOption('separator', '')).toThrow('Option "separator" must not be empty')
})

test('empty separator throws in setSeparator', () => {
  const router = new ODRouter()
  expect(() => router.setSeparator('')).toThrow('Option "separator" must not be empty')
})

test('separator is being properly escaped', () => {
  const router = new ODRouter<string>()
    .setOption('separator', '^')
    .register('very^unusual^{what}', '', 'very unusual')

  expect(router.route('very^unusual^scenario', '').route_object).toBe('very unusual')
  expect(router.route('very^unusual^scenario', '').params.what).toBe('scenario')
})
