const respond = require('./travelbot.js')

// Receives {text: String}.
function answer(res) {
  console.log(res.text)
}

process.stdin.setEncoding('utf8')
process.stdin.on('readable', () => {
  let chunk = process.stdin.read()
  if (chunk !== null) {
    respond(String(chunk), answer)
  }
})
