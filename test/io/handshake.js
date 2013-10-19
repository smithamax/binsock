var http = require('http');
var ws   = require('ws');
var io   = require('socket.io-client');


describe.skip('Socket.IO compaible', function () {
  var server;

  function connection (){

  }

  before(function (done) {
    server = http.createServer();

    server.port = Math.random() * 35000 + 35000;

    var wss = new ws.Server({server: server});

    wss.on('connection', connection);

    server.listen(server.port, done);
  });
  after(function (done) {
    server.close();
    done();
  });
  describe('handshake endpoint', function () {

    it('should be requested', function (done) {

      var client = io.connect('http://0.0.0.0:' + server.port);
      server.once('request', function (req, res) {
        res.end(JSON.stringify({}));
        done();
      });
    });

  })
});