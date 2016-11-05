const travelbot = require('.')
const assert = require('assert')
const Manchester = "8044"
const London = "5892"

const queries = [
  {
    query: "I would like to go from Manchester to London.",
    result: {label: 'search', parameters: {location: Manchester, destination: London}},
  },
  {
    query: "I'm in Manchester. Let's go to London.",
    result: {label: 'search', parameters: {location: Manchester, destination: London}},
  },
]

const checkQueries = function(queries) {
  queries.forEach(query => {
    let guess = travelbot.queread.guess(query.query)
    assert.equal(guess.label, query.result.label)
    assert.deepEqual(guess.parameters, query.result.parameters)
  })
}
