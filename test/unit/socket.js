/*jshint nomen: false */

var Binsock = require('../../'),
    sinon  = require('sinon'),
    Socket = Binsock.Socket,
    should = require('should');

describe('Socket', function () {
  this.timeout(10);

  var socket;
  var mock;

  before(function () {
    var mock = sinon.mock(ws);

    mock.expects('addEventListener').thrice();
    socket = new Socket(ws);

    mock.verify();
  })

  beforeEach(function () {
    mock = sinon.mock(socket);
    socket._messages = 123;
    socket.removeAllListeners();
  });
  afterEach(function () {
    mock.verify();
  })

  var ws = {
    addEventListener: function () {},
    send: function () {}
  };
  

  describe('#_process', function () {
    it('should call _recv for an ACK', function () {
      mock.expects('_recv').once().withArgs('6', '', '12+[3,4]');
      socket._process({data:'6:::12+[3,4]'}, {});
    });
  });

  describe('#_recv', function () {
    it('should call the ack listener', function () {
      var expectation = sinon.expectation.create();

      socket._wait['12+'] = expectation;

      expectation.once().withArgs(3);

      socket._recv('6', '', '12+[3,4]');

      expectation.verify();
    });

    it('should discard invalid messages', function () {
      socket._recv('4', '', ']');
    });

    it('should discard invalid binary messages', function () {
      socket._recv('a', '', ']');
    });


    it('should discard invalid events', function () {
      socket._recv('5', '', '{');
    });

    it('should discard non-array events', function () {
      var callback = sinon.spy();
      socket.on('event', callback);
      socket._recv('5', '', '{"name": "x", "args": 999}');
      callback.notCalled.should.be.true;
    });

    it('should discard null-args events', function () {
      var callback = sinon.spy();
      socket.on('event', callback);
      socket._recv('5', '', '{"name": "x", "args": null}');
      callback.notCalled.should.be.true;
    });

    it('should call the event handler', function () {

      mock.expects('_ack').once().on(socket);

      var expectation = sinon.mock();
      expectation.once().withArgs('test', '3', 2).yields([4,3]);
      socket.on('event', expectation);

      socket._recv('5', '23+', JSON.stringify({args:["3", 2], name:'test'}));

      expectation.verify();

    });

  });

  describe('#_send', function () {
    it('should call the underlying layer .send()', function () {

      var expectation = sinon.expectation.create('send');

      socket.ws = {send: expectation};

      expectation.on(socket.ws).withArgs('6:::12+[3,4]');

      socket._send('6', '', '12+[3,4]');
      expectation.verify();

      delete socket.ws;

    });

  });

  describe('#_ack()', function () {
    it('should throw an error if called more than once', function () {
      mock.expects('_send').once();
      var fn = socket._ack.bind(socket, '888', {});

      fn.should.not.throw();
      fn.should.throw();
    });
    it('should handle json acknowledgments', function () {
      mock.expects('_send').once().withArgs('6', '', '888+[3,"a"]');
      socket._ack('888', {}, 3, 'a');
    });
  });

  describe('#emit', function () {
    it('should create a socket.io compatible event', function () {
      mock.expects('_send');
      socket.emit('explode', {}, function () {});
    });

    it('should register the ack handler', function () {
      mock.expects('_send').once();

      var stub = sinon.stub();

      socket.emit('subscribe', 999, stub);
      socket._messages.should.equal(124);
      socket._wait['123+'].should.equal(stub);
    })

  });

});