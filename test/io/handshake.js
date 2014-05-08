'use strict';

var http = require('http');
var io   = require('socket.io-client');
var should = require('should');
var Binsock = require('../..');


describe('Socket.IO compaible', function () {
  var app;
  var client;
  var server;

  function connection (ws){
    server = ws;
  }

  before(function (done) {
    app = http.createServer();

    app.port = Math.floor(Math.random() * 0x8000) + 0x8000;

    var bss = new Binsock({server: app});

    bss.on('connection', connection);

    app.listen(app.port, done);
  });
  after(function (done) {
    app.close();
    done();
  });
  describe('handshake endpoint', function () {

    it('should be requested', function (done) {

      app.once('request', Binsock.middleware());
      client = io.connect('http://0.0.0.0:' + app.port);
      client.socket.on('connect', done);
    });

    it('should acccept JSON messages from socket.io clients', function (done) {
      server.on('event', function (name, data) {
        name.should.equal('test');
        data.x.should.equal(3);
        done();
      });
      client.emit('test', {x:3});
    });
  });
});