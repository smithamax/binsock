/*jshint nomen: false */

var Socket = require('../../'),
    sinon  = require('sinon');

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
      socket._process('6:::12+[3,4]', {});
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

      mock.expects('_ack').once().on(socket);

      var expectation = sinon.mock();
      expectation.once().withArgs("3", 2).yields(30, 32);
      socket.on('test', expectation);

      socket._recv('5', '23', JSON.stringify({args:["3", 2], name:'test'}));

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
    it('should handle binary acknowledgments', function () {
      
      var b = new Buffer(1);
      var wsocket = socket.ws = {};
      wsocket.send = sinon.mock().withArgs(b);

      var sender = {};
      mock.expects('_send').once().withArgs('b', '', '888+[]');

      socket._ack('888', sender, b);

      wsocket.send.verify();

    });

    it('should handle json + binary acknowledgments', function () {
      
      var b = new Buffer(1);
      var wsocket = socket.ws = {};
      wsocket.send = sinon.mock().withArgs(b);

      var sender = {};
      mock.expects('_send').once().withArgs('b', '', '888+[3]');

      socket._ack('888', sender, 3, b);

      wsocket.send.verify();

    });
  });

  describe('#emit', function () {
    it('should create a socket.io compatible event', function () {
      mock.expects('_send');
      socket.emit('explode', {}, function () {});
    });

    it('should create binary events', function () {
      var b = new Buffer(1);
      var wsocket = socket.ws = {};
      wsocket.send = sinon.mock().withArgs(b);

      mock.expects('_send').withArgs('a', '123', JSON.stringify({name: 'explode', args: []}));
      socket.emit('explode', b, function () {});

      wsocket.send.verify();

    });

    it('should create json + binary events', function () {
      var b = new Buffer(1);
      var wsocket = socket.ws = {};
      wsocket.send = sinon.mock().withArgs(b);
      var json = {x: {y: 2}};

      mock.expects('_send').withArgs('a', '123', JSON.stringify({name: 'explode', args: [json]}));
      socket.emit('explode', json, b, function () {});

      wsocket.send.verify();

    });

    it('should register the ack handler', function () {
      mock.expects('_send').once();

      var stub = sinon.stub();

      socket.emit('subscribe', 999, stub);
      socket._messages.should.equal(124);
      socket._wait[123].should.equal(stub);
    })

  });

});