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

To mount the handshake endpoint in express:
```javascript
var express = require('express');
var app = express();
app.use('/socket.io', Socket.middleware());

var exports = module.exports = http.createServer(app);
var ws = require('ws');
var Socket = require('binsock');
var wss = new ws.Server({server: exports});
wss.on('connection', function (ws) {
  var req = ws.upgradeReq;
  req.query = qs.parse(req.url.substring(req.url.indexOf('?') + 1));

  var socket = new Socket(ws);
  socket.emit('welcome', {text: 'Hello World!'});
});

exports.listen(process.env.PORT || 8000);

```


[![Build Status](https://travis-ci.org/aantthony/binsock.png?branch=master)](https://travis-ci.org/aantthony/binsock) [![Coverage Status](https://coveralls.io/repos/aantthony/binsock/badge.png?branch=master)](https://coveralls.io/r/aantthony/binsock?branch=master)