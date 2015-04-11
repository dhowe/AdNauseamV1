/*jslint browser: true*/

/*global self, showAlert, log, warn, toAdArray, targetDomain, 
    Type, TEST_APPEND_IDS, TEST_ADS, TEST_MODE, TEST_PAGE */

self.port && self.port.on('layout-ads', layoutAds);         // refresh all
self.port && self.port.on('update-ad', updateAd);           // update one
self.port && self.port.on('set-current', setCurrent);       // ad attempt
self.port && self.port.on('refresh-panel', refreshPanel);   // set-state
self.port && self.port.on('close-panel', closePanel);       // set-state

var adArray;

function layoutAds(json) {

    if (!json.data) return;
    
    adArray = json.data;

    loadDOM($('#ad-list-items'), adArray, json.pageCount);

    setCurrent(json);

    setCounts(json.pageCount, (json.pageCount ? 
        visitedCount(adArray) : 0), json.totalCount);
}

function loadDOM($items, ads, numOnPage) {

    showAlert(false);

    $items.removeClass();
    
    $items.empty();
    
    if (!ads) return;
    
    for (var i = 0, j = ads.length; i < j; i++) {

        if (ads[i].contentType === 'img') {

            appendImageAd(ads[i], $items);
        }
        else if (ads[i].contentType === 'text') {
        
            appendTextAd(ads[i], $items);
        }
    } 
        
    if (!numOnPage) showRecentAds(ads);
}

function appendImageAd(ad, $items) {

    var $a, $span, $li = $( '<li/>', {
    
        'id': 'ad' + ad.id,
        'class': 'ad-item' + visitedClass(ad)
    });

    $a = $( '<a/>', {
    
        'target': 'new',
        'href': ad.targetUrl
    });

    $span = $( '<span/>', { 'class': 'thumb' });

    $( '<img/>', {
        
        'src': (ad.contentData.src || ad.contentData),
        'class': 'ad-item-img',
        'onerror': "this.onerror=null; this.width=50; this.height=45; this.src='img/placeholder.svg'",
        
    }).appendTo( $span );

    $span.appendTo( $a );

    $( '<span/>', {
    
        'class': 'title',
        'text': ( ad.title ? ad.title : "#" + ad.id )
        
    }).appendTo( $a );

    $( '<cite/>', { 'text': targetDomain(ad) }).appendTo( $a );

    $a.appendTo( $li );
    $li.appendTo( $items );
}

function appendTextAd(ad, $items) {

    var $cite, $h3, $li = $('<li/>', {
    
        'id': 'ad' + ad.id,
        'class': 'ad-item-text' + visitedClass(ad)
    });

    $('<span/>', {
    
        'class': 'thumb',
        'text': 'Text Ad'
        
    }).appendTo($li);

    $h3 = $('<h3/>');

    $('<a/>', {
    
        'target': 'new',
        'class': 'title',
        'href': ad.targetUrl,
        'text': ad.title
        
    }).appendTo($h3);

    $h3.appendTo($li);

    $cite = $('<cite/>', { 'text': ad.contentData.site });

    if (TEST_APPEND_IDS) {
    
        $cite.text($cite.text() + ' (#' + ad.id + ')');
    }
        
    $cite.appendTo($li);

    $('<div/>', {
    
        'class': 'ads-creative',
        'text': ad.contentData.text
        
    }).appendTo($li);

    $li.appendTo( $items );
}

function updateAd(json) {

    //log('Menu::updateAd: ',json.update);
    
    var sel, td, op, update = json.update;

    if (!adArray) {

        warn('Menu::updateAds: ', "no ad array!!");
        return;
    }

    if (!replaceUpdatedAd(update))  {

        warn('Menu::updateAds: no update found!!', json);
        return;
    }

    // update the title
    sel = '#ad' + update.id + ' .title';
    $(sel).text(update.title);

    if (update.contentType !== 'text') {

        // update the url 
        sel = '#ad' + update.id + ' cite';
        td = targetDomain(update);
        if (td) $(sel).text(td);
    }

    // update the class
    sel = '#ad' + update.id;
    $(sel).addClass(update.visitedTs > 0 ? 'visited' : 'failed')
        .removeClass('just-visited').addClass('just-visited');
    
    // update the count
    op = onPage(adArray, json.page);
    $('#visited-count').text('clicked '+ visitedCount(op));

    //log("update:setCurrent: "+json.current);
    setCurrent(json);
    
    animateIcon(500);
}

function setCurrent(json) { 
    
    //log('menu::setCurrent: '+(json.current?json.current.id:-1));
    
    $('.ad-item').removeClass('attempting');

    // update the class for ad being attempted
    json.current && $('#ad' + json.current.id).addClass('attempting');
}
 
function replaceUpdatedAd(update) {

    // update the object itself
    for (var i=0, j = adArray.length; i<j; i++) {
        if (adArray[i].id == update.id)
            return (adArray[i] = update);
    }
    return null;
}

function closePanel() {

    // force-close settings if open
    
    if (!$('#settings').hasClass('hide'))
        $("#settings-close").trigger("click");
}

function refreshPanel(opts) {

    //log('refreshPanel: opts: ',opts);

    var img = 'img/adn_active.png', label = 'Pause AdNauseam';

    $('#pause-button').removeClass('disabled');

    if (!opts.enabled) {

        img = 'img/adn_disabled.png';
        label = 'Start AdNauseam';
        $('#pause-button').addClass('disabled');
    }

    $('#cmn-toggle-1').prop('checked', opts.disableLogs);
    $('#cmn-toggle-2').prop('checked', opts.disableOutgoingReferer);
    $('#cmn-toggle-3').prop('checked', opts.clearAdsWithHistory);
    
    $('#toggle-button').css('background-image', 'url('+img+')');
    $('#pause-button').text(label);
    
    $('#settings-version').text(opts.version);
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
    
    return arr.filter(function(ad) { return ad.visitedTs > 0; }).length;
}

function onPage(arr, pageUrl) {
 
    return arr.filter(function(ad) { return ad.pageUrl === pageUrl; });
}

function showRecentAds(recent) { 
       
    var msg = 'No ads on this page';
    if (recent && recent.length) 
        msg += ' (showing recent)';

    showAlert(msg);

    $('#ad-list-items').addClass('recent-ads');
    
    log('No-ads on page, showing '+recent.length+' recent');
}

function visitedClass(ad) {

    return ad.visitedTs > 0 ? ' visited' :
        (ad.visitedTs < 0 ? ' failed' : '');
}

function attachMenuTests() {

    log('attachMenuTests()');

    function assert(test, exp, msg) {
        msg = msg || 'expecting "' + exp + '", but got';
        log((test == exp) ? 'OK' : 'FAIL: ' + msg, test);
    }

    $('#log-button').off('click').click(function() {
        window.location.href = "log.html";
    });

    $('#vault-button').off('click').click(function() {
        window.location.href = "vault.html";
    });

    $('#about-button').off('click').click(function() {
        window.location.href = "https://github.com/dhowe/AdNauseam/wiki/Help";
    });

    $.getJSON(TEST_ADS, function(json) {

        warn("Menu.js :: Loading test-ads: "+TEST_ADS);
        
        if (Type.is(json,Type.O)) json = toAdArray(json); //BC

            layoutAds({ // not testing page-url correctly
                data : json,
                page : TEST_PAGE,
                pageCount : json.length,
                totalCount : json.length
            }); 

    }).fail(function(e) { warn( "error:", e); });
}

(function() {

    $('#log-button').click(function(e) {

        self.port && self.port.emit("show-log");
    });
    
    $('#import-ads').click(function(e) {

        e.preventDefault();
        self.port && self.port.emit("import-ads");
    });
    
    $('#export-ads').click(function(e) {

        e.preventDefault();
        self.port && self.port.emit("export-ads");
    });

    $('#vault-button').click(function() {

        self.port && self.port.emit("show-vault");
    });

    $('#clear-ads').click(function(e) {

        e.preventDefault(); // no click

        // remove all visible ads from menu
        $('.ad-item').remove();
        $('.ad-item-text').remove();

        setCounts(0, 0, 0);

        // trigger closing of settings
        $("#settings-close").trigger("click");

        // call addon to clear simple-storage
        self.port && self.port.emit("clear-ads");

        loadDOM($('#ad-list-items'), null, null);
    });

    $('#pause-button').click(function() {

        self.port && self.port.emit('disable');
    });

    $('#settings-close').click(function() {

        $('.page').toggleClass('hide');
        $('.settings').toggleClass('hide');

        //self.port && self.port.emit('hide-settings');
    });

    $('#settings-open').click(function() {

        $('.page').toggleClass('hide');
        $('.settings').toggleClass('hide');

        //self.port && self.port.emit('show-settings');
    });

    $('#about-button').click(function() {

        self.port && self.port.emit('show-about');
    });

    $('#cmn-toggle-1').click(function() { // logging

        var val = $(this).prop('checked');
        self.port && self.port.emit('disable-logs', { 'value' : val });
    });

    $('#cmn-toggle-2').click(function() { // referer

        var val = $(this).prop('checked');
        self.port && self.port.emit('disable-referer', { 'value' : val });
    });
    
    $('#cmn-toggle-3').click(function() { // clear

        var val = $(this).prop('checked');
        self.port && self.port.emit('clear-ads-with-history', { 'value' : val });
    });

})();
