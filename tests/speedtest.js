const { OrangeDragonflyRouter } = require('./../index')

const router = OrangeDragonflyRouter.init()
  .register('/', '*', 'root')
  .register('/users', '*', 'users')
  .register('/users/{#id}', '*', 'user item')

const start = Date.now()

for (let i = 0; i < 1000000; i++) {
  router.route('/', 'get')
  router.route('/users', 'post')
  router.route('/users/12345', 'get')
}

console.log('Result', Date.now() - start, 'ms')
