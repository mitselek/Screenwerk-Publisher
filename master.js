var cluster  = require('cluster')
var raven    = require('raven')

if (!process.env.ENTU_USER) {
    throw '"ENTU_USER" missing in environment'
}
if (!process.env.ENTU_KEY) {
    throw '"ENTU_KEY" missing in environment'
}

APP_DEPLOYMENT      = process.env.DEPLOYMENT
APP_VERSION         = require('./package').version

APP_ENTU_OPTIONS    = {
    entuUrl: 'https://piletilevi.entu.ee',
    user: process.env.ENTU_USER || 6913,
    key: process.env.ENTU_KEY || 'susistusiersusistusier'
}

POLLING_INTERVAL_MS = process.env.ENTU_POLL_SEC * 1e3 || 3e3


// initialize getsentry.com client
var ravenClient = new raven.Client({ release: APP_VERSION })

if (cluster.isMaster) {
    require('./poll.js')

    cluster.fork()

    // When process dies, replace it.
    cluster.on('exit', function () {
        cluster.fork()
    })
}
else {
    require('./api.js')
}
