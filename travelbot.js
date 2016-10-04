const travel = require('travel-scrapper')
const station = travel.station
const fs = require('fs')
const path = require('path')
const Bot = require('queread')
let datafile = fs.readFileSync(path.join(__dirname, './data/set'))
let dataset = Bot.parse(String(datafile))
let bot = new Bot(dataset)

// Added tokenizers.
bot.addParameter(function origin(tokens) {
  let previousToken = tokens.last()
  if (previousToken !== undefined && previousToken.type === 'word'
      && previousToken.tag === 'from') {
    let match = /^\w+/.exec(tokens.rest())
    if (match !== null) {
      return { tag: 'origin', length: match[0].length, data: match[0] }
    }
  }
})
bot.addParameter(function destination(tokens) {
  let previousToken = tokens.last()
  if (previousToken !== undefined && previousToken.type === 'word'
      && previousToken.tag === 'to') {
    let match = /^\w+/.exec(tokens.rest())
    if (match !== null) {
      return { tag: 'destination', length: match[0].length, data: match[0] }
    }
  }
})
bot.addParameter(function destination(tokens) {
  let match = /^(car|bus|metro|train|plane|boat)\b/.exec(tokens.rest())
  if (match !== null) {
    return { tag: 'vehicle', length: match[0].length, data: match[0] }
  }
})

// Read some natural language input, return responses
// as {text: String} from answer().
function respond(input, answer) {
  let query = bot.guess(input)
  if (query.label === 'search') {
    if (query.parameters.origin !== undefined &&
        query.parameters.destination !== undefined) {
      let origin = station.name(query.parameters.origin)
      let destination = station.name(query.parameters.destination)
      if (origin !== undefined && destination !== undefined) {
        answer({text: 'Let me see what I can find…'})
        travel.search(origin.id, destination.id)
        .then(travelPlans => answer({text: stringTravelPlans(travelPlans)}))
        .catch(e => { console.error(e); answer({text: stringError()}) })
        return
      }
    }
    // If we have not returned yet, we are missing data.
    answer({text: 'Well, where will you come from, and where will you go, ' +
      'Cotton-Eye Joe?'})
  } else if (query.label === 'hi') {
    answer({text: 'Hello, human.'})
  } else if (query.label === 'help') {
    answer({text: 'You can ask me, for instance, “How do I go ' +
      'from Lille to Paris?”.'})
  } else if (query.label === 'self') {
    answer({text: 'I give travel information across Europe.\n' +
      'My understanding relies on a word graph with edges weighted by the ' +
      'meaning provided during training.\n' +
      'My author is Thaddée Tyl.'})
  } else if (query.label === 'bad') {
    answer({text: 'I will improve.'})
  } else if (query.label === 'hitchhiker') {
    answer({text: '42.'})
  } else {
    answer({text: 'Sorry, I do not understand what you said. ' +
      'Ask me: “What can you understand?”'})
  }
}

function stringTravelPlans(travelPlans) {
  return travelPlans.map((travelPlan, i) => {
    let legs = travelPlan.legs
    let last = legs[legs.length - 1]
    return `${i + 1}. ${travelPlan.fares.map(stringFare).join(', ')}\n` +
    legs.map(leg =>
      `  ${stringTime(leg.departure)} ${stringStation(leg.from)}`).join('\n') +
    `\n  ${stringTime(last.arrival)} ${stringStation(last.to)}`
  }).join('\n')
}

// Receives a '1234' station id.
function stringStation(id) {
  let s = station.id(id)
  if (s !== undefined) {
    return s.name
  } else {
    return id.name
  }
}

// {price: {cents, currency}, class, flexibility}
function stringFare(fare) {
  return [
    stringMultiPrice(fare.price),
    stringFlexibility(fare.flexibility),
    stringTravelClass(fare.class)
  ].filter(e => e !== '')
   .join(' ')
}

function stringTravelClass(travelClass) {
  if (travelClass === 1) { return '1st' }
  return ''
}

function stringFlexibility(flexibility) {
  if (flexibility > 2) { return 'flex' }
  if (flexibility > 1) { return 'semiflex' }
  return ''
}

const currency = {
  'EUR': '€',
  'GBP': '₤',
}

// Receives a list of {cents, currency}.
function stringMultiPrice(prices) {
  return prices.map(stringPrice).join(' + ')
}

// Receives {cents, currency}.
function stringPrice(price) {
  return `${currency[price.currency]} ${(price.cents / 100).toFixed(2)}`
}

// Receives a ISO 8601 string "2017-…Z".
function stringTime(time) {
  let date = new Date(time)
  let hours = date.getHours()
  let minutes = date.getMinutes()
  let h = String(hours), m = String(minutes)
  if (hours < 10) { h = '0' + h }
  if (minutes < 10) { m = '0' + m }
  return `${h}:${m}`
}

function stringError() {
  return 'Sorry, I got confused. Can you ask again differently?'
}

module.exports = respond
