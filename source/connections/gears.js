// ====================
// = Gears Connection =
// ====================
DM.GearsConnection = Class.create({
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
    var results = this.connection.execute(sql, $A(params).flatten()),
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
