/* Copyright (c) 2008-2009 M@ McCray.

  REQUIRES Prototype 1.6+

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

var DM = {

  AUTHOR: "M@ McCray <darthapo@gmail.com>",
  VERSION: "0.1.2",

}


DM.DB = {
  execute: function() {
    throw "No DB connection has been made!!!";
  }
}

DM.Options = {

  setOptions: function(opts) {
    var defaultOpts = $H(this.options || {}),
        overrideOpts = $H(opts || {});
    this.options = defaultOpts.merge(overrideOpts).toObject();
  }

}

DM.Database = Class.create(DM.Options, { /// EVENTS???

  options: {
    name:         '',
    description:  '',
    displayName:  false,
    size:         10240,
    preferGears:  false
  },

  initialize: function(options) {
    this.setOptions(options);
    this.conn = DM.ConnectionFactory.getConnection( this.options );
    DM.DB = this;
  },

  execute: function(sql, params, callback, options) {
    if(!sql){ throw "You must provide SQL to execute"; }

    var callback = callback || function(){ /*console.log('No callback defined')*/ },
        params   = params || [],
        options  = options || {};


    this.conn.execute(sql, params, function(results){
      callback(results);
    }, options);
  }

});


DM.AirConnection = Class.create({
  initialize: function(connInfo) {
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

    statement.text = sql.replace(/(\?)/g, function(riddler){
      return ":"+ count++;
    });

    $H(params).each(function(pair){
      statement.parameters[":" + pair.key] = pair.value;
    });

    statement.addEventListener(air.SQLEvent.RESULT, function(){
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
    });

    statement.execute();
  }
});

(function(rt){
  if(!rt) return;
  if(window.air && air.Introspector)
    window.console = air.Introspector.Console;
  else {
    window.console = {
      log: function(msg) {
        rt.trace(msg);
      },
      info: function(msg) {
        console.log('INFO: '+ msg);
      }
    }
  }
})(window.runtime);
DM.GearsConnection = Class.create({
  initialize: function(connInfo) {
    this.type = 'gears';
    this.connInfo = connInfo;
    if(!DM.GearsConnection.gearFactory) (function(){
       if (typeof GearsFactory != 'undefined') {
         DM.GearsConnection.gearFactory = new GearsFactory();
       } else {
         try {
           DM.GearsConnection.gearFactory = new ActiveXObject('Gears.Factory');
           if (DM.GearsConnection.gearFactory.getBuildInfo().indexOf('ie_mobile') != -1) {
             DM.GearsConnection.gearFactory.privateSetGlobalObject(this);
           }
         } catch (e) {
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
DM.Html5Connection = Class.create({

  initialize: function(connInfo) {
    this.connInfo = connInfo;
    this.type = 'html5';
    this.connection = openDatabase(connInfo.name, connInfo.description, connInfo.displayName || connInfo.name, connInfo.size);
  },

  execute: function(sql, params, callback, options) {
    this.connection.transaction(function(txn){
      txn.executeSql(sql, $A(params).flatten(), function(t, results){
        callback(results);
      },
      function(err){
      });
    });
  }

});

DM.ConnectionFactory = {

  connectionPool: $H(), // Well, kind of...

  getConnection: function(connInfo) {
    if( this.connectionPool.get(connInfo.name) ) {
      return this.connectionPool.get(connInfo.name);
    }

    var conn = false;

    if(typeof openDatabase != 'undefined') {
      conn = new DM.Html5Connection(connInfo);

    } else if(typeof GearsFactory != 'undefined') {
      conn = new DM.GearsConnection(connInfo);
    } else if(window.runtime && typeof window.runtime.flash.data.SQLConnection != 'undefined') {
      conn = new DM.AirConnection(connInfo);
    }

    if(conn) {
      this.connectionPool.set(connInfo.name, conn);
      return conn;
    } else {
      this.connectionPool.set(connInfo.name, null);
      throw "Unable to find a supported database!"
    }
  }

};

DM.DeferredCallback = Class.create({

  initialize: function(target, callback, args) {
    this.target = target;
    this.current = 0;
    this.callback = callback;
    this.args = args;
  },

  ping: function() {
    this.current++;
    if(this.current == this.target) {
      this.callback.apply(null, this.args);
    } else {
      console.log("Not yet...")
    }
  }
});

DM.Dataset = Class.create({

  initialize: function(tableName, options) {
    this.tableName = tableName;
    this.conditions = [];
    this.values = [];
    this.ordering = [];
    this.options = $H({ asModel:false }).update(options || {});
  },

  filter: function(col, comparator, value, cnd) {
    if( arguments.length == 2 ) {
      value = comparator;
      var colSegs = col.split(' ');
      if(colSegs.length < 2){ throw "Invalid filter syntax"; }
      comparator = colSegs.pop();
      col = colSegs.join(' '); // Would there ever be spaces?
    } else if( arguments.length == 1) {
      var args = $A(arguments[0]);
      col = args[0];
      comparator = args[1];
      value = args[2];
    }
    cnd = cnd || 'AND';
    this.conditions.push({
      col: col,
      com: comparator,
      val: '?',
      cnd: cnd
    });
    this.values.push(value);
    return this;
  },

  where: function(col, comparator, value) { return this.filter(col, comparator, value); },
  and:   function(col, comparator, value) { return this.filter(col, comparator, value, 'AND'); },
  or:    function(col, comparator, value) { return this.filter(col, comparator, value, 'OR'); },

  order: function(column, direction) {
    direction = direction || 'ASC';
    this.ordering.push(column +" "+ direction)
    return this;
  },

  each: function(callback) {
    var self = this;
    DM.DB.execute(this.toSql(), this.values, function(results){
      for (var i=0; i < results.rows.length; i++) {
        var row = self.options.asModel ? new DM.ModelInstance(results.rows.item(i), self.options.modelKlass) : results.rows.item(i);
        callback( row, i, results );
      };
    });
    return this;
  },

  all: function(callback) {
    if(callback) {
      var self = this;
      DM.DB.execute(this.toSql(), this.values, function(results){
        var rows = [];
        if(self.options.asModel) {
          for (var i=0; i < results.rows.length; i++) {
            rows.push( new DM.ModelInstance(results.rows.item(i), self.options.modelKlass) );
          };
        } else {
          for (var i=0; i < results.rows.length; i++) {
            rows.push( results.rows.item(i)  );
          };
        }
        callback( rows ); // As an array...
      });
    } else {
      this.conditions = [];
      this.values = [];
      this.ordering = [];
    }
    return this;
  },

  results: function(callback) {
    this.all(callback);
  },



  add: function(data, callback) {
    var self = this,
        fn = callback || function(){};
    if(Object.isArray(data)) {
      console.log('!!! Data is ARRAY!!!')
      var updatedData = [],
          deferedCallback = new DM.DeferredCallback(data.length, callback, [updatedData]);
      $A(data).each(function(item){
        var sqlInf = DM.SQL.insertForObject(item, self.tableName);
        DM.DB.execute(sqlInf[0], sqlInf[1], function(res){
          item.id = res.insertId;
          updatedData.push(item);
          deferedCallback.ping();
        });
      })
    } else {
      var sqlInf = DM.SQL.insertForObject(data, this.tableName);
      DM.DB.execute(sqlInf[0], sqlInf[1], function(res){
        data.id = res.insertId;
        fn(data, res);
      });
    }
    return this;
  },

  update: function(data, callback) {
    var self = this,
        sqlInf = DM.SQL.updateForObject(data, this.tableName),
        fn = callback || function(){};
    DM.DB.execute(sqlInf[0], sqlInf[1], function(res){
      fn(data, res);
    });
    return this;
  },

  destroy: function(data, callback) {
    var self = this,
        sqlInf = DM.SQL.deleteForModel(data, this.tableName);
    DM.DB.execute(sqlInf[0], sqlInf[1], function(res){
      callback(data, res);
    });
    return this;
  },

  destroyAll: function(callback) {
    var self = this;
    this.each(function(row){
      this.destroy(row, callback);
    });
    return this;
  },

  clone: function() {
    var ds = new DM.Dataset(this.tableName);
    ds.conditions = $A(this.conditions).clone();
    ds.values = $A(this.values).clone();
    ds.ordering = $A(this.ordering).clone();
    return ds;
  },

  toSql: function(cmd) {
    var cmd = cmd || 'SELECT',
        sql = cmd +" * FROM "+ this.tableName;

    if(this.conditions.length > 0) {
      sql += " WHERE ";
      $A(this.conditions).each(function(clause, count){
        if(count > 0) {
          sql += clause.cnd +" ";
        }
        sql += "("+ clause.col +" "+ clause.com +" "+ clause.val +") ";
      });
    }

    if(this.ordering.length > 0) {
      sql += " ORDER BY "+ this.ordering.join(', ');
    }

    sql += ";";

    return sql;
  },

  toString: function() {
    return this.toSql();
  }
});

Object.extend(String.prototype, {
  eq:function(value) {
    return [this, '=', value];
  },
  like:function(value) {
    return [this, 'like', value];
  },
  neq:function(value) {
    return [this, '!=', value];
  },
  lt:function(value) {
    return [this, '<', value];
  },
  gt:function(value) {
    return [this, '>', value];
  },
  lteq:function(value) {
    return [this, '<=', value];
  },
  gteq:function(value) {
    return [this, '>=', value];
  },
});

DM.SQL = (function(){

  function query() {
    return $A(arguments).join(' ');
  }

  function safeFields(model) {
    return model.fields.filter(function(f){ return (f.name != 'id')})
  }

  function typeSafe(value) {
    if(value instanceof Date) {
      return value.getTime();
    } else {
      return value;
    }
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

    createForSchema: function(dsl, table_name) {
      dsl.table_name = table_name;
      return this.createForModel(dsl);
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
    },


    updateForObject: function(object, table_name) {
      if(!object.id) throw "Object must have an ID to be updated...";
      var values = [],
          hsh = $H(object),
          sql = query(
            'UPDATE',
            table_name,
            'SET',
            hsh.keys().without('id').map(function(fld){
                values.push( typeSafe(hsh.get(fld)) );
                return query(fld, '=', '?')
            }).join(', '),
            'WHERE id = ?;'
          );
      values.push( hsh.get('id') );
      return [sql, values];
    },

    insertForObject: function(object, table_name) {
      var values = [],
          hsh = $H(object),
          sql = query(
            'INSERT INTO',
            table_name,
            '(',
            hsh.keys().without('id').map(function(fld){
                values.push( typeSafe(hsh.get(fld)) );
                return fld;
            }).join(', '),
            ') VALUES (',
            hsh.keys().without('id').map(function(fld){
                return '?';
            }).join(', '),
            ");"
          );
      return [sql, values];
    },

    deleteForModel: function(object, table_name) {
      var id = (typeof object == 'number') ? object : object.id;
          sql = query(
            "DELETE FROM",
            table_name,
            "WHERE id = ?;"
          );
      return [sql, [id]];
    }
  }
})();

DM.Schema = {
}

DM.Schema.Text = Class.create({
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

DM.Schema.Integer = Class.create({
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

DM.Schema.Float = Class.create({
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

DM.Schema.Blob = Class.create({
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

DM.Schema.Timestamp = Class.create({
  initialize: function(name, opts) {
    opts = opts || {};
    this.name = name;
    this.type = 'timestamp';
    this.defaultValue = opts.defaultValue;
    this.allowNull = opts.allowNull;
    if(opts.notNull)
      this.allowNull = !opts.notNull;
  }
});


DM.Schema.DSL = Class.create({
  initialize: function(model) {
    this.model = model;
    this.fields = [];
    this.dateFields = [];
    this.columns = {}; // by column name...
    this.relationships = [];
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


  hasMany: function(model, opts) {
    this.relationships.push( new DM.Relationships.HasMany(model, opts, this) );
  },


  belongsTo: function(model, opts) {
    this.integer(model.table_name.singularize()+'_id', {allowNull:false});
    this.relationships.push( new DM.Relationships.BelongsTo(model, opts, this) );
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
DM.Schema._tables = $H({});

DM.Schema.defineTable = function(tableName, configurator) {
  var dsl = new DM.Schema.DSL(tableName).id();
  configurator( dsl );
  DM.Schema._tables.set(tableName, dsl); // Auto generate PK?
  return dsl;
}

DM.Schema.createAllTables = function(){
  if(DM.DB) {
    DM.Schema._tables.keys().each(function(tableName){
      console.log("Creating table: "+ tableName)
      DM.DB.execute( DM.SQL.createForSchema( DM.Schema._tables.get(tableName), tableName), [], function() {
        console.log("Table created:", tableName);
      });
    });
  } else {
    console.log("DM.Schema.createAllTables: Error: No database is defined.");
  }
}
