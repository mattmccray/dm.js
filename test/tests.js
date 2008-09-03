
var Tests = {
  
  title:        "DM ORM",
  description:  "This is mainly just a place holder. We need to create a bunch of tests!",
  auto_test:    true,
  
  note1: "Verify classes exist..",
  
  "API": function() {
    assertDefined( typeof DM,           "DM is missing" );
    assertDefined( typeof DM.Database,  "DM.Database is missing" );
    assertDefined( typeof DM.Schema,    "DM.Schema is missing" );
    assertDefined( typeof DM.Model,     "DM.Model is missing" );
  },
  
  note2: "Connection...",
  
  "Create db connection...": function() {
    var db = new DM.Database({
      name:        'GraphicNovelist.db',
      displayName: 'Graphic Novelist',
      description: 'Graphic Novelist database... What?'
    });
    assertNotNull(db)
  },
  
  "Model testing...": function() {
    var db = new DM.Database({
      name:        'GraphicNovelist.db',
      displayName: 'Graphic Novelist',
      description: 'Graphic Novelist database... What?'
    });
    assertNotNull(db)
    
    var Script = new DM.Model('scripts', {
      schema: function(t){ 
        t.text('title');
        t.text('source');
        t.text('html');
        t.timestamps('on'); // Creates created_on && updated_on
        t.hasMany('Revision', { cascadeDelete:true });
      },
    });
    
    DM.Model.createModels(); // Need to ensure DB exists, eh?
    
    // Script.all(function(models){
    //   assertEqual(2, models.length)
    //   console.log(models)
    // });
    
    // Script.find(1, function(model) {
    //   model.set('title', 'My new title is much better!');
    //   model.save();
    // });
    
    var s = Script.create({
      title:'A good title is priceless',
      source: "Content here, really.",
      html: "<p>Content here, really.</p>"
    }).save(function(model){
      assertNotNull(model);
      var id = model.id;
      Script.find(id, function(model){
        assertNotNull(model);

        model.destroy(function(model){
          assertNotNull(model);
          console.log("DESTROYED!")

          Script.count(function(c){
            assertEqual(0, c);
          });
        })
      });
      
    });
    
    
    // Script.destroyAll(function(models){
    //   assertNotNull(models);
    //   
    //   Script.count(function(c){
    //     assertEqual(0, c);
    //   });
    //   
    // });



    // Script.all(function(models){
    //   assertEqual(3, models.length)
    //   console.log(models)
    // });
          
    // DM.SQL.updateForModel(s)
    // DM.SQL.insertForModel(s)
    // DM.SQL.deleteForModel(s)
    
  }
};