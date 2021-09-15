/* eslint-disable no-undef */

const { OrangeDragonflyRouter } = require('./../index')

const generateRouter = () => {
  return OrangeDragonflyRouter.init()
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

  expect(router.route('/users/15', 'get').params.id).toBe(15)
  expect(router.route('/users/15/', 'get').params.id).toBe(15)
  expect(router.route('/users/15/test', 'get').params.id).toBe(15)
  expect(router.route('/users/15/test', 'get').params.action).toBe('test')
  expect(router.route('/users/15/test/', 'get').params.action).toBe('test')
})

test('not HTTP scenario', () => {
  const router = OrangeDragonflyRouter.init()
    .setSeparator(' ')
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
