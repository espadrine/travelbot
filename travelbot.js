const travel = require('travel-scrapper')
const station = travel.station
const fs = require('fs')
const path = require('path')
const Bot = require('queread')
let datafile = fs.readFileSync(path.join(__dirname, './data/set'))
let dataset = Bot.parse(String(datafile))
let bot = new Bot(dataset)

// Return the id of a station name.
function stationMatch(name) {
  return stationFromName.get(name.toLowerCase())
}

let stationFromName = new Map()
station.forEach(station =>
  stationFromName.set(station.name.toLowerCase(), station))

// Added tokenizers.
bot.addParameter(function origin(tokens) {
  let previousToken = tokens.last()
  if (previousToken !== undefined && previousToken.type === 'word'
      && previousToken.tag === 'from') {
    let match = /^\w+/.exec(tokens.rest())
    let station = stationMatch(match[0])
    if (station !== undefined) {
      return { tag: 'origin', length: match[0].length, data: station.id }
    }
  }
})
bot.addParameter(function destination(tokens) {
  let previousToken = tokens.last()
  if (previousToken !== undefined && previousToken.type === 'word'
      && previousToken.tag === 'to') {
    let match = /^\w+/.exec(tokens.rest())
    let station = stationMatch(match[0])
    if (station !== undefined) {
      return { tag: 'destination', length: match[0].length, data: station.id }
    }
  }
})
bot.addParameter(function destination(tokens) {
  let match = /^(car|bus|metro|train|plane|boat)\b/.exec(tokens.rest())
  if (match !== null) {
    return { tag: 'vehicle', length: match[0].length, data: match[0] }
  }
})

// Receive {hour, minute, …} (or undefined), return a Date.
// sessionDate is a previously used Date.
function buildDate(time, sessionDate) {
  if (time === undefined) {
    return sessionDate
  }
  let now = new Date()
  sessionDate = sessionDate || now
  let year = time.year
  year = (year !== undefined)? year: sessionDate.getFullYear()
  year = (year !== undefined)? year: now.getFullYear()
  let month = time.month
  month = (month !== undefined)? month: sessionDate.getMonth()
  month = (month !== undefined)? month: now.getMonth()
  let day = time.day
  day = (day !== undefined)? day: sessionDate.getDate()
  day = (day !== undefined)? day: now.getDate()
  let hour = time.hour
  hour = (hour !== undefined)? hour: sessionDate.getHours()
  hour = (hour !== undefined)? hour: now.getHours()
  let minute = time.minute
  minute = (minute !== undefined)? minute: sessionDate.getMinutes()
  minute = (minute !== undefined)? minute: now.getMinutes()
  let second = time.second
  second = (second !== undefined)? second: sessionDate.getSeconds()
  second = (second !== undefined)? second: now.getSeconds()
  return new Date(year, month, day, hour, minute, second)
}

// Session information.
let session = {}

// Read some natural language input, return responses
// as {text: String} from answer().
function respond(input, answer) {
  let query = bot.guess(input)
  if (query.label === 'search') {
    session.origin = query.parameters.origin || session.origin
    session.destination = query.parameters.destination || session.destination
    if (session.origin !== undefined &&
        session.destination !== undefined) {
      let origin = station.id(session.origin)
      let destination = station.id(session.destination)
      session.departure = buildDate(
        query.parameters.departure, session.departure)
      let departure = session.departure
      if (origin !== undefined && destination !== undefined) {
        answer({text: 'Let me see what I can find…'})
        travel.search(origin.id, destination.id, {departure})
        .then(travelPlans => answer({text: stringTravelPlans(travelPlans)}))
        .catch(e => { console.error(e); answer({text: stringError()}) })
        return
      }
    }
    // If we have not returned yet, we are missing data.
    if (session.origin === undefined &&
        session.destination === undefined) {
      answer({text: 'Well, where will you come from, and where will you go, ' +
        'Cotton-Eye Joe?'})
    } else if (session.origin === undefined) {
      answer({text: 'Where will you leave from?'})
    } else {
      answer({text: 'Where do you want to go?'})
    }
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
