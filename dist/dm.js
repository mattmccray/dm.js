/* Copyright (c) 2008 M@ McCray.

  REQUIRES MOOTOOLS 1.2

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
//  core.js
var DM = {
  
  version: {
    major: 0,
    minor: 1,
    build: 1,
    toString: function() {
      return [this.major, this.minor, this.build].join('.');
    }
  },
  
  merge: function(from, to) {
    for(prop in from) {
      if(from.hasOwnProperty(prop)) {
        to[prop] = from[prop];
      }
    }
    return to;
  }
  
}


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
      conn = new DM.Html5Connection(connInfo);
      
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
    
    // Air uses named params... WhatWG/HTML5 doesn't. We're conforming more to the HTML5 psuedo-spec, 
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
// = WhatWG/HTML5 Connection =
// ===========================
DM.Html5Connection = new Class({
  
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
// dataset.js
DM.Dataset = new Class({
  
});
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


DM.SQL = (function(){

  function query() {
    return $A(arguments).join(' ');
  }
  
  function safeFields(model) {
    return model.fields.filter(function(f){ return (f.name != 'id')})
  }
  
  return {

    createForModel: function(model) {
      var sql = query(
        'CREATE TABLE',
        'IF NOT EXISTS',
        model.table_name,
        '(',
          model.fields.map( function(fld){ return query(fld.name, fld.type) }).join(', '),
        ');'
      );
      return sql;
    },
    
    updateForModel: function(model) {
      var values = [],
          sql = query(
            'UPDATE',
            model.table_name,
            'SET',
            safeFields(model).map(function(fld){ 
                values.push(model.get(fld.name, true)); 
                return query(fld.name, '=', '?')
            }).join(', '),
            'WHERE id = ?;'
          );
      values.push( model.id );
      return [sql, values];
    },
    
    insertForModel: function(model) {
      var values = [],
          sql = query(
            'INSERT INTO',
            model.table_name,
            '(',
            safeFields(model).map(function(fld){ 
                values.push( model.get(fld.name, true) ); 
                return fld.name;
            }).join(', '),
            ') VALUES (',
            safeFields(model).map(function(fld){ 
                return '?';
            }).join(', '),
            ");"
          );
      return [sql, values];
    },
    
    deleteForModel: function(model) {
      var sql = query(
        "DELETE FROM",
        model.table_name,
        "WHERE id = ?;"
      );
      return [sql, [model.id]]
    }
  }
})();


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

