var http = require('http');
var ws   = require('ws');
var io   = require('socket.io-client');
var should = require('should');
var Socket = require('../..');


describe('Socket.IO compaible', function () {
  var app;
  var client;
  var server;

  function connection (ws){
    server = new Socket(ws);
  }

  before(function (done) {
    app = http.createServer();

    app.port = Math.random() * 35000 + 35000;

    var wss = new ws.Server({server: app});

    wss.on('connection', connection);

    app.listen(app.port, done);
  });
  after(function (done) {
    app.close();
    done();
  });
  describe('handshake endpoint', function () {

    it('should be requested', function (done) {

      app.once('request', Socket.middleware());
      client = io.connect('http://0.0.0.0:' + app.port);
      client.socket.on('connect', done);
    });

    it('should acccept JSON messages from socket.io clients', function (done) {
      server.on('test', function (data) {
        data.x.should.equal(3);
        done();
      });
      client.emit('test', {x:3});
    });
  });
});