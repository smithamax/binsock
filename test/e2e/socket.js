var Server  = require('../../'),
    Socket  = Server.Socket,
    sinon   = require('sinon'),
    should  = require('should'),
    util    = require('util'),
    Emitter = require('events').EventEmitter;

util.inherits(WebSocket, Emitter);

function WebSocket () {
  Emitter.call(this);
}

WebSocket.prototype.addEventListener = function (name, fn) {
  this.on(name, fn);
}
WebSocket.prototype.send = function (data) {
  this.target.emit('message', {data: data});
};
WebSocket.prototype.readyState = 1;
WebSocket.prototype.OPEN = 1;

describe('Socket connection', function () {

  this.timeout(10);

  var a;
  var b;

  before(function () {
    var wsa = new WebSocket;
    var wsb = new WebSocket;

    wsa.target = wsb;
    wsb.target = wsa;

    a = new Socket(wsa);
    b = new Socket(wsb);
  })

  var buffer = new Buffer(1);

  beforeEach(function () {
    // Clear all the listeners
    a.removeAllListeners();
    b.removeAllListeners();
  })

  it('should send an event', function (done) {
    b.on('event', function (name) {
      name.should.equal('test');
      done();
    });
    a.emit('test', null);
  });
  it('should send a json message', function (done) {
    b.on('message', function (o) {
      o.x.y.z.should.equal(0);
      done();
    });
    a.emit({
      x: {
        y: {
          z: 0
        }
      }
    });
  });
  it('should send a string', function (done) {
    b.on('message', function (string) {
      string.should.equal('foo');
      done();
    })
    a.emit('foo');
  });
  it('should send acks', function (done) {

    var mock = sinon.mock();

    mock.yields(null);

    b.on('message', function (name, done) {
      done(null);
    });
    a.emit('messagetext', done);

  });
});