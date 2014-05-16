binsock
=======

Binary-compatible and socket-io compatible WebSocket library, for node.js and web browsers.

Client:
```javascript
var Socket = require('binsock').Socket;

var ws = new WebSocket('ws://localhost:9999/1?access_token=' + access_token);

var socket = new Socket(ws);

socket.emit('item', {x: 0,y: 0}, function (err, res) {
  if (err) throw err;

  console.log(res.location.lat, res.location.long);
});

socket.on('event', function (name, data, a, b, ack) {
  if (a && b) {
    ack(null, 2);
  } else {
    ack(null, 1);
  }
})

```
Server:
To mount the handshake endpoint in express:
```javascript
var express = require('express');
var Binsock = require('binsock');
var app = express();
app.use('/socket.io', Binsock.middleware());

var exports = module.exports = http.createServer(app);
var wss = new Binsock(exports);
wss.on('connection', function (socket) {

  var req = socket.ws.upgradeReq;
  req.query = qs.parse(req.url.substring(req.url.indexOf('?') + 1));

  socket.emit('message', {text: 'Welcome!'});
  socket.on('event', function (name, arg0, callback) {
  	console.log('Got event of type ' + name + ':', arg0);
  });
})

exports.listen(process.env.PORT || 8000);

```


[![Build Status](https://travis-ci.org/aantthony/binsock.png?branch=master)](https://travis-ci.org/aantthony/binsock) [![Coverage Status](https://coveralls.io/repos/aantthony/binsock/badge.png?branch=master)](https://coveralls.io/r/aantthony/binsock?branch=master)
