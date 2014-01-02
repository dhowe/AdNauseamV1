
self.addEventListener('click', function(event) {
 
	if (event.button == 2 || (event.button == 0 && event.shiftKey == true))
		addon.port.emit('right-click');
		
	event.preventDefault(); 
	
	addon.port.emit("ADNCloseAdView");

}, true);

addon.port.on("ADNUpdateAdView", updateAdView);

function updateAdView(o) {
	
	//console.log('AdView::ADNUpdateAdView()');
	
	var adlookup = o.lookup, page = o.page, listPages = 0,
		keys = Object.keys(adlookup), result = '<p>';
		
	if (!keys.length) {
		$('#content').html("No ads for page: "+page);
		return;
	}
	result += 'Page: ' + page + '<br/>\n';
	
	if (listPages) { // list all stored pages
		for (var i = 0, j = keys.length; i < j; i++) {
			var ads = adlookup[keys[i]];
			result += '<b>' + keys[i] + ":" + ads.length + "</b><br/>\n";
		}
		result += '</p>\n';
	}
	
	if (page) { // ads for current page
		result += formatJSON(adlookup[page]);
	}

	///console.log(result);

	$('#content').html(result);
}

function formatJSON(data) {

	return JSON.stringify(data, null, 4).replace(/\n/g, "<br/>").replace(/ /g, "&nbsp;");
}

function formatHTML(data) { // NOT USED RIGHT NOW

	var keys = Object.keys(data), html = '';

	for (var i = 0, j = keys.length; i < j; i++) {

		html += '<div class=adn-page><div class=adn-url>' + keys[i] + "</div>\n";
		var ads = data[keys[i]];

		for (var m = 0, n = ads.length; m < n; m++) {
			html += '<div class=adn-ad>';
			html += "<a href='" + ads[m].target + "' target=_blank>\n";
			html += "<img src='" + ads[m].url + "' title='" + ads[m].target + "'>\n";
			html += "</a></div>\n";
			//console.log(i+") "+ads[i].type+": "+ads[i].url+" :: "+ads[i].target);
		}

		html += "</div>\n";
	}

}
