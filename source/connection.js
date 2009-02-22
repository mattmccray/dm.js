//= require "connections/air"
//= require "connections/gears"
//= require "connections/html5"

DM.ConnectionFactory = {
  
  connectionPool: $H(), // Well, kind of...
  
  getConnection: function(connInfo) {
    if( this.connectionPool.get(connInfo.name) ) { 
      return this.connectionPool.get(connInfo.name); 
    }
    
    var conn = false;
    
    // Detect DB type...
    if(typeof openDatabase != 'undefined') {
//      console.log('Using Html5 db engine...')
      conn = new DM.Html5Connection(connInfo);
      
    } else if(typeof GearsFactory != 'undefined') {
//      console.log('Using Google Gears engine...')
      conn = new DM.GearsConnection(connInfo);
    } else if(window.runtime && typeof window.runtime.flash.data.SQLConnection != 'undefined') {
//      console.log('Using Adobe AIR db engine...')
      conn = new DM.AirConnection(connInfo);
    }
    
    if(conn) {
      this.connectionPool.set(connInfo.name, conn);
      return conn;
    } else {
      this.connectionPool.set(connInfo.name, null);
      throw "Unable to find a supported database!"
    }
  }

};
