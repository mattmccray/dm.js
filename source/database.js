// database.js
DM.Database = new Class({
  
  Implements: [Options, Events],
  
  options: {
    name:         '',
    description:  '',
    displayName:  false,
    size:         10240,
    preferGears:  false
    // onResults: $empty ????
  },
  
  initialize: function(options) {
    this.setOptions(options);
    // This will be the appropriate DB Connection
    this.conn = DM.ConnectionFactory.getConnection( this.options ); 
    DM.Model.DB = this;
  },
  
  execute: function() {
    var args = $A(arguments).link({sql: String.type, callback: Function.type, params: Array.type, options: Object.type});

    if(!args.sql){ throw "You must provide SQL to execute"; }
    
    var sql      = args.sql,
        callback = args.callback ? args.callback : function(){ /*console.log('No callback defined')*/ },
        params   = args.params || [],
        options  = args.options || {};
    
//    console.log('execute( "'+ sql +'", ['+ params.join(', ') +'], '+ typeof callback +' )');
    
    this.conn.execute(sql, params, function(results){
      // TODO: Should Database.execute do anything with the results before calling the callback?
      callback(results);
    }, options);
  }
  
});

/* For testing: 

(new DM.Database()).execute( "SELECT * FROM TEST WHERE id = ? and name = ?", 10, 'Matt' )

*/