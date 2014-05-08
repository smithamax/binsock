var Binsock = require('../');
var http = require('http');

var app = require('express')();

var html = require('fs').readFileSync(__dirname + '/client.html');

app.get('/', function (req, res) {
  res.write(html);
  res.end();
})
.use('/socket.io', Binsock.middleware());

var server = module.exports = http.createServer(app);

var port = 9090;

var bss = new Binsock({server: server});

var qs = require('querystring');
bss.on('connection', function (socket) {

  var req = socket.ws.upgradeReq;
  req.query = qs.parse(req.url.substring(req.url.indexOf('?') + 1));

  console.log('Got a client:', req.query);
  socket.emit('news', 'test');
  socket.on('event', function (name, data, fn) {
    if (name === 'messagetext') {
      fn('ABC');
    } else if (name === 'itworks') {
      socket.emit('hello', {}, function (eight, four, three) {
        if (eight === 8 && four === 4 && three === 3) {
          console.log('It all works!');
        }
      });
    }
  })
});

server.listen(port, function () {
  console.log('Listening');
});