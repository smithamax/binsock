var util = require('util');
var EventEmitter = require('events').EventEmitter;

var noop = function () {};

var exports = module.exports = Server;

if (typeof Blob === 'undefined') { Blob = function () { } }
if (typeof Buffer === 'undefined') { Buffer = function () { } }

var TYPE_DISCONNECT = '0';
var TYPE_CONNECT = '1';
var TYPE_HEARTBEAT = '2';
var TYPE_MESSAGE = '3';
var TYPE_JSON = '4';
var TYPE_EVENT = '5';
var TYPE_ACK = '6';
var TYPE_ERROR = '7';
var TYPE_NOOP = '8';

util.inherits(exports, EventEmitter);

util.inherits(Socket, EventEmitter);

/**
 * BinSock
 * @param {WebSocket} ws WebSocket connection
 */
function Server(options) {
  EventEmitter.call(this);
  var server = this;
  var httpServer = options.server;
  var wss = this._wss = new exports.WebSocketServer({server: httpServer});
  wss.on('connection', function (ws) {
    server._emit('connection', new Socket(ws));
  });
}

exports.prototype._emit = exports.prototype.emit;
exports.prototype.emit = function () {
  throw new Error('What are you doing!?');
};

exports.WebSocketServer = require('ws').Server;
exports.Socket = Socket;

exports.middleware = function () {
  return function (req, res, next) {
    var sid = '1234';
    var hearbeat = 60;
    var timeout = 80;
    var transports = ['websocket'];

    var headers = {
      'Content-Type': 'text/plain'
    };

    headers['Access-Control-Allow-Origin'] = req.headers.origin;
    headers['Access-Control-Allow-Credentials'] = 'true';

    res.writeHead(200, headers);
    res.end([sid, hearbeat, timeout, transports.join()].join(':'));
  };
};

function debug() {
  // console.log.apply(console, arguments);
}

function Socket(ws) {
  EventEmitter.call(this);
  this._messages = 0;
  this._wait = {};
  this.endpoint = '';
  this.ws = ws;

  ws.addEventListener('open', noop);
  ws.addEventListener('message', this._process.bind(this));
  ws.addEventListener('close', this._close.bind(this));

  ws.send('1::', noop);

  var interval = setInterval(function () {
    ws.send('2::', function (err) {
      if (err) {
        clearInterval(err);
        // mark as disconnected
      }
    });
  }, 50000);

  if (interval.unref) interval.unref();
  this._interval = interval;
}

Socket.prototype._close = function () {
  if (this._interval) {
    clearInterval(this._interval);
    delete this._interval;
  }
};
Socket.prototype._emit = Socket.prototype.emit;
/**
 * Send an event to the other node
 * @param  {String}   name
 * @param  {Buffer,String,JSON} data
 * @param  {Function} callback
 */
Socket.prototype.emit = function (name, _) {
  var type;
  var id = (this._messages++).toString();

  var al = arguments.length;

  var data;

  var lastarg = arguments[al - 1];

  // the last argument is the callback
  if (typeof lastarg === 'function') {
    id = id + '+';
    this._wait[id] = lastarg;
    al--;
  }

  if (typeof name === 'object') {
    // message
    type = TYPE_JSON;
    data = JSON.stringify(name);
  } else if (al > 1 && typeof name === 'string') {
    // event
    type = TYPE_EVENT;
    data = {
      name: name,
      args: []
    };
  } else if (typeof name === 'string') {
    type = TYPE_MESSAGE;
    data = name;
  }

  if (type === TYPE_EVENT) {
    data.args = [].slice.call(arguments, 1, al);
    this._send(type, id, JSON.stringify(data));
    return;

  }

  this._send(type, id, data);

};

/**
 * Send ACK message for message.
 * 
 * @param  {String} mid      Message ID
 * @param  {}       instance object which is invalidated once this is called
 */
Socket.prototype._ack = function (mid, instance) {
  if (instance) {
    if (instance.done) throw new Error('Message already acknowledged!');;
    instance.done = 1;
  }
  this._send(TYPE_ACK, '', mid + '+' + JSON.stringify([].slice.call(arguments, 2)));
}

/**
 * Send a message using the underlying protocol
 * @param  {String} type Type of message
 * @param  {String} mid  Message ID
 * @param  {String} data They payload
 */
Socket.prototype._send = function (type, mid, data) {
  var msg = type + ':' + mid + ':' + this.endpoint;

  if (data) {
    msg += ':' + data;
  }

  if (this.ws.readyState === this.ws.OPEN) {
    this.ws.send(msg);
  } else {
    this._emit('error', new Error('Message discarded'));
  }
};

/**
 * Handle a remote message on the underlying protocol
 * @param  {String,Buffer,Blogb} data  The raw data on the underlying protocol
 * @param  {Object} flags flags.binary
 */
Socket.prototype._process = function (e) {
  var str = e.data;
  var pos = [0];
  pos[1] = str.indexOf(':', 2);
  pos[2] = str.indexOf(':', pos[1] + 1);

  var type = str.substring(0, 1);
  var mid = str.substring(2, pos[1]);
  var endpoint = str.substring(pos[1] + 1, pos[2]);
  var data = str.substring(pos[2] + 1);
  this._recv(type, mid, data);
};

/**
 * Handle a remote message
 * @param  {String} type Message type
 * @param  {String} mid  Message ID
 * @param  {String} data Message payload
 */
Socket.prototype._recv = function (type, mid, data) {
  var args = [];
  var handler = 'event';
  if (type === TYPE_JSON) {
    handler = 'message';
    try {
      args = [JSON.parse(data)];
    } catch (ex) {
      return;
    }
  } else if (type === TYPE_MESSAGE) {
    handler = 'message';
    args = [data];
  } else if (type === TYPE_EVENT) {
    handler = 'event';
    try {
      data = JSON.parse(data);   
    } catch (ex) {
      return;
    }
    if (data.args === undefined) {
      args = [];
    } else {
      if (!Array.isArray(data.args)) return;
      args = [data.name].concat(data.args);
    }
  } else if (type === TYPE_ACK) {
    var midP = data.indexOf('+') + 1;
    var ack = data.substring(0, midP);
    var fn = this._wait[ack];
    if (!fn) return;
    delete this._wait[ack];
    var json;
    try {
      json = JSON.parse(data.substring(midP));
    } catch (ex) {
      return;
    }
    fn.apply(this, json);
    return;
  }
  try {
    if (mid[mid.length - 1] === '+') {
      mid = mid.substring(0, mid.length - 1);
      [].push.call(args, this._ack.bind(this, mid, {}));
    }
  } catch (ex) {
    debug(ex);
    return;
  }

  if (!Array.isArray(args)) return;
  args.unshift(handler);
  this._emit.apply(this, args);
}