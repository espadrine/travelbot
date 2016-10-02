const respond = require('./travelbot.js')
process.stdin.setEncoding('utf8')
process.stdin.on('readable', () => {
  let chunk = process.stdin.read()
  if (chunk !== null) {
    respond(String(chunk))
  }
})
