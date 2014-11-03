//console.log("adinject.js");

// pass 'msg' function into page-scope for advault.js
exportFunction(function(m) {  self.port.emit(m);  }, unsafeWindow, { defineAs: "msg"} )
	
self.port.on('refresh-ads', function(data) {
	
	// pass 'ads' object into page-scope for advault.html
	unsafeWindow.options = cloneInto( { "ads" : data.ads }, unsafeWindow);
});

self.port.on("ad-updated", function(update) {
	
	console.log("AdVault::ad-updated: ad#"+data.id);
	return;
	
	var theAds = unsafeWindow.options.ads;
	
	// Update the ad in window.ads
	var found = findAdById(update.id, theAds, true);
	//console.log("Visited(pre): "+found.visited);
	found[update.field] = update.value;
	//console.log("Visited(post): "+findAdById(update.id, unsafeWindow.options.ads, true).visited);
	
	// Update the ad item in the DOM
	var sel = '#ad' + update.id, att = 'data-'+update.field;
	//console.log("PRE: "+$(sel).attr(att));
	$(sel).attr(att, formatDate(update.value));
	//console.log("POST: "+$(sel).attr(att));
	
	// Now recompute the stats
	var uniqueAds = findDups(theAds);
	var result = formatStats(uniqueAds);
	$('#stats').html(result);
});