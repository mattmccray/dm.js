# DM.js

This project is still in the early phases.

## What Works

* HTML 5 and Google Gear back-ends
* Simple models and schema generator
* Base CRUD on models
* Event callbacks for beforeCreate, afterCreate, beforeSave, and afterSave

## What Doesn't Work (Yet)

* Adobe AIR back-end
* Relationships (planned: hasMany, hasAndBelongsToMany, hasOne, belongsTo)
* Finder WHERE clauses

# Example Usage

In your application's initialization, you'll need to create the database object:

    // the variable name doesn't matter...
    var DB = new DM.Database({
      name:        'GraphicNovelist.db',
      displayName: 'Graphic Novelist',
      description: 'Graphic Novelist database... What?'
    });
  
Now you can define your models:


    var Script = new DM.Model('scripts', {
      
      // This is the schema builder function you'll need to fill out...
      schema: function(t){ 
        // An id field is automatically created for models
        t.text('title');
        t.text('source');
        t.text('html');
        // Creates created_on && updated_on
        t.timestamps('on');
        
        // Not implemented yet, but this is how it'll probably work...
        t.hasMany('Revision', { cascadeDelete:true });
        
        t.beforeSave(function(self){
          // use model#get and model#set to access attributes...
          var renderedSource = GraphicNovelist.render( self.get('source') );
          self.set('html', renderedSource );
        })
      }
    
      // Any model instance methods you'd like here...
    });

Creating a model instance:

    var script = Script.create({ title:"A new title!" });

Typical model kinds of things to do:
    
    script.save();

    script.destroy();
    
    Script.all(function(allScripts){
      // Since the HTML5 back-end is strictly asynchronous all
      // database access methods require callbacks to work with
      // the fetched models... 
      
      allScripts.each(function(script){
        // build DOM nodes, or whatever else you'd like...
      })
    });
    
    Script.find(1, function(script){
      // Script 1 stuff here...
    });
    
# Todo

* Need WHERE builder so finders can actually be useful
* Tests, tests, and more tests!