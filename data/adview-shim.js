var ads = self.options.ads;

// pass 'ads' object into page-scope

unsafeWindow.options = cloneInto( { "ads" : ads }, unsafeWindow);

// pass 'msg' object into page-scope

exportFunction(function(m) { self.port.emit(m); }, unsafeWindow, { defineAs: "msg"} );

