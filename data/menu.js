
function init() {

	// move these into separate js (src-loaded from html)
	$('#log-button').unbind().click(function() {
		//console.log('#log-button.click');
		self && self.port.emit('show-log');
	});
	
	$('#vault-button').unbind().click(function() {
		//console.log('#vault-button.click');
		self && self.port.emit('show-vault');
	});
	
	$('#pause-button').unbind().click(function() {
		//console.log('#pause-button.click');
		self && self.port.emit('disable');
	});
	
	$('#settings-close').unbind().click(function() {
		
		console.log('#settings-close.click');
		
		$('.page').toggleClass('hide');
		$('.settings').toggleClass('hide');

		self && self.port.emit('hide-settings');
	});

	$('#settings-open').unbind().click(function() {
		
		console.log('#settings-open.click');
		
		$('.page').toggleClass('hide');
		$('.settings').toggleClass('hide');		

		self && self.port.emit('show-settings');
	});
	
	$('#about-button').unbind().click(function() {
		//console.log('#about-button.click');
		self.port.emit('show-about');
	}); 

	$('#cmn-toggle-1').unbind().click(function() {
		
		var val = $(this).prop('checked'); 
		
		console.log('#disable-logs.click: '+val);
		self && self.port.emit('disable-logs', { 'value' : val });
	}); 
}

self.port.on('refresh-panel', function(opts) {
	
	var img = 'img/adn78@2x.png', label = 'Pause AdNauseam';
	
	$('#pause-button').removeClass('disabled');
	
	if (!opts.enabled) {
		
		img = 'img/adn78@2xg.png';
		label = 'Start AdNauseam';
		$('#pause-button').addClass('disabled');
	}

	$('#toggle-button').css('background-image', 'url('+img+')');
	$('#pause-button').text(label); 
});

self.port.on('ad-updated', function(data) {
	
	console.log("Menu::ad-updated: ad#"+data.id);
});

self.port.on('refresh-ads', function(data) {
	
	//console.log('popup.refresh-ads: ad-objs->'+ads.length);
	
	console.log('Menu: objects=' + data.ads.length
		+', unique=' + data.uniqueCount
		+', onpage=' + data.onpage.length);
	
	var visitedCount = 0;
	for (var i=0, j = data.onpage.length; i<j; i++) {
		if (!data.onpage[i].hidden && data.onpage[i].visitedTs > 0) 
			visitedCount++;
	}
	
	$('#vault-count').text(data.uniqueCount);
	$('#found-count').text(data.onpage.length+' ads found');
	$('#visited-count').text(visitedCount+' ads visited'); 	
	$('#ad-list-items').html(createHtml(data.onpage));
});

function createHtml(ads) {
		
	var html = '';

	for (var i=0, j = ads.length; i<j; i++) {

		//console.log(i+") "+ads[i].contentType);

		if (ads[i].contentType === 'img') {

			html += '<li class="ad-item"><a target="new" href="' + ads[i].targetUrl;
			html += '"><span class="thumb"><img src="' + ads[i].contentData;
			html += '" class="ad-item-img' + (ads[i].visitedTs >= 0 ? '-visited"' : '"');
			html += ' onError="this.onerror=null; this.src=\'img/blank.png\';"';
			html += '" alt="ad thumb"></span><span class="title">' + ads[i].title;
			html += '</span><cite>'+targetDomain(ads[i].targetUrl)+'</cite></a></li>\n\n';
		}
		else if (ads[i].contentType === 'text') {
			
			html += '<li class="ad-item-text';
			html += (ads[i].visitedTs >= 0 ? '-visited' : '') + '""><span class="thumb">';
			html += 'Text Ad</span><h3><a target="new" href="' + ads[i].targetUrl + '">';
			html += ads[i].title + '</a></h3><cite>' + targetDomain(ads[i].targetUrl);
			html += '</cite><div class="ads-creative">' + ads[i].contentData +'</div></li>\n\n';
		}
	}
	
	//console.log("\nHTML\n"+html+"\n\n");
	
	return html;
}

function targetDomain(text) {
	
	var doms = extractDomains(text);
	var dom = doms[doms.length-1];
	return new URL(dom).hostname;
}

function extractDomains(text) {

	var result = [], matches;	
	var regexp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
	
	while (matches = regexp.exec(text))
	    result.push(matches[0]);
	
	//console.log(result);
	
	return result;
}

// -----------------------------------------------------------------

self.port.on("close-panel", function() {
	//console.log("popup.close-panel: ");
});

self.port.on("open-panel", function() {
	//console.log("popup.open-panel: ");	
});

self.port.on("load-advault", function() {
	//console.log("popup.load-advault: ");
});

$(document).ready(function() { init(); });
