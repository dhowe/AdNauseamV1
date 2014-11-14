 $('#firstrun-close').click(function() {
            
    console.log("click: "+self.port);
    self.port && self.port.emit("close-firstrun");
});