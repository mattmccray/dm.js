function connectToDb() {
  window.db = new DM.Database({
    name:        'GraphicNovelistTest.db',
    displayName: 'Graphic Novelist',
    description: 'Graphic Novelist database... What?'
  });
}

function defineScript() {
  window.Script = new DM.Model('scripts', {
    schema: function(t){ 
      t.text('title');
      t.text('source');
      t.text('html');
      t.timestamps('on'); // Creates created_on && updated_on
      t.hasMany('Revision', { cascadeDelete:true });
    },
  });
  DM.Model.createModels(); // Need to ensure DB exists, eh?
  Script.destroyAll();
}


var Tests = {
  
  title:        "DM ORM",
  description:  "This is mainly just a place holder. We need to create a bunch of tests!",
  auto_test:    true,
  
  note1: "Verify classes exist..",
  
  "API": function() {
    assertDefined( typeof DM,           "DM" );
    assertDefined( typeof DM.Database,  "DM.Database" );
    assertDefined( typeof DM.Schema,    "DM.Schema" );
    assertDefined( typeof DM.Model,     "DM.Model" );
  },
  
  note2: "Connection...",
  
  "Create db connection...": function() {
    connectToDb()
    assertNotNull(db, "Database not null test")
  },
  
  "Model testing...": function() {
    connectToDb()
    defineScript();
    
    var s = Script.create({
      title:'A good title is priceless',
      source: "Content here, really.",
      html: "<p>Content here, really.</p>"
    }).save(function(model){
      assertNotNull(model, "Newly created model not null");
      var id = model.id;
      
      Script.find(id, function(model){
        assertNotNull(model, "Found model is not null");
        model.destroy(function(model){
          assertNotNull(model, "Deleted model is not null");
          
          Script.count(function(c){
            assertEqual(0, c, "Script count should be 0");
          });
        })
      });
      
    });
    
  },
  
  "More Model testsing": function() {
    connectToDb()
    defineScript();

    // Script.all(function(models){
    //   assertEqual(3, models.length)
    //   console.log(models)
    // });
          
    // DM.SQL.updateForModel(s)
    // DM.SQL.insertForModel(s)
    // DM.SQL.deleteForModel(s)
    
    var s = Script.create({
      title:'A good title is priceless',
      source: "Content here, really.",
      html: "<p>Content here, really.</p>"
    }).save(function(){
      
      Script.all(function(models){
        assertEqual(1, models.length, "Script count should be 1")
      });
    })
    
  }
};