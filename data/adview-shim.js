// pass 'ads' object into page-scope
unsafeWindow.options = cloneInto( { "ads" : self.options.ads }, unsafeWindow);

// pass 'msg' function into page-scope
exportFunction(function(m) {  self.port.emit(m);  }, unsafeWindow, { defineAs: "msg"} );

// pass 'formatDate' function into page-scope
exportFunction(formatDate, unsafeWindow, { defineAs: "formatDate" } );

/* pass functions into page-scope
exportFunction(formatStats, unsafeWindow, { defineAs: "formatStats" } );
exportFunction(numVisited, unsafeWindow, { defineAs: "numVisited" } );
exportFunction(sinceTime, unsafeWindow, { defineAs: "sinceTime" } );
exportFunction(findDups, unsafeWindow, { defineAs: "findDups" } );
*/

self.port.on("ADNUpdateAd", function(update) {
	
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

function findAdById(id, ads) {
	
	for (i=0, j=ads.length; i< j; i++) {
		
		if (ads[i].id === id)
			return ads[i]
	}
	
	return null;
}

function findDups(ads) {
	
	var ad, soFar, hash = {};
	
	for (var i=0, j = ads.length; i<j; i++) {
		
		ad = ads[i];
		
		if (!ad.url) continue;
		
		soFar = hash[ad.url];
		if (!soFar) {
			
			hash[ad.url] = 1;
			ad.hidden = false;
		}
		else {
			
			hash[ad.url]++;
			ad.hidden = true;
		}
	}
	
	for (var i=0, j = ads.length; i<j; i++) {
		
		ad = ads[i];
		ad.count = hash[ad.url];
		//console.log(i+") "+ad.count);
	}
	
	//console.log('adview-shim.findDups() :: '+ads.length);

	return ads;
}

function formatStats(ads) {
	
	return 'Since '+ formatDate(sinceTime(ads)) + ': <strong>' + // yuck, get rid of html here
	ads.length+' ads detected, '+numVisited(ads)+' visited.</strong>';
}

function numVisited(ads) {
	
	var numv = 0;
	for (var i=0, j = ads.length; i<j; i++) {
			
		if (ads[i].visited > 0) 
			numv++;
	}
	return numv;
}

function sinceTime(ads) {
	
	var oldest = +new Date(), idx = 0;
	for (var i=0, j = ads.length; i<j; i++) {
			
		if (ads[i].found < oldest) { 
			oldest = ads[i].found;
			idx = i;
		}
	}
	return oldest;
}


function formatDate(ts) {
	
	if (!ts) return 'pending';
		
	if (ts < 0)  return 'error';
	
	var date = new Date(ts), days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
		months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	
	var pad = function(str) {
		
		str = String(str);
		return (str.length < 2) ? "0" + str : str;
	}
	
	var meridian = (parseInt(date.getHours() / 12) == 1) ? 'PM' : 'AM';
	var hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
	
	return days[date.getDay()] + ' ' + months[date.getMonth()] + ' ' + date.getDate() 
		+ ' ' + date.getFullYear() + ' ' + hours + ':' + pad(date.getMinutes()) 
		+ meridian.toLowerCase();
		
		//+ ':' + pad(date.getSeconds()) + ' ' + meridian;
}  
