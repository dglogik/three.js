(function() {
  // lightweight event emitter implementation for browser
  // has probably been passed around tons of times now
  function EventEmitter() {
    this.listeners = {};
  }

  EventEmitter.prototype = {
    emit: function(name) {
      var args = [];
      var count = 1;
      var length = arguments.length;

      for(; count < length; count++) {
        args.push(arguments[count]);
      }

      (this.listeners[name] || []).forEach(function(f) {
        f.apply(this, args);
      }, this);

      return this;
    },
    on: function(name, listener) {
      if(!this.listeners[name])
        this.listeners[name] = [];
      this.listeners[name].push(listener);
      return listener;
    },
    removeListener: function(name, listener) {
      if(!this.listeners[name] || this.listeners[name].indexOf(listener) === -1)
        return null;
      return this.listeners[name].splice(this.listeners[name].indexOf(listener), 1);
    }
  };

  // event emitter used for parameter updates
  var frame = new EventEmitter();
  frame._readyListeners = [];

  frame.onReady = function(listener) {
    frame._readyListeners.push(listener);
  };

  // raw object to get/set values, setting requires a call to pushParams
  frame.params = {};

  // could be used elsewhere in application, which is why it's publically exposed
  frame.EventEmitter = EventEmitter;

  // is the value a table?
  frame.isTable = function(val) {
    return (val != null && typeof(val) == 'object' && val.hasOwnProperty('cols') && val.hasOwnProperty('rows'));
  };

  // pushes a parameter change upstream to DGLux
  frame.updateParam = function(key, value) {
    var map = {};
    map[key] = value;
    frame.params[key] = value;

    window.parent.postMessage({
      dgIframe: dgIframeId,
      changes: map
    }, '*');
  };

  // pushes all params in dgframe.params upstream to DGLux
  frame.pushParams = function() {
    var params = frame.params;
    Object.keys(params).forEach(function(key) {
      frame.updateParam(key, params[key]);
    });
  };

  // used in messages between iframe and DGLux
  var dgIframeId;

  // interface to the dglux5 application
  function onDGFrameMessage(e) {
    var data = e.data;
    if(typeof(data) === 'object') {
      // initial message
      if(data.hasOwnProperty('dgIframeInit')) {
        dgIframeId = data['dgIframeInit'];

        if(window.parent != null) {
          // the first post back shouldn't contain any data change
          window.parent.postMessage({
            dgIframe: dgIframeId
          }, '*');

          frame._readyListeners.forEach(function(listener) {
            listener();
          });
        }
      } else if(data.hasOwnProperty('dgIframeUpdate')) {
        var updates = data['updates'];

        if(typeof(updates) == 'object') {
          for (key in updates) {
            if (updates.hasOwnProperty(key)) {
              // an example of using event emitter would be like...
              // dgframe.on('test_param', function(value, isTable) { /* ... */});
              frame.emit(key, updates[key], frame.isTable(updates[key]));
              frame.params[key] = updates[key];
            }
          }
        }
      }
    }
  }

  window.addEventListener('message', onDGFrameMessage);

  try {
    if(module && module.exports) {
      module.exports = frame;
    } else {
      window.dgframe = frame;
    }
  } catch(e) {
    window.dgframe = frame;
  }
})();
