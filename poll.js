const async = require('async')
const fs = require('fs')
const op = require('object-path')
const path = require('path')

const entu = require('entulib')

const APP_ENTU_OPTIONS = {
  entuUrl: process.env.ENTU_URL || 'https://piletilevi.entu.ee',
  user: process.env.ENTU_USER || 6913,
  key: process.env.ENTU_KEY || 'susistusiersusistusier'
}

const POLLING_INTERVAL_MS = process.env.ENTU_POLL_SEC * 1e3 || 3e3

var pollOptions = {}
Object.keys(APP_ENTU_OPTIONS).forEach(function (key) {
  pollOptions[key] = APP_ENTU_OPTIONS[key]
})

const screensDir = path.join(__dirname, 'screens')
if (!fs.existsSync(screensDir)) {
  fs.mkdirSync(screensDir)
}

var lastPollTs = new Date().getTime() - 60 * 60 * 1e3
var connectionsInProgress = 0
console.log(' = = = Reset ' + connectionsInProgress)
var updateStatus = 'NO_UPDATES'

var screenGroups = {}
if (fs.existsSync('screenGroups.json')) {
  screenGroups = JSON.parse(fs.readFileSync('screenGroups.json'))
}

function setLastPollTs (newTs) {
  console.log('setLastPollTs. Current: ' + new Date(lastPollTs * 1e0) + ', new: ' + new Date(newTs * 1e0))
  if (newTs && newTs > lastPollTs) {
    console.log('setLastPollTs from ' + new Date(lastPollTs * 1e0) + ' to ' + new Date(newTs * 1e0))
    lastPollTs = newTs
  } else {
    console.log('failed to set lastPollTs to ' + newTs)
  }
}

function removeScreengroup (eid) {
  console.log('Removing screen group ' + eid)
  op.del(screenGroups, eid)
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
      console.log(new Date(), reason)
      throw (reason)
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
      console.log(new Date(), reason)
      throw (reason)
    })
}

function loadMedia (a_in, callback) {
  connectionsInProgress++
  console.log(' = = = loadMedia ' + a_in.reference + ' incr ' + connectionsInProgress)
  entu.getEntity(a_in.reference, APP_ENTU_OPTIONS)
    .then(function (opEntity) {
      connectionsInProgress--
      callback(null, opEntity)
    })
    .catch(function (reason) {
      connectionsInProgress--
      console.log(' = = = loadMedia fail ' + a_in.reference + ' decr ' + connectionsInProgress)
      console.log(new Date(), reason)
      throw (reason)
    })
}

function buildMedia (opMedia, swMedia, callback) {
  console.log(' = = = File ' + JSON.stringify(opMedia.get(['properties', 'file', 0], 'No file for ' + opMedia.get(['properties', 'type', 0, 'value'], '_type_') + ' for media ' + opMedia.get('id'))))
  let mediaEid = opMedia.get(['id'])
  swMedia.mediaEid = mediaEid
  swMedia.file = opMedia.get(['properties', 'file', 0, 'file'])
  swMedia.fileName = opMedia.get(['properties', 'file', 0, 'value'])
  swMedia.height = opMedia.get(['properties', 'height', 0, 'value'], '')
  swMedia.width = opMedia.get(['properties', 'width', 0, 'value'], '')
  swMedia.name = opMedia.get(['properties', 'name', 0, 'value'], '')
  swMedia.type = opMedia.get(['properties', 'type', 0, 'value'], '')
  swMedia.url = opMedia.get(['properties', 'url', 0, 'value'], '')

  let validFrom = opMedia.get(['properties', 'valid-from', 0, 'value'], false)
  if (validFrom) {
    if (swMedia.validFrom && swMedia.validFrom < validFrom) {
      console.log('Replacing validFrom for ' + swMedia.mediaEid + ': ' + swMedia.validFrom + ' <-- ' + validFrom)
      swMedia.validFrom = validFrom
    }
  }
  let validTo = opMedia.get(['properties', 'valid-to', 0, 'value'], false)
  if (validTo) {
    if (swMedia.validTo && swMedia.validTo > validTo) {
      console.log('Replacing validTo for ' + swMedia.mediaEid + ': ' + swMedia.validTo + ' <-- ' + validTo)
      swMedia.validTo = validTo
    }
  }
  callback(null)
}

function validateMedia (swMedia) {
  if (swMedia.type === 'Image') {
    if (!swMedia.duration || swMedia.duration === 0) {
      throw new Error('Error: Image media should have duration!', swMedia)
    }
  }
  if (swMedia.type !== 'URL') {
    if (!swMedia.file || !swMedia.fileName) {
      throw new Error('Error: Missing file for media!', swMedia)
    }
  }
}

function loadPlaylist (a_in, swPlaylist) {
  connectionsInProgress++
  console.log(' = = = loadPlaylist ' + a_in.reference + ' incr ' + connectionsInProgress)
  entu.getEntity(a_in.reference, APP_ENTU_OPTIONS)
    .then(function (opEntity) {
      connectionsInProgress--
      console.log(' = = = loadPlaylist ' + a_in.reference + ' decr ' + connectionsInProgress)
      let playlistEid = opEntity.get(['id'])
      swPlaylist.playlistEid = playlistEid
      swPlaylist.name = opEntity.get(['properties', 'name', 0, 'value'], '')
      swPlaylist.validFrom = opEntity.get(['properties', 'valid-from', 0, 'value'], '')
      swPlaylist.validTo = opEntity.get(['properties', 'valid-to', 0, 'value'], '')
      swPlaylist.playlistMedias = {}
      ;(function (playlistMedias, playlistEid) {
        loadChilds(playlistEid, 'sw-playlist-media', function (opEntity) {
          let playlistMediaEid = opEntity.get(['id'])
          let swMedia = {
            playlistMediaEid: playlistMediaEid,
            animate: opEntity.get(['properties', 'animate', 0, 'value']),
            duration: opEntity.get(['properties', 'duration', 0, 'value']),
            delay: opEntity.get(['properties', 'delay', 0, 'value']),
            mute: opEntity.get(['properties', 'mute', 0, 'value']),
            ordinal: opEntity.get(['properties', 'ordinal', 0, 'value']),
            stretch: opEntity.get(['properties', 'stretch', 0, 'value']),
            validFrom: opEntity.get(['properties', 'valid-from', 0, 'value']),
            validTo: opEntity.get(['properties', 'valid-to', 0, 'value'])
          }
          op.set(playlistMedias, [playlistMediaEid], swMedia)
          loadMedia(opEntity.get(['properties', 'media', 0]), (err, opMedia) => {
            if (err) { throw err }
            buildMedia(opMedia, swMedia, (err) => {
              if (err) { throw err }
              validateMedia(swMedia, (err) => {
                if (err) { throw err }
              })
            })
          })
        })
      })(swPlaylist.playlistMedias, playlistEid)
    })
    .catch(function (reason) {
      connectionsInProgress--
      console.log(' = = = loadPlaylist fail ' + a_in.reference + ' decr ' + connectionsInProgress)
      console.log(new Date(), reason)
      throw (reason)
    })
}

function loadLayout (a_in, a_out) {
  connectionsInProgress++
  console.log(' = = = loadLayout ' + a_in.reference + ' incr ' + connectionsInProgress)
  entu.getEntity(a_in.reference, APP_ENTU_OPTIONS)
    .then(function (opEntity) {
      connectionsInProgress--
      console.log(' = = = loadLayout ' + a_in.reference + ' decr ' + connectionsInProgress)
      let layoutEid = opEntity.get(['id'])
      a_out.layoutEid = layoutEid
      a_out.name = opEntity.get(['properties', 'name', 0, 'value'], '')
      a_out.layoutPlaylists = {}
      ;(function (layoutPlaylists, layoutEid) {
        loadChilds(layoutEid, 'sw-layout-playlist', function (opEntity) {
          let layoutPlaylistEid = opEntity.get(['id'])
          op.set(layoutPlaylists, [layoutPlaylistEid], {
            eid: layoutPlaylistEid,
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
      console.log(new Date(), reason)
      throw (reason)
    })
}

function loadConfiguration (a_in, a_out) {
  connectionsInProgress++
  console.log(' = = = loadConfiguration ' + a_in.reference + ' incr ' + connectionsInProgress)
  entu.getEntity(a_in.reference, APP_ENTU_OPTIONS)
    .then(function (opEntity) {
      connectionsInProgress--
      console.log(' = = = loadConfiguration ' + a_in.reference + ' decr ' + connectionsInProgress)
      a_out.configurationEid = opEntity.get(['id'])
      a_out.updateInterval = Number(opEntity.get(['properties', 'update-interval', 0, 'value'], 0))
      a_out.schedules = {}

      ;(function (schedules, cEid) {
        loadChilds(cEid, 'sw-schedule', function (opEntity) {
          let childEid = opEntity.get(['id'])
          op.set(schedules, [childEid], {
            eid: childEid,
            cleanup: opEntity.get(['properties', 'cleanup', 0, 'value']),
            crontab: opEntity.get(['properties', 'crontab', 0, 'value']),
            duration: opEntity.get(['properties', 'duration', 0, 'value']),
            validFrom: opEntity.get(['properties', 'valid-from', 0, 'value']),
            validTo: opEntity.get(['properties', 'valid-to', 0, 'value']),
            ordinal: opEntity.get(['properties', 'ordinal', 0, 'value'])
          })
          loadLayout(opEntity.get(['properties', 'layout', 0]), op.get(schedules, [childEid]))
        })
      })(a_out.schedules, a_out.configurationEid)
    })
    .catch(function (reason) {
      connectionsInProgress--
      console.log(' = = = loadConfiguration fail ' + a_in.reference + ' decr ' + connectionsInProgress)
      console.log(new Date(), reason)
      throw (reason)
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
      updateStatus = 'IS_UPDATED'
      console.log(opEntity.get(['id']) + ' published at ' + opEntity.get(['properties', 'published', 0, 'value'], '') +
        ' = ' + new Date(opEntity.get(['properties', 'published', 0, 'value'], '')).toISOString())
      op.set(screenGroups, [sgEid], {
        eid: opEntity.get(['id']),
        lastPoll: new Date(lastPollTs).toISOString(),
        name: opEntity.get(['properties', 'name', 0, 'value'], ''),
        publishedAt: new Date().toISOString(),
        // publishedAt: new Date(opEntity.get(['properties', 'published', 0, 'value'], '')).toISOString(),
        screens: {}
      })
      loadConfiguration(opEntity.get(['properties', 'configuration', 0]), screenGroups[sgEid])
      ;(function (sgEid) {
        loadReferrals(sgEid, 'sw-screen', function (opEntity) {
          op.set(screenGroups[sgEid].screens, [opEntity.get(['id'])], {
            eid: opEntity.get(['id']),
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

      let properties = {
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
          console.log(properties, new Date(), reason)
          throw (reason)
        })
    })
    .catch(function (reason) {
      connectionsInProgress--
      console.log(' = = = loadScreengroup fail' + sgEid + ' decr ' + connectionsInProgress)
      let message = '*INFO*: loadScreengroup failed, retry in ' + POLLING_INTERVAL_MS / 1e2
      console.log(message, new Date(), reason)
      setTimeout(function () { loadScreengroup(sgEid, callback) }, POLLING_INTERVAL_MS * 10)
    })
}

function extractScreenData (screenGroups) {
  async.forEachOf(screenGroups, (screenGroup, screenGroupEid, callback) => {
    async.forEachOf(screenGroup.screens, (screen, screenEid, callback) => {
      let configuration = {}
      configuration.configurationEid = screenGroup.configurationEid
      configuration.screenGroupEid = screenGroupEid
      configuration.screenEid = screenEid
      configuration.publishedAt = screenGroup.publishedAt
      configuration.updateInterval = screenGroup.updateInterval
      configuration.schedules = Object.keys(screenGroup.schedules).map((key) => { return screenGroup.schedules[key] })
      async.each(configuration.schedules, (schedule, callback) => {
        schedule.layoutPlaylists = Object.keys(schedule.layoutPlaylists).map((key) => { return schedule.layoutPlaylists[key] })
        async.each(schedule.layoutPlaylists, (layoutPlaylist, callback) => {
          layoutPlaylist.playlistMedias = Object.keys(layoutPlaylist.playlistMedias)
            .map((key) => { return layoutPlaylist.playlistMedias[key] })
            .sort((a, b) => { return a.ordinal - b.ordinal })
          callback()
        },
        (err) => {
          if (err) { console.log(err) }
          callback()
        })
      },
      (err) => {
        if (err) { console.log(err) }
        fs.writeFile(path.resolve(screensDir, screenEid + '.json'), JSON.stringify(configuration, null, 4), (err) => {
          if (err) { console.log(err) }
          // console.log('Screen ' + screenEid + ' extracted.')
          callback()
        })
      })
    },
    (err) => {
      if (err) { console.log(err) }
      callback()
    })
  },
  (err) => {
    if (err) { console.log(err) }
    console.log('All screens extracted.')
  })
}

function pollEntu () {
  if (connectionsInProgress !== 0) {
    let message = '*INFO*: pollEntu already busy (' + connectionsInProgress + '). ' +
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
      let updates = result.updates.filter(function (a) { return a.action !== 'created at' })
      updates.sort(function (a, b) { return a.timestamp - b.timestamp }) // Ascending sort by timestamp

      let toGo = updates.length
      async.eachSeries(updates, function (update, callback) {
        if (update.timestamp > 0) { setLastPollTs(update.timestamp * 1e3) }
        let sgEid = update.id

        if (update.action === 'deleted at') {
          console.log('(' + (toGo--) + ') Removing ' + update.definition + ' ' + sgEid + ' @ ' + update.timestamp + (new Date(update.timestamp * 1e0)))
          removeScreengroup(sgEid)
          return callback()
        }

        console.log('(' + (toGo--) + ') Updating ' + update.definition + ' ' + sgEid + ' @ ' + update.timestamp + ' ' + (new Date(update.timestamp * 1e0)))
        loadScreengroup(sgEid, callback)
      }, function (err) {
        if (err) {
          let message = '*INFO*: Poll routine stumbled. Restart in ' + POLLING_INTERVAL_MS / 1e2
          console.log(message, new Date(), err)
          setTimeout(function () { pollEntu() }, POLLING_INTERVAL_MS * 10)
          return
        }
        console.log('Poll routine finished', new Date())
        if (connectionsInProgress === 0 && updateStatus === 'IS_UPDATED') {
          updateStatus = 'NO_UPDATES'
          fs.writeFile('screenGroups.json', JSON.stringify(screenGroups, null, 4), (err) => {
            if (err) { throw new Error('Failed saving screenGroups.json') }
            extractScreenData(screenGroups)
          })
        }
        // TODO: Not implemented
        // somehow contents from entu should get sanity checked before publishing to screens
        if (connectionsInProgress === 0 && updateStatus === 'HAD_ERRORS') {
          updateStatus = 'NO_UPDATES'
          throw new Error('Parsing errors')
        }
        setTimeout(function () { pollEntu() }, POLLING_INTERVAL_MS)
      })
    })
    .then(function () {
    })
    .catch(function (reason) {
      let message = '*INFO*: Entu.pollUpdates failed. Restart in ' + POLLING_INTERVAL_MS / 1e2
      console.log(message, new Date(), reason)
      setTimeout(function () { pollEntu() }, POLLING_INTERVAL_MS * 10)
    })
}

pollEntu()
