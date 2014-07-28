
//self.port.on("ADNUpdateAdView", updateAdView);
console.log("****adview-shim****");

 //ads = self.options.ads, port = self.port;

//console.log("ads: "+ads.length+', port='+port);
// 
// window.addEventListener('message', function(event) {
// 	
	// console.log('cs: Message from page script');
	// console.log(event.data);
	// console.log(event.origin);
// 
// }, false);

//var contentScriptObject = ;
var ads = self.options.ads;
unsafeWindow.options = cloneInto( { "ads" : ads }, unsafeWindow);

// self.port.emit("message", {"msg": "shimContentScriptMessagePayload" });

//self.port.on("message", function(myAddonMessagePayload) {
  //console.log("shim: "+myAddonMessagePayload);
//});

//unsafeWindow.assignedContentScriptObject = contentScriptObject;