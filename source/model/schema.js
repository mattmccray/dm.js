// schema.js
DM.Schema = {
  // Namespace
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
    // if(this.defaultValue == 'NOW') {
    //   this.defaultValue = 'CURRENT_TIMESTAMP';
    // }
    this.allowNull = opts.allowNull;
    if(opts.notNull)
      this.allowNull = !opts.notNull;
  }
});
