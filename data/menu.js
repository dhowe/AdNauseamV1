var TEST_APPEND_IDS = true;

self.port && self.port.on('layout-ads', layoutAds); // refresh all
self.port && self.port.on('update-ads', updateAds); // update some
self.port && self.port.on('refresh-panel', refreshPanel); // set-state

function refreshPanel(opts) {

	var img = 'img/adn_active.png', label = 'Pause AdNauseam';

	$('#pause-button').removeClass('disabled');

	if (!opts.enabled) {

		img = 'img/adn_disabled.png';
		label = 'Start AdNauseam';
		$('#pause-button').addClass('disabled');
	}

	$('#toggle-button').css('background-image', 'url('+img+')');
	$('#pause-button').text(label);
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

function updateAds(obj) {

    var sel, td, adhash = obj.data, updates = obj.updates, page = obj.page;

    // change class, {title, (visitedTs) resolved}
    for (var i=0, j = updates.length; i<j; i++) {

        // update the title
        sel = '#ad' + updates[i].id + ' .title';
        $(sel).text(updates[i].title);

        // update the url
        sel = '#ad' + updates[i].id + ' cite';
        td = targetDomain(updates[i]);
        if (td) $(sel).text(td);

        // update the class
        sel = '#ad' + updates[i].id;
        $(sel).addClass(updates[i].visitedTs > 0 ? 'visited' : 'failed');
        $(sel).removeClass('just-visited').addClass('just-visited');
        
        //console.log("UPDATE-CLASSES: "+$(sel)[0].classList);
    }

    $('#visited-count').text(visitedCount
        (processAdData(adhash, page).onpage)+' ads visited');
        
    animateIcon(500);
}

function animateIcon(ms) {
    
    var down = 'img/adn_visited.png', up = 'img/adn_active.png';
    $('#toggle-button').css('background-image', 'url('+down+')');
    setTimeout(function() {
        $('#toggle-button').css('background-image', 'url('+up+')');
    }, ms);
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
	
	showAlert(ads.length ? false : 'no ads found on page');

	for (var i=0, j = ads.length; i<j; i++) {

		//console.log(i+") "+ads[i].contentType);

		if (ads[i].contentType === 'img') {

			html += '<li id="ad' + ads[i].id +'" class="ad-item' + visitedClass(ads[i]);
			html += '"><a target="new" href="' + ads[i].targetUrl;
			html += '"><span class="thumb"><img src="' + ads[i].contentData;
			html += '" class="ad-item-img"';// + visitedState(ads[i]);
			html += ' onError="this.onerror=null; this.src=\'img/blank.png\';"';
			html += '" alt="ad thumb"></span><span class="title">';
			html +=  ads[i].title ? ads[i].title  : "#" + ads[i].id;
			html += '</span><cite>' + targetDomain(ads[i]) + '</cite></a></li>\n\n';
		}
		else if (ads[i].contentType === 'text') {

			html += '<li id="ad' + ads[i].id +'" class="ad-item-text' + visitedClass(ads[i]);
			html += '""><span class="thumb">Text Ad</span><h3><a target="new" href="'
			html += ads[i].targetUrl + '">' + ads[i].title + '</a></h3><cite>' + targetDomain(ads[i]);
			html += '</cite><div class="ads-creative">' + ads[i].contentData +'</div></li>\n\n';
		}
	}
	
//console.log("\nHTML\n"+html+"\n\n");

	return html;
}

function visitedClass(ad) {

	return ad.visitedTs > 0 ? ' visited' :
		(ad.visitedTs < 0 ? ' failed' : '');
}

/*
 * Start with resolvedTargetUrl if available, else use targetUrl
 * Then extract the last domain from the (possibly complex) url
 */
function targetDomain(ad) {

	var result, url = ad.resolvedTargetUrl || ad.targetUrl;
        domains = extractDomains(url);
	
	if (domains.length)  
	   result = new URL(domains.pop()).hostname;
	else
	   console.warn("ERROR: " + ad.targetUrl, url);
	
	if (result &&  TEST_APPEND_IDS)
	   result += ' (#'+ad.id+')';
	   
    return result;
}

function extractDomains(fullUrl) {

	var result = [], matches,
		regexp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

	while (matches = regexp.exec(fullUrl))
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
    
    //console.log('attachTests()');
    
    function assert(test, exp, msg) {
        msg = msg || 'expecting "' + exp + '", but got';
        console.log((test == exp) ? 'OK' : 'FAIL: ' + msg, test);
    }

	$('#log-button').off('click').click(function() {
		window.location.href = "log.html"
	});

	$('#vault-button').off('click').click(function() {
		window.location.href = "vault.html"
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

	//console.log('Ready: INIT_MENU_HANDLERS');

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
		
		createHtml([]);
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
