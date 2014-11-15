 $(function() {
     
     console.log("first-run ready");
     
     $('#x-close-button').click(function() {
            
        console.log("click: "+self.port);
        self.port && self.port.emit("close-firstrun");
    });
    
    $('#start').click(function() {
            
        console.log("click: "+self.port);
        self.port && self.port.emit("close-firstrun");
    });
    
    $('#video').click(function() {
            
        window.open('http://dhowe.github.io/AdNauseam/');
    });
});