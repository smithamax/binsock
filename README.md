binsock
=======

Binary-compatible and socket-io compatible WebSocket library, for node.js and web browsers.

```javascript
var Socket = require('binsock');

var ws = new WebSocket('ws://localhost:9999/1?access_token=' + access_token);

var socket = new Socket(ws);

socket.emit('item', {x: 0,y: 0}, function (err, res) {
  if (err) throw err;

  console.log(res.location.lat, res.location.long);
});

socket.on('something', function (data, a, b, ack) {
  if (a && b) {
    ack(null, 2);
  } else {
    ack(null, 1);
  }
})

```

[![Build Status](https://travis-ci.org/aantthony/binsock.png?branch=master)](https://travis-ci.org/aantthony/binsock)