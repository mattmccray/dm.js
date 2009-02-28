DM.Relationships = {
  // Namespace...
};

DM.Relationships.HasMany = Class.create({
  initialize: function(modelKlass, options, schema) {
    this.modelKlass = modelKlass;
    this.options = $H(options || {});
    this.schema = schema;
  },
  
  addMethodsToInstance: function(model) {
    if(!this.modelKlass) return;
    var self = this,
        pkey_name = model.klass.table_name.singularize()+'_id';
    // console.log(this)
    // console.log(this.modelKlass)
    // console.log(this.modelKlass.table_name)
    // console.log(model.klass.table_name)
    model[this.modelKlass.table_name] = {
      add: function(model, callback) {
        
      },
      all: function(callback) {
        self.modelKlass.findWhere( pkey_name.eq(model.id), callback);
      },
      create: function(atts, callback) {
//        console.log("Creating "+ pkey_name +':'+ model.id);
        atts = $H(atts)
        atts.set(pkey_name, model.id);
        return self.modelKlass.create( atts.toObject() );
      },
      each: function(callback) {
        
      },
      get: function(id, callback) {
        
      },
      find: function(unknown, callback) {
        
      },
      remove: function(model, callback) {
        
      },
      destroy: function(model, callback) {
        
      }
    };
//    model.addMethods(this.instanceMethods);
  },
  
  instanceMethods: {
    
  }
});

DM.Relationships.BelongsTo = Class.create({
  initialize: function(modelKlass, options, schema) {
    this.modelKlass = modelKlass;
    this.options = $H(options || {});
    this.schema = schema;
  },
  
  addMethodsToInstance: function(model) {
    model[this.modelKlass.table_name] = function(callback) {
      return "WOOT!";
    }
//    model.addMethods(this.instanceMethods);
  },
  
  instanceMethods: {
    
  }
});