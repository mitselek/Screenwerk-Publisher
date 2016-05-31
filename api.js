const express = require('express')
const fs = require('fs')
const path = require('path')

const app = express()

app.listen(process.env.NODE_ENV === 'production' ? 80 : 3000)

app.get('/', function (req, res) {
  const startAt = process.hrtime()
  let diff = process.hrtime(startAt)
  res.status(204)
  res.send(JSON.stringify({
    error: {
      code: 'Matthew 7:7',
      message: 'Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you',
      screenEid: 'You haven\'t told me',
      responseTimeMs: diff[0] * 1e3 + diff[1] * 1e-6
    }
  }, null, 4))
})

app.get('/configuration/:screenEid', function (req, res) {
  const startAt = process.hrtime()
  const screenEid = req.params.screenEid
  const screenFile = path.join(__dirname, 'screens', screenEid + '.json')
  if (!fs.existsSync(screenFile)) {
    console.log('Requested screen ' + screenEid + ' is not known.')
    let diff = process.hrtime(startAt)
    res.status(401)
    res.send(JSON.stringify({
      error: {
        code: 401,
        message: 'No such screen cached yet',
        screenEid: screenEid,
        responseTimeMs: diff[0] * 1e3 + diff[1] * 1e-6
      }
    }, null, 4))
    return
  }

  let screen = JSON.parse(fs.readFileSync(screenFile))
  screen.isoDate = new Date().toISOString()
  console.log('Serving meta for screen ' + screenEid + '.')
  let diff = process.hrtime(startAt)
  screen.responseTimeMs = diff[0] * 1e3 + diff[1] * 1e-6
  res.send(JSON.stringify(screen))
})
