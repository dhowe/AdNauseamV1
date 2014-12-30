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
    -- check version in menu
    DONE
    -- check broken image handling in menu
*/         
function layoutAds(addonData) {

    adGroups = createAdGroups(addonData.data);

    log('Vault.layoutAds: '+adGroups.length);

    addInterfaceHandlers();
    
    createSlider(asAdArray(adGroups));

    doLayout(adGroups, true);

    tagCurrentAd(addonData.currentAd);    
}


// CHANGED(12/19): Each ad is now visited separately
function updateAds(addonData) {
    
    adGroups = createAdGroups(addonData.data);
    
    log('Vault.updateAds: '+adGroups.length);
    
    // update class/title/visited/resolved-url
    doUpdate(addonData.update);

    tagCurrentAd(addonData.currentAd);

    computeStats(adGroups);
}

function createDivs(adgroups) {
    
    for (i=0; i < adgroups.length; i++) {

        var $div = $('<div/>', {
            
            class: 'item dup-count-'+adgroups[i].count(),
            'data-gid': adgroups[i].gid,
            
        }).appendTo('#container');

        layoutAd($div, adgroups[i]);
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

function doUpdate(updated) {

    //console.log('doUpdate: #'+updated.id);
    var groupInfo = findByAdId(updated.id), 
        $item = findItemByGid(groupInfo.group.gid);
        adgr = groupInfo.group,
    
    console.log("gid: "+adgr.gid, "ad-idx: "+groupInfo.index, '$item: '+typeof $item);
    
    // update the adgroup
    adgr.index = groupInfo.index;
    bulletIndex($item, adgr);
    return;
    
    // now update the ad

    // update the title
    $item.attr('data-title', updated.title);

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
    
    // update the group state
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

function bulletIndex($div, adgr) {
    
    //console.log('bulletIndex: '+adgr.index);
    
    // set the active bullet
    
    var items = $div.find('.bullet');
    $(items[adgr.index]).addClass('active')
        .siblings().removeClass('active');
    
    // shift the meta-list to show correct info
    
    var $ul = $div.find('.meta-list');
    $ul.css('margin-top', (adgr.index * -110) +'px');
    
    // update the counter bubble
    $div.find('#index-counter').text(indexCounterText(adgr)); 
    
    // add the state-class to the div
    states.map(function(d) { $div.removeClass(d) } ); // remove-all
    $div.addClass(adgr.state());
    
    // tell the addon 
    self.port && self.port.emit("update-inspector", { "id": adgr.id() } );
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
            "this.alt='unable to load image'; this.src='img/placeholder.svg'",
        
    }).appendTo($ad);
}

function appendTextDisplayTo($pdiv, adgr) {

    var total = adgr.count(), visited = adgr.visitedCount(), ad = adgr.child(0);

    $pdiv.addClass('item-text');
    
    var $div = $('<div/>', { 
        
        class: 'item-text-div', 
        width: rand(TEXT_MINW, TEXT_MAXW) 
        
    }).appendTo($pdiv);

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
    
    $('<div/>', { // title
        
        class: 'title',
        text: ad.title,
        target: 'new'
        
    }).appendTo($h3);
    
    $('<cite/>', { text: ad.contentData.site }).appendTo($div); // site
    
    $('<div/>', { // text
        
        class: 'ads-creative',
        text: ad.contentData.text
        
    }).appendTo($div);
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
    
function doLayout(adgroups, resetLayout) {

    //console.log('Vault.doLayout: '+adgroups.length);

    if (!adgroups) throw Error("No ads!");

    createDivs(adgroups);

    computeStats(adgroups);

    enableLightbox();

    repack(resetLayout);
    
    //dbugOffsets && addTestDivs();
}

function repack(resetLayout) {

	var $items =  $(".item"), visible = $items.length;

	//log("Vault.repack() :: "+visible);

    showAlert(visible ? false : 'no ads found');

	if (visible > 1) { // count non-hidden ads

        $('#container').imagesLoaded( function() {
            
			new Packery('#container', {
				centered : { y : 5000 }, // centered half min-height
				itemSelector : '.item',
				gutter : 1
			});

            storeInitialLayout($items);
            
			if (resetLayout) positionAds();
			
			log('------------------------------------------------');
        });
	}
	else if (visible === 1) {

		// center single ad here (no pack)
		var $item = $('.item');

        if (!$item.width()) // remove
            console.warn("No width for image! "+sz.w);

		$(".item").css({ 
		    top: (5000 - $item.height()/2) + 'px', 
		    left: (5000 - $item.width()/2) + 'px' 
        } ); 
	}
}

function computeStats(adgroups) {

    $('.since').text(sinceTime(adgroups));
    $('.clicked').text(numVisited(adgroups) + ' ads clicked');
    $('.detected').text(numFound(adgroups)+ ' detected.');
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
	
	return formatDate(oldest);
}

function dragStart(e) {
 
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
        
        var inspectedGid = parseInt($selected.attr('data-gid'));
        selectedGroup = findGroupByGid(inspectedGid);
        
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

function findByAdId(id) {

    log('findByAdId: '+id);

    for (var i = 0, j = adGroups.length; i < j; i++) {

        var childIdx = adGroups[i].findChildById(id);
        
        if (childIdx > -1) return {
            ad : adGroups[i].child(childIdx),
            group : adGroups[i],
            index : childIdx
        };
    }

    throw Error('No ad for id: ' + id);
}

function findItemByGid(gid) {
    
    
    var items = $('item');
    for (var i=0; i < items.length; i++) {
        
      // WORKING HERE ***
      $item = $(items[i]);
      if (parseInt($item.attr('data-.gid')) === gid)
        return $item;
    }
    
    throw Error('No $item for gid: '+gid);
}

function findGroupByGid(gid) {
    
    for (var i=0, j = adGroups.length; i<j; i++) {
        
      if (adGroups[i].gid === gid)
        return adGroups[i];
    }
    
    throw Error('No group for gid: '+gid);
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

	var percentVisible = .6,
		winW = $("#container").width(),
		winH = $('#svgcon').offset().top,
		i, x, y, w, h, minX, maxX, minY, maxY, problem;

    //log('winW: '+winW+' winH: '+winH);

	for (i=0; i < zooms.length; i++) {

		problem = false; // no problem at start

		// loop over each image, checking that they (enough) onscreen
		$('.item').each(function(i, img) {

            $this = $(this);

			scale = zooms[zoomIdx] / 100, 
            x = $this.offset().left, 
            y = $this.offset().top,
			w = $this.width() * scale,    // scaled width
			h = $this.height() * scale,   // scaled height
			
			minX = (-w * (1 - percentVisible)),
			maxX = (winW - (w * percentVisible)),
			minY = (-h * (1 - percentVisible)),
			maxY = (winH - (h * percentVisible));


			//log(i+")",x,y,w,h);
			// COMPARE-TO (console): $('.item img').each(function(i, img) { log( i
			    //+") "+Math.round($(this).offset().left)) });

			if (x < minX || x > maxX || y < minY || y > maxY) {

				zoomOut();
				log('Ad('+$this.attr('data-gid')+') offscreen, zoom='+zoomStyle);
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

function asAdArray(adgroups) {
    
    var ads = [];
    for (var i=0, j = adgroups.length; i<j; i++) {
        for (var k=0, m = adgroups[i].children.length; k<m; k++) 
            ads.push(adgroups[i].children[k]);
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

	/////////// DRAG-STAGE ///////////
	// (from: http://jsfiddle.net/robertc/kKuqH/)

	var dm = document.querySelector('#container');
	dm.addEventListener('dragstart', dragStart, false);
	dm.addEventListener('dragover', drag, false);
	dm.addEventListener('dragend', dragEnd, false);

	/////////// ZOOM-STAGE ///////////

	$('#z-in').click(function(e) {

		zoomIn();
		e.preventDefault();
	});

	$('#z-out').click(function(e) {

		zoomOut();
        e.preventDefault();
	});

    $(window).resize(resizeHistorySlider);
}
