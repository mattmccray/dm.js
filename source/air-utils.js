(function(rt){
  
  if(!rt) return;
  
  if(window.air && air.Introspector)
    window.console = air.Introspector.Console;
  else
    window.console = {
      log: function(msg) {
        rt.trace(msg);
      },
      info: function(msg) {
        console.log('INFO: '+ msg);
      }
    }  

})(window.runtime);