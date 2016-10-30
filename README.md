```js
const travelbot = require('travelbot')
console.log(travelbot.respond({text: 'Get me from Paris to Berlin.'}).text)
```

Relies on [queread][] for natural language processing and [travel-scrapper][]
for data.

[queread]: https://github.com/espadrine/queread
[travel-scrapper]: https://github.com/espadrine/travel-scrapper

# Interface
```
Hello!
 Hello, human.
Who are you?
 I give travel information across Europe.
 My understanding relies on a word graph with edges weighted by the meaning
 provided during training.
 My author is Thaddée Tyl.
How do I go from Manchester to Milano on Saturday?
 Let me see what I can find…
 1. 272.90 €
   08:30 Manchester
   10:05 London
   12:21 Paris
   16:44 Milano
You suck.
 I will improve.
(Impossible query.)
 Sorry, I do not understand what you said. Ask me: “What can you understand?”
Partial query to get a train somewhere.
 Well, where will you come from, and where will you go, Cotton-Eye Joe?
```
