var path = require('path')
var async = require('async')
var op = require('object-path')
var fs = require('fs')

var entu = require('entulib')

var APP_ENTU_OPTIONS = {
  entuUrl: process.env.ENTU_URL || 'https://piletilevi.entu.ee',
  user: process.env.ENTU_USER || 6913,
  key: process.env.ENTU_KEY || 'susistusiersusistusier'
}

var POLLING_INTERVAL_MS = process.env.ENTU_POLL_SEC * 1e3 || 3e3

var pollOptions = {}
Object.keys(APP_ENTU_OPTIONS).forEach(function (key) {
  pollOptions[key] = APP_ENTU_OPTIONS[key]
})

var lastPollTs = new Date().getTime() - 60 * 60 * 1e3
var connectionsInProgress = 0
console.log(' = = = Reset ' + connectionsInProgress)
var updated = false

var screenGroups = JSON.parse(fs.readFileSync('screenGroups.json'))

function setLastPollTs (newTs) {
  console.log('setLastPollTs. Current: ' + new Date(lastPollTs * 1e0) + ', new: ' + new Date(newTs * 1e0))
  if (newTs && newTs > lastPollTs) {
    console.log('setLastPollTs from ' + new Date(lastPollTs * 1e0) + ' to ' + new Date(newTs * 1e0))
    lastPollTs = newTs
  } else {
    console.log('failed to set lastPollTs to ' + newTs)
  }
}

function removeScreengroup (id) {
  console.log('Removing screen group ' + id)
  op.del(screenGroups, id)
}

function loadReferrals (parentEid, eDefinition, callback) {
  connectionsInProgress++
  console.log(' = = = loadReferrals ' + parentEid + ' incr ' + connectionsInProgress)
  entu.getReferrals(parentEid, eDefinition, APP_ENTU_OPTIONS)
    .then(function (referrals) {
      connectionsInProgress--
      console.log(' = = = loadReferrals ' + parentEid + ' decr ' + connectionsInProgress)
      referrals.forEach(function (referral) {
        callback(referral)
      })
    })
    .catch(function (reason) {
      connectionsInProgress--
      console.log(' = = = loadReferrals fail ' + parentEid + ' decr ' + connectionsInProgress)
      // var message = '*INFO*: entu.loadReferrals failed'
      console.log(new Date(), reason)
      reject(reason)
    })
}

function loadChilds (parentEid, eDefinition, callback) {
  connectionsInProgress++
  console.log(' = = = loadChilds ' + parentEid + ' incr ' + connectionsInProgress)
  entu.getChilds(parentEid, eDefinition, APP_ENTU_OPTIONS)
    .then(function (childs) {
      connectionsInProgress--
      console.log(' = = = loadChilds ' + parentEid + ' decr ' + connectionsInProgress)
      childs.forEach(function (child) {
        callback(child)
      })
    })
    .catch(function (reason) {
      connectionsInProgress--
      console.log(' = = = loadChilds fail ' + parentEid + ' decr ' + connectionsInProgress)
      // var message = '*INFO*: entu.loadChilds failed'
      console.log(new Date(), reason)
      reject(reason)
    })
}

function loadMedia (a_in, a_out) {
  connectionsInProgress++
  console.log(' = = = loadMedia ' + a_in.reference + ' incr ' + connectionsInProgress)
  entu.getEntity(a_in.reference, APP_ENTU_OPTIONS)
    .then(function (opEntity) {
      connectionsInProgress--
      console.log(' = = = loadMedia ' + a_in.reference + ' decr ' + connectionsInProgress)
      var mediaEid = opEntity.get(['id'])
      a_out.mediaId = mediaEid
      a_out.file = opEntity.get(['properties', 'file', 0, 'value'], '')
      a_out.height = opEntity.get(['properties', 'height', 0, 'value'], '')
      a_out.name = opEntity.get(['properties', 'name', 0, 'value'], '')
      a_out.type = opEntity.get(['properties', 'type', 0, 'value'], '')
      a_out.url = opEntity.get(['properties', 'url', 0, 'value'], '')

      var validFrom = opEntity.get(['properties', 'valid-from', 0, 'value'], false)
      if (validFrom) {
        if (a_out.validFrom && a_out.validFrom < validFrom) {
          console.log('Replacing validFrom for ' + a_out.mediaId + ': ' + a_out.validFrom + ' <-- ' + validFrom)
          a_out.validFrom = validFrom
        }
      }
      var validTo = opEntity.get(['properties', 'valid-to', 0, 'value'], false)
      if (validTo) {
        if (a_out.validTo && a_out.validTo > validTo) {
          console.log('Replacing validTo for ' + a_out.mediaId + ': ' + a_out.validTo + ' <-- ' + validTo)
          a_out.validTo = validTo
        }
      }
      a_out.width = opEntity.get(['properties', 'width', 0, 'value'], '')
    })
    .catch(function (reason) {
      connectionsInProgress--
      console.log(' = = = loadMedia fail ' + a_in.reference + ' decr ' + connectionsInProgress)
      // var message = '*INFO*: loadConfiguration.entu.getEntity failed'
      console.log(new Date(), reason)
      reject(reason)
    })
}

function loadPlaylist (a_in, a_out) {
  connectionsInProgress++
  console.log(' = = = loadPlaylist ' + a_in.reference + ' incr ' + connectionsInProgress)
  entu.getEntity(a_in.reference, APP_ENTU_OPTIONS)
    .then(function (opEntity) {
      connectionsInProgress--
      console.log(' = = = loadPlaylist ' + a_in.reference + ' decr ' + connectionsInProgress)
      var playlistEid = opEntity.get(['id'])
      a_out.playlistId = playlistEid
      a_out.name = opEntity.get(['properties', 'name', 0, 'value'], '')
      a_out.validFrom = opEntity.get(['properties', 'valid-from', 0, 'value'], '')
      a_out.validTo = opEntity.get(['properties', 'valid-to', 0, 'value'], '')
      a_out.playlistMedias = {}
      ;(function (playlistMedias, playlistEid) {
        loadChilds(playlistEid, 'sw-playlist-media', function (opEntity) {
          var playlistMediaEid = opEntity.get(['id'])
          op.set(playlistMedias, [playlistMediaEid], {
            id: playlistMediaEid,
            animate: opEntity.get(['properties', 'animate', 0, 'value']),
            delay: opEntity.get(['properties', 'delay', 0, 'value']),
            duration: opEntity.get(['properties', 'duration', 0, 'value']),
            mute: opEntity.get(['properties', 'mute', 0, 'value']),
            ordinal: opEntity.get(['properties', 'ordinal', 0, 'value']),
            stretch: opEntity.get(['properties', 'stretch', 0, 'value']),
            validFrom: opEntity.get(['properties', 'valid-from', 0, 'value']),
            validTo: opEntity.get(['properties', 'valid-to', 0, 'value'])
          })
          loadMedia(opEntity.get(['properties', 'media', 0]), op.get(playlistMedias, [playlistMediaEid]))
        })
      })(a_out.playlistMedias, playlistEid)
    })
    .catch(function (reason) {
      connectionsInProgress--
      console.log(' = = = loadPlaylist fail ' + a_in.reference + ' decr ' + connectionsInProgress)
      // var message = '*INFO*: loadConfiguration.entu.getEntity failed'
      console.log(new Date(), reason)
      reject(reason)
    })
}

function loadLayout (a_in, a_out) {
  connectionsInProgress++
  console.log(' = = = loadLayout ' + a_in.reference + ' incr ' + connectionsInProgress)
  entu.getEntity(a_in.reference, APP_ENTU_OPTIONS)
    .then(function (opEntity) {
      connectionsInProgress--
      console.log(' = = = loadLayout ' + a_in.reference + ' decr ' + connectionsInProgress)
      var layoutEid = opEntity.get(['id'])
      a_out.layoutId = layoutEid
      a_out.name = opEntity.get(['properties', 'name', 0, 'value'], '')
      a_out.layoutPlaylists = {}
      ;(function (layoutPlaylists, layoutEid) {
        loadChilds(layoutEid, 'sw-layout-playlist', function (opEntity) {
          var layoutPlaylistEid = opEntity.get(['id'])
          op.set(layoutPlaylists, [layoutPlaylistEid], {
            id: layoutPlaylistEid,
            name: opEntity.get(['properties', 'name', 0, 'value']),
            left: opEntity.get(['properties', 'left', 0, 'value']),
            top: opEntity.get(['properties', 'top', 0, 'value']),
            width: opEntity.get(['properties', 'width', 0, 'value']),
            height: opEntity.get(['properties', 'height', 0, 'value']),
            inPixels: opEntity.get(['properties', 'in-pixels', 0, 'value']),
            zindex: opEntity.get(['properties', 'zindex', 0, 'value']),
            loop: opEntity.get(['properties', 'loop', 0, 'value'])
          })
          loadPlaylist(opEntity.get(['properties', 'playlist', 0]), op.get(layoutPlaylists, [layoutPlaylistEid]))
        })
      })(a_out.layoutPlaylists, layoutEid)
    })
    .catch(function (reason) {
      connectionsInProgress--
      console.log(' = = = loadLayout fail ' + a_in.reference + ' decr ' + connectionsInProgress)
      // var message = '*INFO*: loadConfiguration.entu.getEntity failed'
      console.log(new Date(), reason)
      reject(reason)
    })
}

function loadConfiguration (a_in, a_out) {
  connectionsInProgress++
  console.log(' = = = loadConfiguration ' + a_in.reference + ' incr ' + connectionsInProgress)
  entu.getEntity(a_in.reference, APP_ENTU_OPTIONS)
    .then(function (opEntity) {
      connectionsInProgress--
      console.log(' = = = loadConfiguration ' + a_in.reference + ' decr ' + connectionsInProgress)
      a_out.configurationId = opEntity.get(['id'])
      a_out.name = opEntity.get(['properties', 'name', 0, 'value'], '')
      a_out.updateInterval = Number(opEntity.get(['properties', 'update-interval', 0, 'value'], 0))
      a_out.schedules = {}

      ;(function (schedules, cEid) {
        loadChilds(cEid, 'sw-schedule', function (opEntity) {
          var childEid = opEntity.get(['id'])
          op.set(schedules, [childEid], {
            id: childEid,
            cleanup: opEntity.get(['properties', 'cleanup', 0, 'value']),
            crontab: opEntity.get(['properties', 'crontab', 0, 'value']),
            duration: opEntity.get(['properties', 'duration', 0, 'value']),
            validFrom: opEntity.get(['properties', 'valid-from', 0, 'value']),
            validTo: opEntity.get(['properties', 'valid-to', 0, 'value']),
            ordinal: opEntity.get(['properties', 'ordinal', 0, 'value'])
          })
          loadLayout(opEntity.get(['properties', 'layout', 0]), op.get(schedules, [childEid]))
        })
      })(a_out.schedules, a_out.configurationId)
    })
    .catch(function (reason) {
      connectionsInProgress--
      console.log(' = = = loadConfiguration fail ' + a_in.reference + ' decr ' + connectionsInProgress)
      // var message = '*INFO*: loadConfiguration.entu.getEntity failed'
      console.log(new Date(), reason)
      reject(reason)
    })
}

function loadScreengroup (sgEid, callback) {
  connectionsInProgress++
  console.log(' = = = loadScreengroup ' + sgEid + ' incr ' + connectionsInProgress)
  entu.getEntity(sgEid, APP_ENTU_OPTIONS)
    .then(function (opEntity) {
      connectionsInProgress--
      console.log(' = = = loadScreengroup ' + sgEid + ' decr ' + connectionsInProgress)
      if (opEntity.get(['properties', 'isPublished', 0, 'value'], 'False') === 'False') {
        console.log('Screen group ' + sgEid + ' not published')
        return
      }
      updated = true
      op.set(screenGroups, [sgEid], {
        id: opEntity.get(['id']),
        name: opEntity.get(['properties', 'name', 0, 'value'], ''),
        screens: {}
      })
      loadConfiguration(opEntity.get(['properties', 'configuration', 0]), screenGroups[sgEid])
      ;(function (sgEid) {
        loadReferrals(sgEid, 'sw-screen', function (opEntity) {
          op.set(screenGroups[sgEid].screens, [opEntity.get(['id'])], {
            id: opEntity.get(['id']),
            name: opEntity.get(['properties', 'name', 0, 'value'], ''),
            screenshot: opEntity.get(['properties', 'photo', 0, 'file'], '')
          })
        })
      })(sgEid)
      return opEntity
    })
    // Remove isPublished flag, if screen group was published and is loaded successfully
    .then(function (opEntity) {
      if (!opEntity) { return callback() }

      var properties = {
        entity_id: sgEid,
        entity_definition: 'sw-screen-group',
        dataproperty: 'isPublished',
        property_id: opEntity.get(['properties', 'isPublished', 0, 'id']),
        new_value: ''
      }
      connectionsInProgress++
      console.log(' = = = setScreengroup ' + sgEid + ' incr ' + connectionsInProgress)
      entu.edit(properties, APP_ENTU_OPTIONS)
        .then(function (result) {
          connectionsInProgress--
          console.log(' = = = setScreengroup ' + sgEid + ' decr ' + connectionsInProgress)
          callback()
        })
        .catch(function (reason) {
          // var message = '*INFO*: entu.edit failed'
          console.log(properties, new Date(), reason)
          reject(reason)
        })
    })
    .catch(function (reason) {
      connectionsInProgress--
      console.log(' = = = loadScreengroup fail' + sgEid + ' decr ' + connectionsInProgress)
      var message = '*INFO*: loadScreengroup failed, retry in ' + POLLING_INTERVAL_MS / 1e2
      console.log(message, new Date(), reason)
      setTimeout(function () { loadScreengroup(sgEid, callback) }, POLLING_INTERVAL_MS * 10)
    })
}

function pollEntu () {
  if (connectionsInProgress !== 0) {
    var message = '*INFO*: pollEntu already busy (' + connectionsInProgress + '). ' +
      'Try again in ' + POLLING_INTERVAL_MS / 1e2 + 'sec'
    console.log(message, new Date())
    setTimeout(function () { pollEntu() }, POLLING_INTERVAL_MS * 10)
    return
  }

  pollOptions.timestamp = (lastPollTs + 1) / 1e3
  pollOptions.definition = 'sw-screen-group'
  pollOptions.limit = 3

  entu.pollUpdates(pollOptions)
    .then(function (result) {
      var updates = result.updates.filter(function (a) { return a.action !== 'created at' })
      updates.sort(function (a, b) { return a.timestamp - b.timestamp }) // Ascending sort by timestamp

      var toGo = updates.length
      async.eachSeries(updates, function (update, callback) {
        if (update.timestamp > 0) { setLastPollTs(update.timestamp * 1e3) }
        var sgEid = update.id

        if (update.action === 'deleted at') {
          console.log('(' + (toGo--) + ') Removing ' + update.definition + ' ' + sgEid + ' @ ' + update.timestamp + (new Date(update.timestamp * 1e0)))
          removeScreengroup(sgEid)
          return callback()
        }

        console.log('(' + (toGo--) + ') Updating ' + update.definition + ' ' + sgEid + ' @ ' + update.timestamp + ' ' + (new Date(update.timestamp * 1e0)))
        loadScreengroup(sgEid, callback)
      }, function (err) {
        if (err) {
          var message = '*INFO*: Poll routine stumbled. Restart in ' + POLLING_INTERVAL_MS / 1e2
          console.log(message, new Date(), err)
          setTimeout(function () { pollEntu() }, POLLING_INTERVAL_MS * 10)
          return
        }
        console.log('Poll routine finished', new Date())
        if (connectionsInProgress === 0 && updated === true) {
          updated = false
          fs.writeFile('screenGroups.json', JSON.stringify(screenGroups, null, 4))
        }
        setTimeout(function () { pollEntu() }, POLLING_INTERVAL_MS)
      })
    })
    .then(function () {
      // console.log(JSON.stringify(screenGroups, null, 4))
    })
    .catch(function (reason) {
      var message = '*INFO*: Entu.pollUpdates failed. Restart in ' + POLLING_INTERVAL_MS / 1e2
      console.log(message, new Date(), reason)
      setTimeout(function () { pollEntu() }, POLLING_INTERVAL_MS * 10)
    })
}

pollEntu()
