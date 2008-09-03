//  connection.js
DM.ConnectionFactory = {
  
  connectionPool: {}, // Well, kind of...
  
  getConnection: function(connInfo) {
    if(connInfo.name in this.connectionPool) { 
      return this.connectionPool[connInfo.name]; 
    }
    
    var conn = false;
    
    // Detect DB type...
    if(typeof openDatabase != 'undefined') {
      conn = new DM.WhatHgConnection(connInfo);
      
    } else if(typeof GearsFactory != 'undefined') {
      conn = new DM.GearsConnection(connInfo);
      
    } else if(window.runtime && typeof window.runtime.flash.data.SQLConnection != 'undefined') {
      conn = new DM.AirConnection(connInfo);
    }
    
    if(conn) {
      this.connectionPool[connInfo.name] = conn;
      return conn;
    } else {
      this.connectionPool[connInfo.name] = null;
      throw "Unable to find a supported database!"
    }
  }

};


// ====================
// = Gears Connection =
// ====================
DM.GearsConnection = new Class({
  initialize: function(connInfo) {
//    console.log('Creating Gears database connection...');
    this.type = 'gears';
    this.connInfo = connInfo;
    if(!DM.GearsConnection.gearFactory) (function(){
      // Firefox
       if (typeof GearsFactory != 'undefined') {
         DM.GearsConnection.gearFactory = new GearsFactory();
       } else {
         // IE
         try {
           DM.GearsConnection.gearFactory = new ActiveXObject('Gears.Factory');
           // privateSetGlobalObject is only required and supported on WinCE.
           if (DM.GearsConnection.gearFactory.getBuildInfo().indexOf('ie_mobile') != -1) {
             DM.GearsConnection.gearFactory.privateSetGlobalObject(this);
           }
         } catch (e) {
           // Safari
           if ((typeof navigator.mimeTypes != 'undefined')
                && navigator.mimeTypes["application/x-googlegears"]) {
             DM.GearsConnection.gearFactory = document.createElement("object");
             DM.GearsConnection.gearFactory.style.display = "none";
             DM.GearsConnection.gearFactory.width = 0;
             DM.GearsConnection.gearFactory.height = 0;
             DM.GearsConnection.gearFactory.type = "application/x-googlegears";
             document.documentElement.appendChild(DM.GearsConnection.gearFactory);
           }
         }
       }
       if(!DM.GearsConnection.gearFactory) {
        throw "There was an error creating the GearsFactory!"; }
    })();
    this.connection = DM.GearsConnection.gearFactory.create('beta.database');
    this.connection.open(connInfo.name);
  },
  
  execute: function(sql, params, callback, options) {
    var results = this.connection.execute(sql, $splat(params).flatten()),
        lastId = this.connection.lastInsertRowId,
        rows = [];
        (rows.constructor.prototype || rows.prototype).item = function(i) { return this[i]; }
    // Make the results match a SQLResultSet
    if (results) {
      var names = [];
      for(var i = 0; i < results.fieldCount(); i++) {
        names.push(results.fieldName(i));
      }
      while(results.isValidRow()) {
        var row = {};
        for(var i = 0; i < names.length; i++) {
          row[names[i]] = results.field(i);
        }
        rows.push(row);
        results.next();
      }
      results.close();
    }

    callback({insertId:lastId, rowsAffected:0, rows:rows});
  }
});


// ==================
// = Air Connection =
// ==================
DM.AirConnection = new Class({
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
    
    // Air uses named params... WhatHg doesn't. We're conforming more to the HTML5 psuedo-spec, 
    // so we don't support named params either.
    statement.text = sql.replace(/(\?)/g, function(riddler){
      // TODO: Do I need to add 65 and use String.fromCharCode to use alphas instead of numerics?
      return ":"+ count++;
    });
    
    $each(params, function(value, key){
      statement.parameters[":" + key] = value;
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


// ===========================
// = WhatHg/HTML5 Connection =
// ===========================
DM.WhatHgConnection = new Class({
  
  initialize: function(connInfo) {
//    console.log('Creating WhatHg/HTML5 database connection...');
    this.connInfo = connInfo;
    this.type = 'html5';
    this.connection = openDatabase(connInfo.name, connInfo.description, connInfo.displayName || connInfo.name, connInfo.size);
  },
  
  execute: function(sql, params, callback, options) {
    this.connection.transaction(function(txn){ 
      txn.executeSql(sql, $splat(params).flatten(), function(t, results){ 
        // build ResultSet object of some kind... Maybe?
        callback(results);
      },
      function(err){
        // Crap! There was an error!
      }); 
    });
  }
  
});
