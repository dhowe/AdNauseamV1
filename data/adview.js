self.port.on("ADNUpdateAdView", updateAdView);

updateAdView(self.options);

function updateAdView(o) {
	
	//console.log('AdView::ADNUpdateAdView('+o.ads.length+')');
	
	var result, ads = o.ads;
		
	/*ads.sort(function(a,b) { // sort by found-time
		
		return (a.found > b.found) ? 1 : ((b.found > a.found) ? -1 : 0); 
	});*/

	result = formatDivs(ads);
	$('#container').html(result);
	
	// for (var i=0; i < ads.length; i++) {
	  // console.log(ads[i]);
	// };
	
	result = formatJSON(ads);
	$('#json').html(result);
	
	var $container = $('#container');
	
	$container.isotope({
	  itemSelector: '.item',
	  layoutMode: 'masonry'
	});
}

function formatDivs(ads) {
	
	var html = '';
	for (var i=0, j = ads.length; i<j; i++) {
		
		if (ads[i].url) {
			html += '<div class="item"><img src="' + ads[i].url + '"></div>\n';
		}
	}
	return html;
}

function formatJSON(data) {

	return JSON.stringify(data, null, 4).replace(/\n/g, "<br/>").replace(/ /g, "&nbsp;");
}
