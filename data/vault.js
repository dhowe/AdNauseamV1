//inspectorData, inspectorIdx, animatorId, resizing = false, , animateMs = 2000, container, pack;
var viewState = { zoomIdx: 0, left: '-5000px', top: '-5000px' }, 
    zoomStyle, zoomIdx = 0, zooms = [ 100, 50, 25, 12.5, 6.25 ],
    animatorId, animateMs = 2000, adGroups, selectedGroup,
    states = ['pending', 'visited', 'failed' ]; 

self.port && self.port.on('layout-ads', layoutAds); // refresh all
self.port && self.port.on('update-ads', updateAds); // update some

/* NEXT: 
    -- test updates
    -- store page-title
    -- test current-ad handling (broken in shared.js)
    DONE
    -- check broken image handling in menu
*/         
function layoutAds(addonData) {

    var adgr = createAdGroups(addonData.data),
        currentAd = addonData.currentAd;

    //log('Vault.layoutAds: '+adgr.length);

    addInterfaceHandlers();

    createSlider(asAdArray(adgr));

    doLayout(adgr, true);

    currentAd && tagCurrentAd(currentAd);
}


// CHANGED(12/19): Each ad is now visited separately
function updateAds(addonData) {

    var ads = processAdData(addonData.data).ads,
        vdate, update = addonData.update,
        currentAd = addonData.currentAd,

    all = ads.slice(); // save original set

    // update class/title/visited/resolved-url
    doUpdate(update);

    currentAd && tagCurrentAd(currentAd);

    computeStats(ads);
}

function doUpdate(updated) {

    //console.log('doUpdate: #'+updated.id);

    var sel = '#ad' + updated.id, newClass;

    // update the title
    $(sel).attr('data-title', updated.title);

    // update the visit-time
    var vdate = formatDate(updated.visitedTs);
    $(sel).attr('data-visitedTs', vdate);

    // update the target-url
    if (updated.resolvedTargetUrl) {

        //log(sel+": resolvedTargetUrl="+updated.resolvedTargetUrl);
        $(sel).attr('data-targetUrl', updated.resolvedTargetUrl);
    }

    // update the class (now visited)
    newClass = (updated.visitedTs > 0) ? 'visited' : 'failed';
    $(sel).removeClass('pending').addClass(newClass);
    $(sel).removeClass('just-visited').addClass('just-visited');

    // Update inspector fields with (title,visitedTs,targetUrl)
    //if ($(sel).hasClass('inspectee'))
        //updateInspector(updated, vdate);
}

function createDivs(adgr) {
    
    adGroups = adgr;
    
    for (i=0; i < adgr.length; i++) {

        var $div = $('<div/>', {
            
            class: 'item dup-count-'+adgr[i].count(),
            'data-gid': adgr[i].id,
            
        }).appendTo('#container');

        layoutAd($div, adgr[i]);
    }
}

function layoutAd($div, adgr) {
       
    // append the display
    (adgr.child(0).contentType === 'text' ? 
        appendTextDisplayTo : appendDisplayTo)($div, adgr);   

    appendBulletsTo($div, adgr);
    appendMetaTo($div, adgr);
  
    $div.addClass(adgr.groupState());
}

function appendDisplayTo($div, adgr) {

    var $ad = $('<div/>', { class: 'ad' }).appendTo($div);
    var total = adgr.count(), visited = adgr.visitedCount();
    
    var $span = $('<span/>', {
        
        class: 'counter',
        text: total
        
    }).appendTo($ad);
    
    var $cv = $('<span/>', {
        
        id : 'index-counter',
        class: 'counter counter-visited',
        text:  indexCounterText(adgr)
        
    }).appendTo($ad).hide();
    
    var img = $('<img/>', {

        src: adgr.child(0).contentData.src,
        
        onerror: "this.onerror=null; this.width=200; this.height=100; " +
            "this.alt='unable to load image'; this.src=\'img/placeholder.svg\'",
        
    }).appendTo($ad);
}

function appendTextDisplayTo($pdiv, adgr) {

    var $div = $('<div/>', { class: 'item-text-div' }).appendTo($pdiv);
    var total = adgr.count(), visited = adgr.visitedCount();

    var ad = adgr.child(0);
    
    
        
    var $span = $('<span/>', {
        
        class: 'counter',
        text: adgr.count()
        
    }).appendTo($div);
    
    var $cv = $('<span/>', {
        
        id : 'index-counter',
        class: 'counter counter-visited',
        text: indexCounterText(adgr)
        
    }).appendTo($div).hide();
    
    var $h3 = $('<h3/>', {}).appendTo($div);
    
    var $a = $('<div/>', { // title
        
        class: 'title',
        text: ad.title,
        //href: ad.targetUrl,
        target: 'new'
        
    }).appendTo($h3);
    
    $('<cite/>', { text: ad.contentData.site }).appendTo($div); // site
    
    $('<div/>', { // text
        
        class: 'ads-creative',
        text: ad.contentData.text
        
    }).appendTo($div);
    
    $div.addClass('item-text');
}

function bulletIndex($div, adgr) {
    
    //console.log('bulletIndex: '+adgr.index);
    
    // set the active bullet
    
    var items = $div.find('.bullet');
    $(items[adgr.index]).addClass('active')
        .siblings().removeClass('active');
    
    // shift the meta-list to show correct info
    
    var $ul = $div.find('.meta-list');
    $ul.css('margin-top', (adgr.index * -110) +'px');
    
    $div.find('#index-counter').text(indexCounterText(adgr)); 
    
    states.map(function(d) { $div.removeClass(d) } ); // remove-all
    $div.addClass(adgr.state());
}

function indexCounterText(adgr) {
    
    return (adgr.index+1)+'/'+adgr.count();
}

function appendBulletsTo($div, adgr) {
    
    var count = adgr.count();
    
    if (count > 1) {
        
        var $bullets = $('<div/>', { class: 'bullets'  }).appendTo($div);
        var $ul = $('<ul/>', {}).appendTo($bullets);
    
        // add items based on count/state
        for (var i=0; i < adgr.count(); i++) {
            
            var $li = $('<li/>', { 
                'data-idx': i, 
                'class': 'bullet '+ adgr.state(i) 
            }).appendTo($ul);
            
            $li.click(function(e) {
                
                adgr.index = parseInt($(this).attr('data-idx'));
                
                //console.log('item.clicked: '+adgr.index);
                
                bulletIndex($div, adgr);
                e.stopPropagation();
            });
        }
    }
    
    bulletIndex($div, adgr);
}

function appendMetaTo($div, adgr) {

    var $meta = $('<div/>', { class: 'meta' }).appendTo($div);
    
    var $ul = $('<ul/>', {  
        class: 'meta-list', 
        style: 'margin-top: 0px'
    }).appendTo($meta);
    
    for (var i=0; i < adgr.count(); i++) {
        
        var ad = adgr.child(i);
        
        var $li = $('<li/>', { style: 'margin-top: 0px' }).appendTo($ul);
        
            var $target = $('<div/>', { class: 'target' }).appendTo($li);
            
                $('<h3/>', { text: 'target:' }).appendTo($target);
                $('<a/>', { class: 'inspected-title', 
                            href: ad.targetUrl,
                            text: ad.title
                }).appendTo($target); // TODO: visited?
                $('<cite/>', { text: targetDomain(ad) }).appendTo($target);
                $('<span/>', { class: 'inspected-date', text: formatDate(ad.visitedTs) }).appendTo($target); 
                                
            var $detected = $('<div/>', { class: 'detected-on' }).appendTo($li);
            
                $('<h3/>', { text: 'detected on:' }).appendTo($detected);
                $('<a/>', { class: 'inspected-title', 
                            href: ad.pageUrl,
                            text: ad.pageTitle
                }).appendTo($detected); // TODO: visited?
                $('<cite/>', { text: ad.pageUrl }).appendTo($detected);
                $('<span/>', { class: 'inspected-date', text: formatDate(ad.foundTs) }).appendTo($detected);                
    }
}
    
function doLayout(theAds, resetLayout) {

    //console.log('Vault.doLayout: '+theAds.length);

    if (!theAds) throw Error("No ads!");

    createDivs(theAds);

    computeStats(theAds);

    enableLightbox();

    repack(resetLayout);
    
    //dbugOffsets && addTestDivs();
}

function repack(resetLayout) {

	var $items =  $(".item"), visible = $items.length;

	//log("Vault.repack() :: "+visible);

    showAlert(visible ? false : 'no ads found');

	if (visible > 1) { // count non-hidden ads

		//setTimeout(function() { // do we need this delay?
        var $container = $('#container').imagesLoaded( function() {
            
			new Packery(
				'#container', {
					centered : { y : 5000 }, // centered half min-height
					itemSelector : '.item',
					gutter : 1
			});

            storeInitialLayout($items);
            
			if (resetLayout) positionAds();
        });
		//}, 300);
	}
	else if (visible === 1) {

		// center single ad here (no pack)
		var sz = realSize( $('.item img') );
    
        console.log("SINGLE PACK: ", sz);// $('#right').width());

        if (!sz.w) console.warn("No width for image! "+sz.w);

		$(".item").css({ top: '5000px' , left: (5000 - sz.w/2) + 'px' } ); 
	}
}

function computeStats(ads) {

    $('.since').text(formatDate(sinceTime(ads)));
    $('.clicked').text(numVisited(ads) + ' ads clicked');
    $('.detected').text(numFound(ads)+ ' detected.');
}

function numVisited(ads) {

	var numv = 0;
	for (var i=0, j = ads.length; i<j; i++)
		numv += (ads[i].visitedCount());
	return numv;
}

function numFound(ads) {

    var numv = 0;
    for (var i=0, j = ads.length; i<j; i++) {

        numv += (ads[i].count());
    }
    return numv;
}


function sinceTime(ads) {

	var oldest = +new Date(), idx = 0;
	for (var i=0, j = ads.length; i<j; i++) {

        var foundTs = ads[i].child(0).foundTs;  
		if (foundTs < oldest) {
			oldest = foundTs;
			idx = i;
		}
	}
	return oldest;
}

function dragStart(e) {
    console.log('dragStart');

    var style = window.getComputedStyle(document.querySelector('#container'), null);
	   x = parseInt(style.getPropertyValue("margin-left"), 10) - e.clientX,
	   y = parseInt(style.getPropertyValue("margin-top"),  10) - e.clientY;

    e.dataTransfer.setData("text/plain", x + ',' + y);
    
    $('#container').addClass('dragged');
}

function drag(e) {

	var offset = e.dataTransfer.getData("text/plain").split(','),
        dm = document.querySelector('#container');

    dm.style.marginLeft = (e.clientX + parseInt(offset[0], 10)) + 'px';
    dm.style.marginTop = (e.clientY + parseInt(offset[1], 10)) + 'px';

	//dbugOffsets && updateTestDivs();
}

function dragEnd(e) {
 
    $('#container').removeClass('dragged');
}

function formatDate(ts) {

	if (!ts) return 'pending';

	if (ts < 0)  return 'Unable to Visit';

	var date = new Date(ts), days = ["Sunday", "Monday",
		"Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

	var months = ["January", "February", "March", "April", "May",
		"June", "July", "August", "September", "October",
		"November", "December"];

	var pad = function(str) {

		str = String(str);
		return (str.length < 2) ? "0" + str : str;
	}

	var meridian = (parseInt(date.getHours() / 12) == 1) ? 'PM' : 'AM';
	var hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();

	return days[date.getDay()] + ', ' + months[date.getMonth()] + ' ' + date.getDate()
		+ ' ' + date.getFullYear() + ' ' + hours + ':' + pad(date.getMinutes())
		+ meridian.toLowerCase();
}

// TODO: This should only reset the x-axis/scale, not recreate everything?
function resizeHistorySlider() {

	createSlider(all);
}

function enableLightbox() {

    $('.item').click(function(e) {
        
        //console.log('item.clicked');
        e.stopPropagation();
        lightboxMode(this); 
    });
}

function storeInitialLayout($items) {
    
    var cx = $(window).width()/2, cy = $(window).height()/2;
  
    $items.each(function() {
         
        var $this = $(this),
            offset = $this.offset(),
            width = $this.width(),
            height = $this.height(),
            centerX = offset.left + width / 2,
            centerY = offset.top + height / 2;

        $this.attr('data-offx', cx - centerX);
        $this.attr('data-offy', cy - centerY);        
    });
}

function centerZoom($ele) {
    
    var dm = document.querySelector('#container');
    
    if ($ele) { // save zoom-state
        
        viewState.zoomIdx = zoomIdx; 
        viewState.left = dm.style.marginLeft;
        viewState.top = dm.style.marginTop;
          
        setZoom(zoomIdx = 0);
        
        var offx = parseInt($ele.attr('data-offx')), offy = parseInt($ele.attr('data-offy'));
        dm.style.marginLeft = (-5000 + offx)+'px'; // TODO: also needs offset from collage center 
        dm.style.marginTop = (-5000 + offy)+'px'; // TODO: also needs offset from collage center
        //console.log("click: ",dm.style.marginLeft,dm.style.marginTop);
    }       
    else { // restore zoom-state
        
        setZoom(zoomIdx = viewState.zoomIdx); 
        
        dm.style.marginLeft = viewState.left;
        dm.style.marginTop = viewState.top;
    }
}

function lightboxMode(selected) {
    
    //console.log('lightboxMode: '+selected);

    var $selected = selected && $(selected);

    if ($selected && !$selected.hasClass('inspected')) {
        
        var $selected = $(selected);
        
        var inspectedId = parseInt($selected.attr('data-gid'));
        selectedGroup = findGroupById(inspectedId);
        
        centerZoom($selected);
        
        $selected.addClass('inspected').siblings().removeClass('inspected');
        
        if ($selected.find('.bullet').length > 1) 
            $selected.find('span.counter-visited').show();
        
        $('#container').addClass('lightbox');
        
        animateInspector($selected);
    }
    else {
        
        centerZoom(false);
        
        var $item = $('.item');
        $item.removeClass('inspected');
        $item.find('span.counter-visited').hide();
        
        $('#container').removeClass('lightbox');
        
        animateInspector(false);
    }
}

function animateInspector($inspected) {

    animatorId && clearTimeout(animatorId); // stop
    
    // animate if we have a dup-ad being inspected
    if ($inspected && selectedGroup && selectedGroup.count()) {

        animatorId = setInterval(function() {

            if (++selectedGroup.index === selectedGroup.count())
                selectedGroup.index = 0;

            bulletIndex($inspected, selectedGroup);

        }, animateMs);
    }
}

function inspectorAnimator($selected) {

    console.log('inspectorAnimator()');
    

}

function findGroupById(id) {
    
    for(var i=0, j = adGroups.length; i<j; i++){
        
      if (adGroups[i].id === id)
        return adGroups[i];
    }
    
    throw Error('No group for: '+id);
}

function notifyAddon(adId) {

    //console.log("Vault.notify:"+adId);
    //if ( typeof notifyTimer == 'undefined')
      //  var notifyTimer = 0;

    //clearTimeout(notifyTimer);

    //notifyTimer = setTimeout(function() {

    self.port && self.port.emit("update-inspector", { "id": adId } );

    //}, 200); // not sure if we need this delay
}

function attachTests() {

	$.getJSON(TEST_ADS, function(jsonObj) {

		console.warn("(new)Vault.js :: Loading test-ads: "+TEST_ADS);
	    layoutAds({ data : jsonObj, page : TEST_PAGE, currentAd: null }); // currentAd?

	}).fail(function(e) { console.warn( "error:", e); });
}

function realSize(theImage) { // use cache?

	// Create new offscreen image
	var theCopy = new Image();
	theCopy.src = theImage.attr("src");

	// Get accurate measurements from it
	return { w: theCopy.width, h: theCopy.height };
}

function zoomIn() {

	(zoomIdx > 0) && setZoom(--zoomIdx);
}

function zoomOut() {

	(zoomIdx < zooms.length-1) && setZoom(++zoomIdx);
}

function setZoom(idx) {

	$('#container').removeClass(zoomStyle).addClass // swap zoom class
		((zoomStyle = ('z-'+zooms[idx]).replace(/\./, '_')));

	$('#ratio').html(zooms[idx]+'%');

	//dbugOffsets && updateTestDivs();
}


function positionAds() { // autozoom & center (ugly)

	//log("Vault.positionAds");

	var percentVisible = .6,
		winW = $("#container").width(),
		winH = $('#svgcon').offset().top,
		i, x, y, w, h, minX, maxX, minY, maxY, problem;

    //log('winW: '+winW+' winH: '+winH);

	for (i=0; i < zooms.length; i++) {

		problem = false; // no problem at start

		// loop over each image, checking that they (enough) onscreen
		$('.item img').each(function(i, img) {

            $img = $(this);
			x = $img.offset().left,
			y = $img.offset().top,
			scale = zooms[zoomIdx] / 100,
			sz = realSize($img),      // original size
			w = sz.w * scale,        // scaled width
			h = sz.h * scale,        // scaled height
			minX = (-w * (1 - percentVisible)),
			maxX = (winW - (w * percentVisible)),
			minY = (-h * (1 - percentVisible)),
			maxY = (winH - (h * percentVisible));

			//log(i+")",x,y,w,h);
			// COMPARE-TO (console): $('.item img').each(function(i, img) { log( i+") "+Math.round($(this).offset().left)) });

			if (x < minX || x > maxX || y < minY || y > maxY) {

				zoomOut();
				//log('Ad('+$img.attr('id')+') offscreen, zoom='+zoomStyle);
				return (problem = true); // break jquery each() loop
			}
		});

		if (!problem) return;	// all ads ok, we're done
	}
}

function openInNewTab(url) {

  var win = window.open(url, '_blank');
  win.focus();
}

function asAdArray(adGroups) {
    var ads = [];
    for (var i=0, j = adGroups.length; i<j; i++) {
        for (var k=0, m = adGroups[i].children.length; k<m; k++) 
            ads.push(adGroups[i].children[k]);
    }
    return ads;
}

function addInterfaceHandlers(ads) {

    $('#x-close-button').click(function(e) {

        self.port && self.port.emit("close-vault");
    });

    $('#logo').click(function(e) {

        openInNewTab('http://dhowe.github.io/AdNauseam/');
    });

    $(document).click(function(e) {
        
        if ($('#container').hasClass('lightbox'))
            lightboxMode(false);
    });

	/////////// DRAG-STAGE (from: http://jsfiddle.net/robertc/kKuqH/)

	var dm = document.querySelector('#container');
	dm.addEventListener('dragstart', dragStart, false);
	dm.addEventListener('dragover', drag, false);
	dm.addEventListener('dragend', dragEnd, false);

	/////////// ZOOM-STAGE

	// click zoom-in
	$('#z-in').click(function(e) {

		zoomIn();
		e.preventDefault();
	});

	// click zoom-out
	$('#z-out').click(function(e) {

		zoomOut();
        e.preventDefault();
	});

    $(window).resize(resizeHistorySlider);

    /*$(window).resize(function() {

        if ( typeof resizeTimer == 'undefined')
            var resizeTimer = 0;

        clearTimeout(resizeTimer);

        resizeTimer = setTimeout(function() {

            $('#left').width(''); // hack so that a panel-drag doesnt
            $('#right').width(''); //  break window-resizing

            resizeHistorySlider();

        }, 500); // not sure if we need this delay
    });*/
}
