
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

// dataset.js
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

  // FIXME: Make where(), and(), or() all work as expected... What is expected with OR???
  where: function(col, comparator, value) { return this.filter(col, comparator, value); },
  and:   function(col, comparator, value) { return this.filter(col, comparator, value, 'AND'); },
  or:    function(col, comparator, value) { return this.filter(col, comparator, value, 'OR'); },
  
  order: function(column, direction) {
    direction = direction || 'ASC';
    this.ordering.push(column +" "+ direction)
    return this;
  },
  
  each: function(callback) {
    // Execute current SQL and for each result, exec the callback
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
      // Execute current SQL and pass results directly to callback
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
  
  //FIXME: Dataset #count
  
  // count: function(callback) {
  //   // Execute current SQL and pass count to callback
  //   // callback( countOfCurrentRows )
  //   return this;
  // },
  
  add: function(data, callback) {
    var self = this,
        fn = callback || function(){};
    if(Object.isArray(data)) {
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
    // Calling slice() will create a cloned array...
    ds.conditions = $A(this.conditions).clone();
    ds.values = $A(this.values).clone();
    ds.ordering = $A(this.ordering).clone();
    return ds;
  },
  
  toSql: function(cmd) {
    var cmd = cmd || 'SELECT',
        sql = cmd +" * FROM "+ this.tableName;

    // Where clauses...
    if(this.conditions.length > 0) {
      sql += " WHERE ";
      $A(this.conditions).each(function(clause, count){
        if(count > 0) { 
          sql += clause.cnd +" ";
        }
        sql += "("+ clause.col +" "+ clause.com +" "+ clause.val +") ";
      });
    }

    // Conditions...
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
