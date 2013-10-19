/*jshint nomen: false */

var Socket = require('../../'),
    sinon  = require('sinon');

describe('Socket', function () {
  this.timeout(50);

  var socket = {};

  beforeEach(function () {
    socket._messages = 123;
  });

  var ws = {
    addEventListener: function () {},
    send: function () {}
  };

  it('should attach event listener', function () {
    var mock = sinon.mock(ws);

    mock.expects('addEventListener').thrice();
    socket = new Socket(ws);

    mock.verify();
  });

  describe('#_process', function () {
    it('should call _recv for an ACK', function () {
      var mock = sinon.mock(socket);
      mock.expects('_recv').once().withArgs('6', '', '12+[3,4]');
      socket._process('6:::12+[3,4]', {});

      mock.verify();
    });
  });

  describe('#_recv', function () {
    it('should call the ack listener', function () {
      var expectation = sinon.expectation.create();

      socket._wait['12'] = expectation;

      expectation.once().withArgs(3);

      socket._recv('6', '', '12+[3,4]');

      expectation.verify();
    });

    it('should call the event handler', function () {

      var callback = sinon.mock(socket);
      callback.expects('_ack').once().on(socket);

      var expectation = sinon.mock();
      expectation.once().withArgs("3", 2).yields(30, 32);
      socket.on('test', expectation);

      socket._recv('5', '23', JSON.stringify({args:["3", 2], name:'test'}));

      expectation.verify();

      callback.verify();

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
      var stub = sinon.stub(socket, '_send');
      var sender = {};
      var fn = socket._ack.bind(socket, '888', sender);

      fn.should.not.throw();
      fn.should.throw();

      stub.restore();
    });
    it('should handle json acknowledgments', function () {
      var mock = sinon.mock(socket);
      var sender = {};
      mock.expects('_send').once().withArgs('6', '', '888+[3,"a"]');

      socket._ack('888', sender, 3, 'a');

      mock.verify();
    });
    it('should handle binary acknowledgments', function () {
      
      var b = new Buffer(1);
      var wsocket = socket.ws = {};
      wsocket.send = sinon.mock().withArgs(b);

      var mock = sinon.mock(socket);
      var sender = {};
      mock.expects('_send').once().withArgs('b', '', '888+[]');

      socket._ack('888', sender, b);

      mock.verify();
      wsocket.send.verify();

    });

    it('should handle json + binary acknowledgments', function () {
      
      var b = new Buffer(1);
      var wsocket = socket.ws = {};
      wsocket.send = sinon.mock().withArgs(b);

      var mock = sinon.mock(socket);
      var sender = {};
      mock.expects('_send').once().withArgs('b', '', '888+[3]');

      socket._ack('888', sender, 3, b);

      mock.verify();
      wsocket.send.verify();

    });
  });

  describe('#emit', function () {
    it('should create a socket.io compatible event', function () {
      var mock = sinon.mock(socket);
      mock.expects('_send');

      socket.emit('explode', {}, function () {});

      mock.verify();
    });

    it('should create binary events', function () {
      var b = new Buffer(1);
      var wsocket = socket.ws = {};
      wsocket.send = sinon.mock().withArgs(b);
      var mock = sinon.mock(socket);

      mock.expects('_send').withArgs('a', '123', JSON.stringify({name: 'explode', args: []}));

      socket.emit('explode', b, function () {});

      mock.verify();
      wsocket.send.verify();

    });

    it('should create json + binary events', function () {
      var b = new Buffer(1);
      var wsocket = socket.ws = {};
      wsocket.send = sinon.mock().withArgs(b);
      var mock = sinon.mock(socket);
      var json = {x: {y: 2}};

      mock.expects('_send').withArgs('a', '123', JSON.stringify({name: 'explode', args: [json]}));

      socket.emit('explode', json, b, function () {});

      mock.verify();
      wsocket.send.verify();

    });

    it('should register the ack handler', function () {
      var mock = sinon.mock(socket);

      mock.expects('_send').once();

      var stub = sinon.stub();

      socket.emit('subscribe', 999, stub);
      socket._messages.should.equal(124);
      socket._wait[123].should.equal(stub);
      mock.verify();
    })

  });

});