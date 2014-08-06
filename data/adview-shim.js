console.log("****adview-shim****");
var ads = self.options.ads;
unsafeWindow.options = cloneInto( { "ads" : ads }, unsafeWindow);
