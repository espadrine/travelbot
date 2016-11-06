const travelbot = require('.')
const assert = require('assert')
const Manchester = "8044"
const London = "5892"

const queries = [
  {
    text: "I would like to go from Manchester to London.",
    result: {label: 'search', parameters: {location: Manchester, destination: London}},
  },
  {
    text: "I'm in Manchester. Let's go to London.",
    result: {label: 'search', parameters: {location: Manchester, destination: London}},
  },
  {
    text: "Manchester - London",
    result: {label: 'search', parameters: {location: Manchester, destination: London}},
  },
]

const checkQueries = function(queries) {
  queries.forEach(query => {
    let guess = travelbot.queread.guess(query.text)
    assert.equal(guess.label, query.result.label,
      `Guessed label ${guess.label} doesn't match intended label ` +
      `${query.result.label} for query "${query.text}".`)
    assert.deepEqual(guess.parameters, query.result.parameters)
  })
}

checkQueries(queries)
