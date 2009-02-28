
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
      // console.log('dsl')
      // console.log(dsl)
      // console.log('tablename')
      // console.log(table_name)
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

