// var async = require('async')

var fs = require('fs')

let screenGroups = JSON.parse(fs.readFileSync('screenGroups.json'))
// console.log(screenGroups)

var index = {
  screenGroups: {}
}

// let ix = 0
index.screenGroups = Object.keys(screenGroups).map((a) => {
  let o = {}
  o[screenGroups[a].eid] = a
  return o
})

console.log(index)
