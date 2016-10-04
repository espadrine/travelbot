const respond = require('./travelbot.js')
const Botkit = require('botkit')
let config
try {
  config = require('./secrets.json')
  if (config.slackToken === undefined) {
    throw new Error("No Slack token")
  }
} catch(e) {
  console.error("You need to set up a secrets.json.\n" +
    "Start with this:\n" +
    "{\n" +
    '  "slackToken": "<insert Slack token>"\n' +
    "}\n" +
    "See https://my.slack.com/services/new/bot " +
    "to get a Slack token."
  )
  process.exit(1)
}

let controller = Botkit.slackbot()
let bot = controller.spawn({
  token: config.slackToken
}).startRTM()

function recvMsg(bot, message) {
  respond(message.text, function answer(res) {
    // Receives {text: String}.
    bot.reply(message, res.text)
  })
}
controller.on('direct_message', recvMsg)
controller.on('direct_mention', recvMsg)
controller.on('mention', recvMsg)
