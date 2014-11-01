//console.log("adinject.js");

// pass 'msg' function into page-scope for advault.js
exportFunction(function(m) {  self.port.emit(m);  }, unsafeWindow, { defineAs: "msg"} )
	
self.port.on('refresh-ads', function(data) {
	
	// pass 'ads' object into page-scope for advault.html
	unsafeWindow.options = cloneInto( { "ads" : data.ads }, unsafeWindow);
});
