var testing = 1;

if (!testing)  {
	
	self.port.on("ADNUpdateAdView", updateAdView);
	updateAdView(self.options);
}

function formatDivs(ads) {
	
	var html = '', ads = findDups(ads);
	for (var i=0, j = ads.length; i<j; i++) {
		
		if (ads[i].url) {
			var ad = ads[i];
			html += '<div class="item ';
			if (ad.visited==0) html += 'pending '	
			html += 'dup-count-'+ad.count+'" ';
			html += 'data-detected="'+ad.found+'" ';
			html += 'data-visited="'+ad.visited+'" ';
			html += 'data-target="'+ad.target+'" ';
			html += 'data-origin="'+ad.page+'" ';
			html += '><span class="counter">'+ad.count+'</span>';
			html += '<img src="' + ads[i].url + '" alt="ad image">';
			html += '</div>\n';
		}
	}
	
	return html;
}

function updateAdView(o) {
	
	var result, ads = o.ads;
	result = formatDivs(ads);
	$('#container').html(result);

	result = formatStats(ads);
	console.log(result);
	$('#stats').html(result);
	//result = formatJSON(ads);
	//$('#json').html('<!--\n'+result+'\n-->');
}

function formatStats(ads) {
	
	return 'Since '+ format(sinceTime(ads)) + ': <strong>' + // yuck
	ads.length+' ads detected, '+numVisited(ads)+' visited.</strong>';
}

function format(ts) {
	return 'January 12, 2014';
}

function findDups(ads) {
	
	var ad, soFar, hash = {};
	
	for (var i=0, j = ads.length; i<j; i++) {
		
		ad = ads[i];
		if (!ad.url) continue;
		
		soFar = hash[ad.url];
		if (!soFar) 
			hash[ad.url] = 1;
		else {
			hash[ad.url] = hash[ad.url]+1;
		}
	}
	for (var i=0, j = ads.length; i<j; i++) {
		ad = ads[i];
		ad.count = hash[ad.url];
		//console.log(i+") "+ad.count);
	}
	return ads;
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

function formatDivsSimple(ads) {
	
	var html = '';
	for (var i=0, j = ads.length; i<j; i++) {
		
		if (ads[i].url) {
			html += '<div class="item"><img src="' + ads[i].url + '"></div>\n';
		}
	}
	return html;
}

function formatJSON(data) {

	return JSON.stringify(data, null, 4);//.replace(/\n/g, "<br/>");.replace(/ /g, "&nbsp;");
}
