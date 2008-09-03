// model.js
DM.ModelInstance = new Class({
  initialize: function(attributes, klass) {
    this.table_name = klass.table_name;
    this.fields = klass.fields; // Array
    this.columns = klass.columns; // Hash
    this.klass = klass;
    this.isDirty = false;
    this.attributes = $H(attributes); // Attributes from the SQLResultSet seem to be read-only
    this.id = attributes['id'] || null;
  },
  
  get: function(attribute, raw) {
    if(attribute in this.columns) {
      if(this.columns[attribute].type == 'timestamp') {
        return (raw) ?  this.attributes[attribute] : new Date( this.attributes[attribute] );
      } else {
        return this.attributes[attribute];
      }
    } else {
      throw("'"+ attribute +"' is not a valid column for table "+ this.table_name);
    }
  },

  set: function(attribute, value) {
    if(attribute in this.columns) {
      if(this.columns[attribute].type == 'timestamp') {
        switch($type(value)) {
          case 'date':
            value = value.getTime();
            break;
          case 'string':
            value = Date.parse(value); // Mabye new Date(value).getTime(); ?
            break;
          case 'number':
            value = value;
            break;
          default:
            // What should be done if it's not one of these things?
            value = value;
        }
      }
      if(value != this.attributes[attribute]) {
//        console.log('Setting '+ attribute +" to "+ value)
        this.isDirty = true;
        this.attributes[attribute] = value;
      }
    } else {
      throw("'"+ attribute +"' is not a valid column for table "+ this.table_name);
    }
    return this;  
  },

  update: function(attributes, ignoreErrors) {
    var self = this;
    $H(attributes).forEach(function(value, key){
      // FIXME: Also ensure that the attribute is in the field list?
      if(value != self.get(key)) {
        try {
          self.set(key, value)
          self.isDirty = true;
        } catch(ex) {
          if(!ignoreErrors){ throw ex; }
        }
      }
    });
     // TODO: Attributes to update... Only pull values from hash if key is in field list?
  },
  
  save: function(callback) {
    var self = this,
        callback = callback || function(){};
    if('updated_on' in this.columns){ this.set('updated_on', new Date() ); }
    if('updated_at' in this.columns){ this.set('updated_at', new Date() ); }
    if($type(self.id) == 'number') {
      self.klass._handleEvent('beforeSave', this);
      var cmds = DM.SQL.updateForModel(this)
      DM.Model.DB.execute( cmds[0], cmds[1], function(res) {
        self.klass._handleEvent('afterSave', self);
        callback(self);
      } );
    } else {
      if('created_on' in this.columns){ this.set('created_on', new Date() ); }
      if('created_at' in this.columns){ this.set('created_at', new Date() ); }
      self.klass._handleEvent('beforeCreate', self);
      self.klass._handleEvent('beforeSave', self);
      var cmds = DM.SQL.insertForModel(this);
      DM.Model.DB.execute( cmds[0], cmds[1], function(res) {
        // Need the last inserted ID
        self.id = res.insertId;
        self.attributes['id'] = self.id;
        self.klass._handleEvent('afterSave', self);
        self.klass._handleEvent('afterCreate', self);
        callback(self);
      } );
    }
  },
  
  reload: function(callback) {
    if($type(this.id) == 'number') {
      // Grab the attrs...
    }
  },
  
  destroy: function(callback) {
    if($type(this.id) == 'number') {
      // Kill it!
      var self = this,
          cmds = DM.SQL.deleteForModel(this),
          callback = callback || function(){};
      DM.Model.DB.execute( cmds[0], cmds[1], function(res) {
        self.id = null;
        self.set('id', null);
        callback(self);
      });
    }
  },
  
  toString: function() {
    return "[#Model:"+ this.table_name +" id=\""+ this.id +"\"]";
  }
});

DM.Model = (function(){ // Closure to allow truly private methods...
  
  return new Class({

    initialize: function(table_name, model_def) {
      if(!model_def){ throw "Model definitions missing!"; }
      
      this.table_name = table_name;
      
      if(model_def.schema) {
        var dsl = new DM.Schema.DSL(this).id(); // Auto generate PK?

        model_def.schema(dsl); // Exec Schema DSL

        this.fields = dsl.fields; // Array
        this.columns = dsl.columns; // Hash
        this.eventHandlers = dsl.eventHandlers;
        
        delete model_def['schema'];
        
      } else {
//        console.log("No schema was provided for "+ table_name)
        this.fields = [];
        this.columns = [];
        this.eventHandlers = {};
      }

      DM.Model.knownModels[table_name] = this;
    },

    find: function(idOrWhere, callback) {
      var self = this;
      DM.Model.DB.execute("select * from "+ this.table_name +" where id = "+ idOrWhere +";", function(results){
        if(results.rows.length > 0) {
          var model = new DM.ModelInstance(results.rows.item(0), self);
          callback(model);
        } else {
          throw ("find( "+ idOrWhere +" ) returned 0 results.");
        }
      });
    },

    all: function(callback) { // where, 
      var self = this;
      DM.Model.DB.execute("select * from "+ this.table_name +";", function(results){

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
      
      DM.Model.DB.execute("select count(id) as cnt from "+ this.table_name +";", function(results){
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


DM.Model.knownModels = $H({});

DM.Model.createModels = function(){
  if(DM.Model.DB) {
    DM.Model.knownModels.each(function(klass, tableName){
      DM.Model.DB.execute( DM.SQL.createForModel( klass ), function() {
//        console.log("Table created:", tableName);
        klass.tableCreated = true;
      });
    });
  } else {
//    console.log("No database is defined.");
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
