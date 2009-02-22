// ==================
// = Air Connection =
// ==================
DM.AirConnection = Class.create({
  initialize: function(connInfo) {
//    console.log('Creating Air database connection...');
    this.type = 'air';
    this.connInfo = connInfo;
    this.connection = new air.SQLConnection();
    this._dbFile = air.File.applicationStorageDirectory.resolvePath( connInfo.name );
    this.connection.openAsync(this._dbFile); // Would I rather .open() it instead?
  },
  
  execute: function(sql, params, callback, options) {
    var statement = new air.SQLStatement(),
        count = 0;
    statement.sqlConnection = this.connection;
    
    // Air uses named params... WhatWG/HTML5 doesn't. We're conforming more to the HTML5 psuedo-spec, 
    // so we don't support named params either.
    statement.text = sql.replace(/(\?)/g, function(riddler){
      // TODO: Do I need to add 65 and use String.fromCharCode to use alphas instead of numerics?
      return ":"+ count++;
    });
    
    $H(params).each(function(pair){
      statement.parameters[":" + pair.key] = pair.value;
    });
    
    statement.addEventListener(air.SQLEvent.RESULT, function(){ 
    // Make the results match a SQLResultSet:
/*
        SQLResultSet {
          readonly attribute int insertId;
          readonly attribute int rowsAffected;
          readonly attribute SQLResultSetRowList rows;
        }
        SQLResultSetRowList {
          readonly attribute unsigned long length;
          [IndexGetter] DOMObject item(in unsigned long index);
        };
*/      
      callback(statement.getResult(), event); 
    });
    
    statement.addEventListener(air.SQLErrorEvent.ERROR, function(){ 
      // Crap! There was an error!
    });

    statement.execute();
  }
});

(function(rt){
  if(!rt) return;
  if(window.air && air.Introspector)
    window.console = air.Introspector.Console;
  else {
    window.console = {
      log: function(msg) {
        rt.trace(msg);
      },
      info: function(msg) {
        console.log('INFO: '+ msg);
      }
    }  
  }
})(window.runtime);