var testing = 0;

if (!testing)  {
	
	self.port.on("ADNUpdateAdView", updateAdView);
	updateAdView(self.options);
}

function formatDivs(ads) {
	
	var html = '', ads = findDups(ads);
	for (var i=0, j = ads.length; i<j; i++) {
		
		if (ads[i].url) {
			var ad = ads[i];
			html += '<div class="	item ';
			if (ad.visited==0) html += 'pending '	
			if (ad.visited<0)  html += 'failed '	
			html += 'dup-count-'+ad.count+'" ';
			html += 'data-detected="'+format(ad.found)+'" ';
			html += 'data-visited="'+format(ad.visited)+'" ';
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

// function format(ts) {
	// console.log(d);
	// return d.format("dddd, mmmm dS, yyyy, h:MM:ss TT");
// }

function format(ts) {
	
	var date = new Date(ts);
	var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	var pad = function(str) {
		str = String(str);
		return (str.length < 2) ? "0" + str : str;
	}
	var meridian = (parseInt(date.getHours() / 12) == 1) ? 'PM' : 'AM';
	var hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
	return days[date.getDay()] + ' ' + months[date.getMonth()] + ' ' + date.getDate() 
		+ ' ' + date.getFullYear() + ' ' + hours + ':' + pad(date.getMinutes()) + meridian.toLowerCase();
		//+ ':' + pad(date.getSeconds()) + ' ' + meridian;
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
			hash[ad.url] = hash[ad.url]+1;
			ad.hidden = true;
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
