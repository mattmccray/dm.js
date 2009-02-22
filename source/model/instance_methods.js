DM.ModelInstance = Class.create({
  initialize: function(attributes, klass) {
    this.table_name = klass.table_name;
    this.fields = klass.fields; // Array
    this.columns = klass.columns; // Hash
    this.klass = klass;
    this.isDirty = false;
    this.attributes = $H(attributes || {}); // Attributes from the SQLResultSet seem to be read-only
    this.id = this.attributes.get('id') || null;
  },
  
  get: function(attribute, raw) {
    if(attribute in this.columns) {
      if(this.columns[attribute].type == 'timestamp') {
        return (raw) ?  this.attributes.get(attribute) : new Date( this.attributes.get(attribute) );
      } else {
        return this.attributes.get(attribute);
      }
    } else {
      throw("'"+ attribute +"' is not a valid column for table "+ this.table_name);
    }
  },

  set: function(attribute, value) {
    if(attribute in this.columns) {
      if(this.columns[attribute].type == 'timestamp') {
        switch(typeof(value)) {
          case 'string':
            value = Date.parse(value); // Mabye new Date(value).getTime(); ?
            break;
          case 'number':
            value = value;
            break;
          default:
            // Assume it's a Date OBJECT!
            value = value.getTime();
        }
      }
      if(value != this.attributes.get(attribute)) {
//        console.log('Setting '+ attribute +" to "+ value)
        this.isDirty = true;
        this.attributes.set(attribute, value);
      }
    } else {
      throw("'"+ attribute +"' is not a valid column for table "+ this.table_name);
    }
    return this;  
  },

  update: function(attrs, ignoreErrors) {
    var self = this;
    $H(attrs).each(function(pair){
      // FIXME: Also ensure that the attribute is in the field list?
      if(pair.value != self.get(pair.key)) {
        try {
          self.set(pair.key, pair.value)
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
    if(typeof(self.id) == 'number') {
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
      var cmds = DM.SQL.insertForModel(this),
          sql = cmds.first(),
          values = cmds.last();
      DM.Model.DB.execute( sql, values, function(res) {
        // Need the last inserted ID
        self.id = res.insertId;
        self.attributes.set('id', self.id);
        self.klass._handleEvent('afterSave', self);
        self.klass._handleEvent('afterCreate', self);
        callback(self);
      } );
    }
  },
  
  reload: function(callback) {
    if(typeof(this.id) == 'number') {
      // Grab the attrs...
    }
  },
  
  destroy: function(callback) {
    if(typeof(this.id) == 'number') {
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
