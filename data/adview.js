
//self.port.on("ADNUpdateAdView", updateAdView);
updateAdView(self.options);

function updateAdView(o, min, max) {
	
	min = min || 0;
	max = max || Number.MAX_VALUE;
	
	console.log('updateAdView: '+min+'-'+max);
	
	var ads = filterDateRange(o.ads, min, max),
		result = formatDivs(ads),
		stats = formatStats(ads);
		
	console.log('total-ads: '+ads.length);
			
	
//	        min: sinceTime(ads),
//	        max: +new Date()

	var slider = $("#history-range-slider");
   	slider.noUiSlider({
	
		// Create two timestamps to define a range.
	    range: {
	        min: timestamp('2014'),
	        max: timestamp('2015')
	    }
	    
	}, true);
    
	$('#container').html(result);
	$('#stats').html(stats);
	
	console.log(stats);
	
	//result = formatJSON(ads);
	//$('#json').html('<!--\n'+result+'\n-->');
}

function filterDateRange(ads, min, max) {
	
	var result = [];
	
	for (var i=0, j = ads.length; i<j; i++) {
		
		if (ads[i].found < min || ads[i].found > max) {
			
			console.log("Filter (date-slider): "+ads[i].found); 
			continue;
		}
		
		result.push(ads[i]);
	}
	
	return result;
}

function formatDivs(ads) {
		
	var html = '', ads = findDups(ads);
	
	for (var i=0, j = ads.length; i<j; i++) {
		
		if (ads[i].url) {
			
			var ad = ads[i];
			
			html += '<a href="'+ad.target+'" class="item';
			html += ad.hidden ? '-hidden ' : ' '; // hide dups w css
			
			if (ad.visited==0) html += 'pending ';	
			if (ad.visited<0)  html += 'failed ';	
			
			html += 'dup-count-'+ad.count+'" ';
			html += 'data-detected="'+formatDate(ad.found)+'" ';
			html += 'data-visited="'+formatDate(ad.visited)+'" ';
			html += 'data-target="'+ad.target+'" ';
			html += 'data-url="'+ad.url+'" ';
			html += 'data-origin="'+ad.page+'">';
			
			if (!ad.hidden) 
			{
				html += '<span class="counter">'+ad.count+'</span>';
				//html += '<span class="eye" data-href="'+ad.page+'">go to origin link</span>';
				html += '<img src="' + ad.url + '" alt="ad">';
			}
			
			html += '</div>\n';
		}
	}
	
	//console.log("\nHTML\n"+html+"\n\n");
	
	return html;
}

function formatStats(ads) {
	
	return 'Since '+ formatDate(sinceTime(ads)) + ': <strong>' + // TODO: get rid of html here
	ads.length+' ads detected, '+numVisited(ads)+' visited.</strong>';
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
		+ meridian.toLowerCase() + ' ('+ts+')'; // attach ts to end for debugging
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


window.addEventListener("addon-message", function(event) {
	
  console.log(JSON.stringify(event.detail));
  updateAdView(self.options, event.detail.min,  event.detail.max);

}, false);
