
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

