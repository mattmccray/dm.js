desc "Run tests in Adobe Air..."
task :test do
  puts `adl test-app.xml`
end


desc "Compiles from source scripts into dist/dm.js"
task :build do
  source = {}
  %w(connection core database dataset model schema sql).each do |src|
    source[ src.to_sym ] = IO.readlines("source/#{ src }.js")
  end
  
  license = {}
  %w(dm).each do |src|
    license[ src.to_sym ] = IO.readlines("licenses/#{ src }.txt")
  end
  
  template =<<-EOS
#{ license[:dm] }
#{ source[:core] }
#{ source[:connection] }
#{ source[:database] }
#{ source[:dataset] }
#{ source[:schema] }
#{ source[:sql] }
#{ source[:model] }
EOS
  
  File.open("dist/dm.js", 'w') do |f|
    f.write template
  end
  
  puts "Piping dm.js through jsmin..."
  `cat dist/dm.js | jsmin > dist/dm.min.js`

  puts "Piping dm.js through yuicompressor..."
  `java -jar $HOME/Dev/bin/yuicompressor-2.3.5.jar -o dist/dm.ymin.js dist/dm.js`
  
  puts "Done."
end