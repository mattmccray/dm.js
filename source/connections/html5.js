// ===========================
// = WhatWG/HTML5 Connection =
// ===========================
DM.Html5Connection = Class.create({
  
  initialize: function(connInfo) {
//    console.log('Creating WhatHg/HTML5 database connection...');
    this.connInfo = connInfo;
    this.type = 'html5';
    this.connection = openDatabase(connInfo.name, connInfo.description, connInfo.displayName || connInfo.name, connInfo.size);
  },
  
  execute: function(sql, params, callback, options) {
    this.connection.transaction(function(txn){ 
      txn.executeSql(sql, $A(params).flatten(), function(t, results){ 
        // build ResultSet object of some kind... Maybe?
        callback(results);
      },
      function(err){
        // Crap! There was an error!
      }); 
    });
  }
  
});
