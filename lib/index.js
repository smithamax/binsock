var noop = function () {};

module.exports = Socket;

if (typeof Blob === 'undefined') { Blob = function () { } }
if (typeof Buffer === 'undefined') { Buffer = function () { } }

/**
 * BinSock
 * @param {WebSocket} ws WebSocket connection
 */
function Socket(ws) {
  this.endpoint = '';
  this.ws = ws;
  this._messages = 0;
  this._wait = {};
  this._listeners = {};

  var socket = this;

  this.ws.addEventListener('open', function () {});
  this.ws.addEventListener('message', function (e) {
    socket._process(e.data, {
      binary: typeof e.data !== 'string'
    });
  });
  this.ws.addEventListener('close', function () {});
}

function debug() {
  // console.log.apply(console, arguments);
}

var TYPE_DISCONNECT = '0';
var TYPE_CONNECT = '1';
var TYPE_HEARTBEAT = '2';
var TYPE_MESSAGE = '3';
var TYPE_JSON = '4';
var TYPE_EVENT = '5';
var TYPE_ACK = '6';
var TYPE_ERROR = '7';
var TYPE_NOOP = '8';
var TYPE_EVENT_BINARY = 'a';
var TYPE_ACK_BINARY = 'b';


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
    var params = [].slice.call(arguments, 1, al);

    var binary = params[params.length - 1];
    if (binary instanceof Buffer || binary instanceof Blob) {
      params.pop();
      type = TYPE_EVENT_BINARY;
    } else {
      binary = false;
    }
    data.args = params;

    this._send(type, id, JSON.stringify(data));
    if (binary) {
      this.ws.send(binary);
    }
    return;

  }

  this._send(type, id, data);

};

/**
 * Set event listener
 * @param  {String}   name
 * @param  {Function} handler
 */
Socket.prototype.on = function (name, handler) {
  this._listeners[name] = handler;
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
  var lastarg = arguments[arguments.length - 1];
  if (lastarg instanceof Buffer || lastarg instanceof Blob) {
    this._send(TYPE_ACK_BINARY, '', mid + '+' + JSON.stringify([].slice.call(arguments, 2, arguments.length - 1)));
    this.ws.send(lastarg);
  } else {
    this._send(TYPE_ACK, '', mid + '+' + JSON.stringify([].slice.call(arguments, 2)));
  }
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

  }
};

/**
 * Handle a remote message on the underlying protocol
 * @param  {String,Buffer,Blogb} data  The raw data on the underlying protocol
 * @param  {Object} flags flags.binary
 */
Socket.prototype._process = function (data, flags) {
  var bin;
  if (flags.binary) {
    var _nextBin = this._nextBin;
    type = _nextBin[0];
    mid = _nextBin[1];
    bin = data;
    data = _nextBin[2];
  } else {
    var str = data;
    var pos = [0];
    pos[1] = str.indexOf(':', 2);
    pos[2] = str.indexOf(':', pos[1] + 1);

    var type = str.substring(0, 1);
    var mid = str.substring(2, pos[1]);
    var endpoint = str.substring(pos[1] + 1, pos[2]);
    var data = str.substring(pos[2] + 1);
    if (type === TYPE_ACK_BINARY || type === TYPE_EVENT_BINARY) {
      this._nextBin = [type, mid, data];
      return;
    }
  }

  this._recv(type, mid, data, bin);

};

/**
 * Handle a remote message
 * @param  {String} type Message type
 * @param  {String} mid  Message ID
 * @param  {String} data Message payload
 */
Socket.prototype._recv = function (type, mid, data, bin) {
  var handler;
  var args = [];
  if (type === TYPE_JSON) {
    handler = this._listeners.message;
    try {
      args = [JSON.parse(data)];
    } catch (ex) {
      return;
    }
  } else if (type === TYPE_MESSAGE) {
    handler = this._listeners.message;
    args = [data];
  } else if (type === TYPE_EVENT) {
    try {
      data = JSON.parse(data);      
    } catch (ex) {
      return;
    }
    args = data.args;
    handler = this._listeners[data.name];
  } else if (type === TYPE_EVENT_BINARY) {
    try {
      data = JSON.parse(this._nextBin[2]);      
    } catch (ex) {
      return;
    }
    args = data.args;
    [].push.call(args, bin);
    handler = this._listeners[data.name];
  } else if (type === TYPE_ACK || type === TYPE_ACK_BINARY) {
    var midP = data.indexOf('+');
    var ack = data.substring(0, midP);
    var fn = this._wait[ack];
    if (!fn) return;
    delete this._wait[ack]
    if (bin) {
      return fn.call(this, bin);
    }
    try {
      fn.apply(this, JSON.parse(data.substring(midP + 1)));      
    } catch (ex) {

    }
    return;
  }
  try {
    [].push.call(args, this._ack.bind(this, mid, {}));
  } catch (ex) {
    debug(ex);
    return;
  }

  if (!handler) return;
  if (!Array.isArray(args)) return;
  handler.apply(this, args);

}