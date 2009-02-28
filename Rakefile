desc "Run tests in Adobe Air..."
task :test do
  puts `adl test-app.xml`
end

desc "Compiles all targets"
task :build=>[:build_dm, :build_dataset] do
  puts "Finished."
end

desc "Compiles from source scripts into dist/dm.js"
task :build_dm do
  puts "Building dm.js..."
  require 'sprockets'
  
  secretary = Sprockets::Secretary.new(
    :asset_root   => "assets",
    :load_path    => ["source", "etc", "."],
    :source_files => ["source/dm.js"]
  )

  # Generate a Sprockets::Concatenation object from the source files
  concatenation = secretary.concatenation
  # Write the concatenation to disk
  concatenation.save_to("dist/dm.js")
  
  puts "Piping dm.js through jsmin..."
  `cat dist/dm.js | jsmin > dist/dm.min.js`

  puts "Piping dm.js through yuicompressor..."
  `java -jar $HOME/Dev/bin/yuicompressor-2.3.5.jar -o dist/dm.ymin.js dist/dm.js`
  
  puts 'Done.'
end

desc "Compiles from source scripts into dist/dataset.js"
task :build_dataset do
  puts "Building dataset.js..."
  require 'sprockets'
  
  secretary = Sprockets::Secretary.new(
    :asset_root   => "assets",
    :load_path    => ["source", "etc", "."],
    :source_files => ["source/dataset.js"]
  )

  # Generate a Sprockets::Concatenation object from the source files
  concatenation = secretary.concatenation
  # Write the concatenation to disk
  concatenation.save_to("dist/dataset.js")
  
  puts "Piping dataset.js through jsmin..."
  `cat dist/dataset.js | jsmin > dist/dataset.min.js`

  puts "Piping dataset.js through yuicompressor..."
  `java -jar $HOME/Dev/bin/yuicompressor-2.3.5.jar -o dist/dataset.ymin.js dist/dataset.js`
  
  puts 'Done.'
end

task :default=>:build
