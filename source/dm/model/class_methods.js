
DM.Model = (function(){ // Closure to allow truly private methods...
  
  return Class.create({

    initialize: function(table_name, model_def) {
      if(!model_def){ throw "Model definitions missing!"; }
      
      this.table_name = table_name;
      this.model_def = model_def;
      
      DM.Model.knownModels.set(table_name, this);
    },
    
    initSchema: function() {
      if(this.model_def.schema) {
        var dsl = new DM.Schema.DSL(this).id(); // Auto generate PK?

        this.model_def.schema(dsl); // Exec Schema DSL

        this.fields = dsl.fields; // Array
        this.columns = dsl.columns; // Hash
        this.eventHandlers = dsl.eventHandlers;
        this.relationships = dsl.relationships;

        delete this.model_def['schema'];
        
        // Need to create a custom 'instance' class with DM.ModelInstance as a parentClass.
        // This class would have all the relationships defined already, so they dont' have
        // to be rebound all the time.

      } else {
//        console.log("No schema was provided for "+ table_name)
        this.fields = [];
        this.columns = [];
        this.eventHandlers = {};
        this.relationships = [];
      }

    },

    find: function(idOrWhere, callback) {
      var self = this;
      DM.DB.execute("select * from "+ this.table_name +" where id = "+ idOrWhere +";", [], function(results){
        if(results.rows.length > 0) {
          var model = new DM.ModelInstance(results.rows.item(0), self);
          callback(model);
        } else {
          throw ("find( "+ idOrWhere +" ) returned 0 results.");
        }
      });
    },
    
    findWhere: function(clause, callback) {
      var ds = new DM.Dataset(this.table_name),
          self = this;
      ds.filter(clause);
      DM.DB.execute(ds.toSql(), ds.values, function(results){
        var models = [];
        for (var i=0; i < results.rows.length; i++) {
          var row = results.rows.item(i);
          models.push( new DM.ModelInstance(row, self)  );
        };
        callback(models);
      });
    },
    
    filter: function(clause) {
      var ds = new DM.Dataset(this.table_name, { asModel:true, modelKlass:this });
      return ds.filter(clause);
    },

    all: function(callback) { // where, 
      var self = this;
      DM.DB.execute("select * from "+ this.table_name +";", [], function(results){

        var models = [];
        for (var i=0; i < results.rows.length; i++) {
          var row = results.rows.item(i);
          models.push( new DM.ModelInstance(row, self)  );
        };

        callback( models );
      })
    },
    
    count: function(callback) {
      /// Ugh, here we go...
      var self    = this,
          count   = 0;
      
      DM.DB.execute("select count(id) as cnt from "+ this.table_name +";", [], function(results){
        count = results.rows.item(0)['cnt'];
        callback(count);
      });
    },

    destroyAll: function(callback) {
      var self = this,
          callback = callback || function(){};
      self.all(function(models){
        var modelCount = models.length,
            currentCount = 1;
        models.each(function(mdl){ 
          mdl.destroy(function(){
            currentCount++;
            if(currentCount == modelCount) {
              callback(models);
            }
          })
        });
      })
    },

    create: function(attributes) {
      return new DM.ModelInstance((attributes || {}), this);
    },
    
    _handleEvent: function(evt, model) {
      if(evt in this.eventHandlers) {
        this.eventHandlers[evt].each(function(handler){
          handler(model);
        });
      }
    }

  })
})(); // Closure


DM.Model.knownModels = $H();

DM.Model.createModels = function(){
  if(DM.DB) {
    DM.Model.knownModels.each(function(modelDef){ // klass, tableName
      var klass     = modelDef.value,
          tableName = modelDef.key;
      klass.initSchema();
      DM.DB.execute( DM.SQL.createForModel( klass ), [], function() {
//        console.log("Table created:", tableName);
        klass.tableCreated = true;
      });
    });
  } else {
    console.log("DM.Model.createModels: Error: No database is defined.");
  }
};


/*
var Script = new DM.Model('scripts', {
  
  schema: function(t){ 
    t.text('title');
    t.text('source');
    t.text('html');
    t.timestamps('on'); // Creates created_on && updated_on
    
    t.hasMany('Revision', { cascadeDelete:true });
  }
});
*/
