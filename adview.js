self.port.on("ADNUpdateAdView", updateAdView);

updateAdView(self.options);

function updateAdView(o) {
	
	var result, ads = o.ads;

	result = formatDivs(ads);
	$('#container').html(result);

	result = formatJSON(ads);
	$('#json').html('<!--\n'+result+'\n-->');
}

function formatDivs(ads) {
	
	var html = '';
	for (var i=0, j = ads.length; i<j; i++) {
		
		if (ads[i].url) {
			html += '<div class="item"><img src="' + ads[i].url + '" alt="img alt"></div>\n';
		}
	}
	return html;
}

function formatJSON(data) {

	return JSON.stringify(data, null, 4);//.replace(/\n/g, "<br/>");.replace(/ /g, "&nbsp;");
}
