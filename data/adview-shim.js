//unsafeWindow.msg = function(m) { self.port.emit(m); }

function msg(m) { self.port.emit(m); }

console.log("****adview-shim****");

var ads = self.options.ads;

unsafeWindow.options = cloneInto( { "ads" : ads }, unsafeWindow);

exportFunction(msg, unsafeWindow, { defineAs: "msg"} );

