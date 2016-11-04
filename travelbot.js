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
station.forEach(station => {
  let lowercase = station.name.toLowerCase()
  if (!stationFromName.has(lowercase)) {
    stationFromName.set(lowercase, station)
  }
  let part = lowercase.match(/^\S+/)
  if (part !== null) {
    let name = part[0]
    if (name === 'the') { name = part[1] }
    if (name !== undefined && !stationFromName.has(name)) {
      stationFromName.set(name, station)
    }
  }
})

// Added tokenizers.
bot.addParameter(function locationParameter(tokens) {
  let rest = tokens.rest()
  let match = /^\w+/.exec(rest)
  if (match == null) {return}
  let station = stationMatch(match[0])
  if (station !== undefined) {
    return { tag: 'location', length: match[0].length, data: station.id }
  }
  let previousToken = tokens.last()
  if (previousToken !== undefined && previousToken.type === 'word') {

    // Where is that?
    if (previousToken.tag === 'is') {
      let prevPrevToken = tokens.tokens[tokens.tokens.length - 2]
      if (prevPrevToken !== undefined && prevPrevToken.type === 'word' &&
          prevPrevToken.tag === 'where') {
        match = /^(that|it)\b/.exec(rest)
        if (match !== null && session.destination !== undefined) {
          return { tag: 'location', length: match[0].length,
            data: session.destination }
        }
      }
    }
    if (previousToken.tag === 'where') {
      match = /^(that|it) +is\b/.exec(rest)
      if (match !== null && session.destination !== undefined) {
        return { tag: 'location', length: match[1].length,
          data: session.destination }
      }
    }
  }
})
bot.addParameter(function destinationParameter(tokens) {
  let previousToken = tokens.last()
  if (previousToken !== undefined && previousToken.type === 'word'
      && (previousToken.tag === 'to' || previousToken.tag === 'go')) {
    let match = /^\w+/.exec(tokens.rest())
    if (match !== null) {
      let name = match[0]
      if (/^t?here$/.test(name)) { name = session.location }
      let station = stationMatch(name)
      if (station !== undefined) {
        return { tag: 'destination', length: match[0].length, data: station.id }
      }
    }
  }
})
bot.addParameter(function vehicleParameter(tokens) {
  let match = /^(car|bus|metro|train|plane|boat)\b/.exec(tokens.rest())
  if (match !== null) {
    return { tag: 'vehicle', length: match[0].length, data: match[0] }
  }
})

// Receive {hour, minute, …} UTC (or undefined), return a Date.
// sessionDate is a previously used Date.
function buildDate(time, sessionDate) {
  if (time === undefined) {
    return sessionDate
  }
  let now = new Date()
  let year = time.year
  if (year === undefined && sessionDate !== undefined) {
    year = sessionDate.getFullYear() }
  if (year === undefined) { year = now.getFullYear() }
  let month = time.month
  if (month === undefined && sessionDate !== undefined) {
    month = sessionDate.getMonth() + 1 }
  if (month === undefined) { month = now.getMonth() + 1 }
  let day = time.day
  if (day === undefined && sessionDate !== undefined) {
    day = sessionDate.getDate() }
  if (day === undefined) { day = now.getDate() }
  let hour = time.hour
  if (hour === undefined && sessionDate !== undefined) {
    hour = sessionDate.getHours() }
  if (hour === undefined) {
    if (day !== undefined) { hour = 6
    } else { hour = now.getHours()
    }
  }
  let minute = time.minute
  if (minute === undefined && sessionDate !== undefined) {
    minute = sessionDate.getMinutes() }
  if (minute === undefined) { minute = now.getMinutes() }
  let second = time.second
  if (second === undefined && sessionDate !== undefined) {
    second = sessionDate.getSeconds() }
  if (second === undefined) { second = now.getSeconds() }

  return new Date(year, month - 1, day, hour, minute, second)
}

let ukDateFormat = new Intl.DateTimeFormat('en-GB',
  {month: 'long', day: 'numeric', hour: 'numeric'}).format

// Session information.
let session = {}

// Read some natural language input, return responses
// as {text: String} from answer().
// input: string or {text}.
function respond(input, answer) {
  if (typeof input === 'string') {
    input = {text: input}
  }
  let query = bot.guess(input.text)
  if (query.label === 'locate' &&
      (session.askedOrigin || session.askedDestination)) {
    query.label = 'search'
  }

  if (query.label === 'search') {
    if (session.askedDestination) {
      session.destination = query.parameters.location || session.origin
    } else {
      session.origin = query.parameters.location || session.origin
      session.destination = query.parameters.destination || session.destination
    }
    session.askedOrigin = false
    session.askedDestination = false

    if (session.origin !== undefined &&
        session.destination !== undefined) {
      let origin = station.id(session.origin)
      let destination = station.id(session.destination)
      session.departure = buildDate(
        query.parameters.departure, session.departure)
      let departure = session.departure
      if (origin !== undefined && destination !== undefined) {
        answer({text: `Let me see what I can find on ${
          ukDateFormat(session.departure)}…`})
        travel.search(origin.id, destination.id, {departure})
        .then(travelPlans => answer({text: stringTravelPlans(travelPlans)}))
        .catch(e => { console.error(e); answer({text: stringError(e)}) })
      }
    // If we have not returned yet, we are missing data.
    } else if (session.origin === undefined &&
        session.destination === undefined) {
      answer({text: 'Well, where will you come from, and where will you go, ' +
        'Cotton-Eye Joe?'})
    } else if (session.origin === undefined) {
      answer({text: 'Where will you leave from?'})
      session.askedOrigin = true
    } else {
      answer({text: 'Where do you want to go?'})
      session.askedDestination = true
    }
  } else if (query.label === 'locate') {
    session.location = query.parameters.location || session.location
    let location = station.id(session.location)
    if (location !== undefined) {
      let lat = location.lat
      let long = location.long
      if (lat !== "" && long !== "") {
        let mapLink = `https://www.google.com/maps/@${lat},${long},15z`
        answer({text: `I found it here: ${mapLink}.`})
      } else {
        answer({text: "I don't know where that is."})
      }
    } else {
      answer({text: "I cannot find it."})
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
      'My author is Thaddée Tyl. ' +
      'I live at https://github.com/espadrine/travelbot.'})
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

function stringError(e) {
  return 'Sorry, I got confused. Can you ask again differently?\n' +
    '(All I know is “' + e + '”)'
}

module.exports = respond
