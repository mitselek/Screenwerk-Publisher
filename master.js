// var raven = require('raven')

if (!process.env.ENTU_USER) {
  throw new Error('"ENTU_USER" missing in environment')
}
if (!process.env.ENTU_KEY) {
  throw new Error('"ENTU_KEY" missing in environment')
}

// var APP_VERSION = require('./package').version
// initialize getsentry.com client
// var ravenClient = new raven.Client({ release: APP_VERSION })

require('./poll.js')
require('./api.js')
