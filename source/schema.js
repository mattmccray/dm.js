// schema.js
DM.Schema = {}

DM.Schema.Text = new Class({
  initialize: function(name, opts) {
    opts = opts || {};
    this.name = name;
    this.type = 'text';
    this.defaultValue = opts.defaultValue;
    this.allowNull = opts.allowNull;
    if(opts.notNull)
      this.allowNull = !opts.notNull;
  }
});

DM.Schema.Integer = new Class({
  initialize: function(name, opts) {
    opts = opts || {};
    this.name = name;
    this.type = 'integer'
    this.defaultValue = (opts.primaryKey) ? undefined : opts.defaultValue;
    this.allowNull = opts.allowNull;
    if(opts.notNull)
      this.allowNull = !opts.notNull;
    if(opts.primaryKey)
      this.type = ' INTEGER PRIMARY KEY AUTOINCREMENT'
  }
});

DM.Schema.Float = new Class({
  initialize: function(name, opts) {
    opts = opts || {};
    this.name = name;
    this.type = 'real';
    this.defaultValue = opts.defaultValue;
    this.allowNull = opts.allowNull;
    if(opts.notNull)
      this.allowNull = !opts.notNull;
  }
});

DM.Schema.Blob = new Class({
  initialize: function(name, opts) {
    opts = opts || {};
    this.name = name;
    this.type = 'blob';
    this.defaultValue = opts.defaultValue;
    this.allowNull = opts.allowNull;
    if(opts.notNull)
      this.allowNull = !opts.notNull;
  }
});

DM.Schema.Timestamp = new Class({
  initialize: function(name, opts) {
    opts = opts || {};
    this.name = name;
    this.type = 'timestamp';
    this.defaultValue = opts.defaultValue;
    // if(this.defaultValue == 'NOW') {
    //   this.defaultValue = 'CURRENT_TIMESTAMP';
    // }
    this.allowNull = opts.allowNull;
    if(opts.notNull)
      this.allowNull = !opts.notNull;
  }
});

DM.Schema.DSL = new Class({
  initialize: function(model) {
    this.model = model;
    this.fields = [];
    this.dateFields = [];
    this.columns = {}; // by column name...
    this.eventHandlers = {
      'beforeSave': $A([]),
      'afterSave': $A([]),
      'beforeCreate': $A([]),
      'afterCreate': $A([])
    }
  },
  
  id: function(name, opts) {
    var pk = name || 'id',
        fld = new DM.Schema.Integer(pk, { primaryKey:true });
    this.fields.push( fld );
    this.columns[pk] = fld;
    return this;
  },
  
  text: function(name, opts) {
    var fld = new DM.Schema.Text(name, opts);
    this.fields.push( fld )
    this.columns[name] = fld;
    return this;
  },
  
  blob: function(name, opts) {
    var fld = new DM.Schema.Blob(name, opts);
    this.fields.push( fld )
    this.columns[name] = fld;
    return this;
  },
  
  timestamp: function(name, opts) {
    var field = new DM.Schema.Timestamp(name, opts)
    this.fields.push( field );
    this.dateFields.push( field );
    this.columns[name] = field;
    return this;
  },
  
  integer: function(name,opts) {
    var fld = new DM.Schema.Integer(name, opts);
    this.fields.push( fld );
    this.columns[name] = fld;
    return this;
  },
  
  'float': function(name,opts) {
    var fld = new DM.Schema.Float(name, opts);
    this.fields.push( fld );
    this.columns[name] = fld;
    return this;
  },
  
  timestamps: function(onOrAt) {
    onOrAt = onOrAt || 'on';
    this.timestamp('created_'+ onOrAt, { defaultValue:'NOW' });
    this.timestamp('updated_'+ onOrAt, { defaultValue:'NOW' });
    return this;
  },
  
  foreignKey: function(name, opts) {
     ///??? REALLY?
  },
  
  hasMany: function(model, opts) {
    // Mode is string...
  },
  
  hasOne: function(model, opts) {
    
  },
  
  belongsTo: function(model, opts) {
    
  },
  
  hasAndBelongsToMany: function(model, opts) {
    
  },
  
  beforeSave: function(handler) {
    this.eventHandlers['beforeSave'].push(handler);
  },
  
  afterSave: function(handler) {
    this.eventHandlers['afterSave'].push(handler);
  },
  
  beforeCreate: function(handler) {
    this.eventHandlers['beforeCreate'].push(handler);
  },
  
  afterCreate: function(handler) {
    this.eventHandlers['afterCreate'].push(handler);
  }
})
