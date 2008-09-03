//  core.js
var DM = {
  
  version: {
    major: 0,
    minor: 1,
    build: 1,
    toString: function() {
      return [this.major, this.minor, this.build].join('.');
    }
  },
  
  merge: function(from, to) {
    for(prop in from) {
      if(from.hasOwnProperty(prop)) {
        to[prop] = from[prop];
      }
    }
    return to;
  }
  
}

