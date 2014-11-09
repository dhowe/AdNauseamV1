

self.port && self.port.on('refresh-ads', layoutAds); // refresh all
self.port && self.port.on('update-ads', updateAds); // update some

self.port && self.port.on('refresh-panel', function(opts) {

	var img = 'img/adn_active.png', label = 'Pause AdNauseam';

	$('#pause-button').removeClass('disabled');

	if (!opts.enabled) {

		img = 'img/adn_disabled.png';
		label = 'Start AdNauseam';
		$('#pause-button').addClass('disabled');
	}

	$('#toggle-button').css('background-image', 'url('+img+')');
	$('#pause-button').text(label);
});

self.port && self.port.on("close-panel", function() {
	//console.log("popup.close-panel: ");
});

self.port && self.port.on("open-panel", function() {
	console.log("popup.open-panel: ");
});

self.port && self.port.on("load-advault", function() {
	console.log("popup.load-advault: ");
});

function processAdData(adhash, pageUrl) {

	var ads = toAdArray(adhash);

//console.warn("processAdData: "+ads.length+", "+pageUrl);

	var ad, unique=0, onpage=[], soFar, hash = {};

	// set hidden val for each ad
	for (var i=0, j = ads.length; i<j; i++) {

		ad = ads[i];

		if (!ad.contentData) continue;

		soFar = hash[ad.contentData];
		if (!soFar) {

			// new: add a hash entry
			hash[ad.contentData] = 1;
			ad.hidden = false;

			// update count on this page
			if (pageUrl === ads[i].pageUrl ||
				(typeof testPageUrl != 'undefined' &&
					testPageUrl === ads[i].pageUrl))  // for testing
			{
				// TODO: don't count old ads from same url
				onpage.push(ads[i]);
			}

			// update total (unique) count
			unique++;
		}
		else {

			// dup: update the count
			hash[ad.contentData]++;
			ad.hidden = true;
		}
	}

	// update the count for each ad from hash
	for (var i=0, j = ads.length; i<j; i++) {

		ad = ads[i];
		ad.count = hash[ad.contentData];
	}

	return { ads: ads, onpage: onpage, unique: unique };
}

function currentPage() {

	var url = window && window.top
		 && window.top.getBrowser().selectedBrowser.contentWindow.location.href;
	return url && url != "about:blank" ? url : null;
}

function updateAds(obj) {

	var adhash = obj.data, updates = obj.updates, page = obj.page;

	//console.log("updates: "+updates.length);
	//console.log("ads: "+toAdArray(adhash).length);

	// change class, {title, (visitedTs) resolved}
	for (var i=0, j = updates.length; i<j; i++) {

		// update the title
		var sel = '#ad' + updates[i].id + ' .title';
		$(sel).text(updates[i].title);

		// update the url
		var sel = '#ad' + updates[i].id + ' cite';
		$(sel).text(updates[i].resolvedTargetUrl);

		// update the class
		$(sel).addClass('visited');
	}

	var data = processAdData(adhash, page);
	$('#visited-count').text(visitedCount(data.onpage)+' ads visited');

	//console.log('UPDATES COMPLETE!');
	//setCounts(data.onpage.length, visitedCount, data.ads.length);
}


function layoutAds(adHashAndPageObj) {

	var adhash = adHashAndPageObj.data;
	var page = typeof TEST_MODE != 'undefined'
		&& TEST_MODE ? TEST_PAGE : adHashAndPageObj.page;
	var data = processAdData(adhash, page);

	//console.log('Menu: ads.total=' + data.ads.length
		//+', ads.onpage=' + data.onpage.length+", page="+page);

	$('#ad-list-items').html(createHtml(data.onpage));
	setCounts(data.onpage.length, visitedCount(data.onpage), data.ads.length);
}

function toAdArray(adhash, filter) {

	var all = [], keys = Object.keys(adhash);
	for (var i = 0, j = keys.length; i < j; i++) {

		var ads = adhash[keys[i]];
		for (var k=0; k < ads.length; k++) {

			if (!filter || filter(ads[k]))
				all.push(ads[k]);
		}
	}

	return all;
}

function setCounts(found, visited, total) {

	$('#found-count').text(found+' ads detected');
	$('#visited-count').text('clicked '+visited);
	$('#vault-count').text(total);
}

function visitedCount(arr) {

	var visitedCount = 0;
	for (var i=0, j = arr.length; i<j; i++) {
		if (!arr[i].hidden && arr[i].visitedTs > 0)
			visitedCount++;
	}
	return visitedCount;
}

function createHtml(ads) {

	var html = '';

	for (var i=0, j = ads.length; i<j; i++) {

		//console.log(i+") "+ads[i].contentType);

		if (ads[i].contentType === 'img') {

			html += '<li id="ad'+ads[i].id+'" class="ad-item'+visitedClass(ads[i]);
			html += '"><a target="new" href="' + ads[i].targetUrl;
			html += '"><span class="thumb"><img src="' + ads[i].contentData;
			html += '" class="ad-item-img"';// + visitedState(ads[i]);
			html += ' onError="this.onerror=null; this.src=\'img/blank.png\';"';
			html += '" alt="ad thumb"></span><span class="title">';
			html +=  ads[i].title ? ads[i].title  : "#"+ads[i].id;
			html += '</span><cite>'+targetDomain(ads[i])+'</cite></a></li>\n\n';
		}
		else if (ads[i].contentType === 'text') {

			html += '<li id="ad'+ads[i].id+'" class="ad-item-text'+visitedClass(ads[i]);
			html += '""><span class="thumb">Text Ad</span><h3><a target="new" href="'
			html += ads[i].targetUrl + '">'+ads[i].title + '</a></h3><cite>' + targetDomain(ads[i]);
			html += '</cite><div class="ads-creative">' + ads[i].contentData +'</div></li>\n\n';
		}
	}

//console.log("\nHTML\n"+html+"\n\n");

	return html;
}

function visitedClass(ad) {

	return ad.visitedTs > 0 ? ' visited' :
		(ad.visitedTs < 0 ? ' errored' : '');
}

/*
 * Start with resolvedTargetUrl if available, else use targetUrl
 * Then extract the last domain from the (possibly complex) url
 */
function targetDomain(ad) {

	var url = ad.resolvedTargetUrl || ad.targetUrl;
	return new URL(extractDomains(url).pop()).hostname;
}

function extractDomains(text) {

	var result = [], matches,
		regexp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

	while (matches = regexp.exec(text))
	    result.push(matches[0]);

	return result;
}

function param(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function attachTests() {

	$('#log-button').off('click').click(function() {
		window.location.href = "log.html"
	});

	$('#vault-button').off('click').click(function() {
		window.location.href = "advault.html"
	});

	$('#about-button').off('click').click(function() {
		window.location.href = "https://github.com/dhowe/AdNauseam/wiki/Help"
	});

	$.getJSON(TEST_ADS, function(jsonObj) {

		console.warn("Menu.js :: Loading test-ads: "+TEST_ADS);
	    layoutAds({ data : jsonObj, page : TEST_PAGE });

	}).fail(function(e) { console.warn( "error:", e); });
}

(function() {

	console.log('INIT_HANDLERS');

	$('#log-button').click(function(e) {
		//console.log('#log-button.click');

		self.port && self.port.emit("show-log");
	});

	$('#vault-button').click(function() {
		//console.log('#vault-button.click');

		self.port && self.port.emit("show-vault");
	});

	$('#clear-ads').click(function(e) {

		e.preventDefault(); // no click

		// remove all visible ads from menu
		$('.ad-item').remove();
		$('.ad-item-text').remove();
		setCounts(0, 0, 0);

		// trigger closing of settings
		$("#settings-close").trigger( "click" );

		// call addon to clear simple-storage
		self.port && self.port.emit("clear-ads");
	});

	$('#pause-button').click(function() {
		//console.log('#pause-button.click');
		self.port && self.port.emit('disable');
	});

	$('#settings-close').click(function() {

		//console.log('#settings-close.click');

		$('.page').toggleClass('hide');
		$('.settings').toggleClass('hide');

		self.port && self.port.emit('hide-settings');
	});

	$('#settings-open').click(function() {

		//console.log('#settings-open.click');

		$('.page').toggleClass('hide');
		$('.settings').toggleClass('hide');

		self.port && self.port.emit('show-settings');
	});

	$('#about-button').click(function() {

		//console.log('#about-button.click');
		self.port && self.port.emit('show-about');
	});

	$('#cmn-toggle-1').click(function() {

		var val = $(this).prop('checked');

		//console.log('#disable-logs.click: '+val);
		self.port && self.port.emit('disable-logs', { 'value' : val });
	});

})();
