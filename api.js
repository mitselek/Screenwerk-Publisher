var fs = require('fs')
var op = require('object-path')
var express = require('express')

var app = express()
app.listen(3000)

app.get('/configuration/:screenEid', function (req, res) {
    var screenGroups = JSON.parse(fs.readFileSync('screenGroups.json'))
    var screenEid = req.params.screenEid

    var sgEid = Object.keys(screenGroups).filter(function(sgEid) {
        return Object.keys(screenGroups[sgEid].screens).indexOf(screenEid) > -1
    })[0]

    if (sgEid === undefined) {
        res.send(JSON.stringify({
            error: {
                code: 401,
                message: 'No such screen',
                screenEid: screenEid
            }
        }, null, 4))
    }
    else {
        op.set(screenGroups[sgEid], ['screen'], screenGroups[sgEid].screens[screenEid])
        op.del(screenGroups[sgEid], ['screens'])
        res.send(JSON.stringify(screenGroups[sgEid], null, 4))
    }
})
