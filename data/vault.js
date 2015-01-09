//inspectorData, inspectorIdx, animatorId, resizing = false, , animateMs = 2000, container, pack;
var viewState = { zoomIdx: 0, left: '-5000px', top: '-5000px' }, 
    zoomStyle, zoomIdx = 0, zooms = [ 100, 50, 25, 12.5, 6.25 ],
    animatorId, animateMs = 2000, selectedAdSet, adSets,
    states = ['pending', 'visited', 'failed' ]; 

/* NEXT:     

    -- BUG: Arbitrary page switch to vault (see Vaultman)
    
    -- NEW-PAGE HASH (use for menu-list and ad-pageTitle), then store array (or set?) of all ads;
       before moving from page-hash to ad-array, make sure it doesnt exist

    -- CURRENT-AD (disabled for now)
        test current-ad handling (broken in shared.js)        
*/         

self.port && self.port.on('layout-ads', layoutAds); // refresh all
self.port && self.port.on('update-ad', updateAd); // update some

function layoutAds(json) {
    
    var adArray = json.data;

    adSets = createAdSets(adArray); 
    
    //log('Vault.layoutAds: '+adSets.length);

    addInterfaceHandlers();
    
    createSlider(adArray);

    doLayout(adSets, true);

    //tagCurrentAd(addonData.currentAd);    
}

function updateAd(json) {

    //log('Vault.updateAds() :: '+json.update.id);

    // update class/title/visited/resolved-url
    doUpdate(json.update);

    //tagCurrentAd(addonData.currentAd);
    
    computeStats(adSets);
}

function doLayout(adsets, resetLayout) {

    //log('Vault.doLayout: '+adsets.length);

    if (!adsets) throw Error("No ads!");
    
    $('.item').remove();

    createDivs(adsets);

    computeStats(adsets);

    enableLightbox();

    repack(resetLayout);    
}

function createDivs(adsets) {
    
    for (i=0; i < adsets.length; i++) {

        var $div = $('<div/>', {
            
            class: 'item dup-count-'+adsets[i].count(),
            'data-gid': adsets[i].gid,
            
        }).appendTo('#container');

        layoutAd($div, adsets[i]);
    }
}

function layoutAd($div, adset) {
       
    // append the display
    (adset.child(0).contentType === 'text' ? 
        appendTextDisplayTo : appendDisplayTo)($div, adset);   

    appendBulletsTo($div, adset);
    appendMetaTo($div, adset);
  
    var state = adset.groupState();
    //log('setGroupState: '+$div.length,state);
    setItemClass($div, state);
}

function doUpdate(updated) {

    //log('doUpdate: #'+updated.id);
    
    var groupInfo = findByAdId(updated.id),
        $item = findItemByGid(groupInfo.group.gid),
        adset = groupInfo.group, itemClass;

    // update the adgroup
    adset.index = groupInfo.index;
    adset.children[adset.index] = updated;
    
    // update the ad data
    updateMetaTarget($item.find('.target[data-idx='+adset.index+']'), updated);
    
    // update the class (just-visited)
    itemClass = updated.visitedTs > 0 ? 'just-visited' : 'just-failed';
    $item.addClass(itemClass).siblings()
        .removeClass('just-visited')
        .removeClass('just-failed');

    setItemClass($item, adset.groupState());
    
    (adset.count() > 1) && bulletIndex($item, adset);    
}

function setItemClass($item, state) {

    states.map(function(d) { $item.removeClass(d) } ); // remove-all
    $item.addClass(state);    
}

function appendMetaTo($div, adset) {

    var $meta = $('<div/>', { class: 'meta' }).appendTo($div);
    
    var $ul = $('<ul/>', {  
        
        class: 'meta-list', 
        style: 'margin-top: 0px'
        
    }).appendTo($meta);
    
    for (var i=0; i < adset.count(); i++) {
        
        var ad = adset.child(i);
        
        var $li = $('<li/>', { 
                
            'style': 'margin-top: 0px', 
            
        }).appendTo($ul);
        
        var $target = $('<div/>', { 
            
            class: 'target', 
            'data-idx': i 
            
        }).appendTo($li);
        
        appendTargetTo($target, ad);
                            
        var $detected = $('<div/>', { class: 'detected-on' }).appendTo($li);
        appendDetectedTo($detected, ad);            
    }
}

function appendDetectedTo($detected, ad) {
    
    $('<h3/>', { text: 'detected on:' }).appendTo($detected);
    
    $('<a/>', { 
                class: 'inspected-title',
                href: ad.pageUrl,
                text: ad.pageTitle,
                target: 'new'
                
    }).appendTo($detected); 
    
    $('<cite/>', { text: ad.pageUrl }).appendTo($detected);
    
    $('<span/>', { 
        
        class: 'inspected-date', 
        text: formatDate(ad.foundTs)
         
    }).appendTo($detected);  
}

function appendTargetTo($target, ad) {

    $('<h3/>', { text: 'target:' }).appendTo($target);
    
    $('<a/>', { 
        
        id: 'target-title',
        class: 'inspected-title', 
        href: ad.targetUrl,
        text: ad.title,
        target: 'new'
                
    }).appendTo($target);
    
    $('<cite/>', { 
        
        id: 'target-domain',
        class: 'target-cite', 
        text: targetDomain(ad) 
        
    }).appendTo($target);
    
    $('<span/>', { 
        
        id: 'target-date',
        class: 'inspected-date', 
        text: formatDate(ad.visitedTs) 
        
    }).appendTo($target); 
}

function updateMetaTarget($target, ad) {

    //log("*** updateMetaTarget:"+$target.length);
      
    $target.find('#target-domain').text(targetDomain(ad));
    $target.find('#target-date').text(formatDate(ad.visitedTs));
    $titleA = $target.find('#target-title').text(ad.title);
    if (ad.resolvedTargetUrl)
        $titleA.attr('href', ad.resolvedTargetUrl);
}

/**
 * Resets current bullet class to [active,ad.state]
 * Shifts meta list to show correct item
 * Updates index-counter for the bullter 
 */
function bulletIndex($div, adset) { // adset.index must be updated first!
    
    var $bullet = $div.find('.bullet[data-idx='+(adset.index)+']'),
        state = adset.state(), $ul;
    
    //log('bulletIndex: '+adset.gid+" children["+adset.index+"]="+adset.child().id+"-> "+ adset.state());
    
    // set the state for the bullet 
    setItemClass($bullet, state);

    // set the active class for bullet
    $bullet.addClass('active')
        .siblings().removeClass('active');
    
    // shift the meta-list to show correct info
    $ul = $div.find('.meta-list');
    $ul.css('margin-top', (adset.index * -110) +'px');
    
    // update the counter bubble
    $div.find('#index-counter').text(indexCounterText(adset)); 

    if ($div.hasClass('inspected')) {

        // (temporarily) add the state-class to the div
        setItemClass($div, state);
        
        // tell the addon 
        self.port && self.port.emit("item-inspected", { "id": adset.child().id } );
    }    
}

function appendDisplayTo($div, adset) {

    var $ad = $('<div/>', { class: 'ad' }).appendTo($div);
    var total = adset.count(), visited = adset.visitedCount();
    
    var $span = $('<span/>', {
        
        class: 'counter',
        text: total
        
    }).appendTo($ad);
    
    var $cv = $('<span/>', {
        
        id : 'index-counter',
        class: 'counter counter-index',
        text:  indexCounterText(adset)
        
    }).appendTo($ad).hide();
    
    var img = $('<img/>', {

        src: adset.child(0).contentData.src,

        onerror: "this.onerror=null; this.width=80; this.height=40; " +
            "this.alt='unable to load image'; this.src='img/placeholder.svg'",
        
    }).appendTo($ad);
}

function appendTextDisplayTo($pdiv, adset) {

    var total = adset.count(), visited = adset.visitedCount(), ad = adset.child(0);

    $pdiv.addClass('item-text');
    
    var $div = $('<div/>', { 
        
        class: 'item-text-div', 
        width: rand(TEXT_MINW, TEXT_MAXW) 
        
    }).appendTo($pdiv);

    var $span = $('<span/>', {
        
        class: 'counter',
        text: adset.count()
        
    }).appendTo($div);
    
    var $cv = $('<span/>', {
        
        id : 'index-counter',
        class: 'counter counter-index',
        text: indexCounterText(adset)
        
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

function indexCounterText(adset) {
    
    return (adset.index+1)+'/'+adset.count();
}

function appendBulletsTo($div, adset) {
    
    var count = adset.count();
    
    if (count > 1) {
        
        var $bullets = $('<div/>', { class: 'bullets'  }).appendTo($div);
        var $ul = $('<ul/>', {}).appendTo($bullets);
    
        // add items based on count/state
        for (var i=0; i < adset.count(); i++) {
            
            var $li = $('<li/>', {
                 
                'data-idx': i, 
                'class': 'bullet '+ adset.state(i) 
                
            }).appendTo($ul);
            
            $li.click(function(e) {
                
                e.stopPropagation();
                
                adset.index = parseInt( $(this).attr('data-idx') );
                
                bulletIndex($div, adset);
            });
        }
    }    
}

function repack(resetLayout) {

    //log("Vault.repack() :: "+visible);
    
	var $items =  $(".item"), visible = $items.length;

    showAlert(visible ? false : 'no ads found');

    $('#container').imagesLoaded(function() {

    	if (visible > 1) {

    		new Packery('#container', {
    		    
    			centered : { y : 5000 }, // centered half min-height
    			itemSelector : '.item',
    			gutter : 1
    		});
            
            if (resetLayout) positionAds();    		
    	}
        else if (visible == 1)  $items.css({ // center single
            
            top : (5000 - $items.height() / 2) + 'px',
            left : (5000 - $items.width() / 2) + 'px'
        });
        
        storeInitialLayout($items);
    });
}

function computeStats(adsets) {

    $('.since').text(sinceTime(adsets));
    $('.clicked').text(numVisited(adsets) + ' ads clicked');
    $('.detected').text(numFound(adsets)+ ' detected');
}

function numVisited(adsets) {

	var numv = 0;
	for (var i=0, j = adsets.length; i<j; i++)
		numv += (adsets[i].visitedCount());
	return numv;
}

function numFound(adsets) {

    var numv = 0;
    for (var i=0, j = adsets.length; i<j; i++) {

        numv += (adsets[i].count());
    }
    return numv;
}

function sinceTime(adsets) {

	var oldest = +new Date(), idx = 0;
	for (var i=0, j = adsets.length; i<j; i++) {
 
        var foundTs = adsets[i].child(0).foundTs;  
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

function dragOver(e) {

	var offset = e.dataTransfer.getData("text/plain").split(','),
        dm = document.querySelector('#container');

    dm.style.marginLeft = (e.clientX + parseInt(offset[0], 10)) + 'px';
    dm.style.marginTop = (e.clientY + parseInt(offset[1], 10)) + 'px';
}

function dragEnd(e) {
 
    $('#container').removeClass('dragged');
}

function formatDate(ts) {

	if (!ts) return 'Not Yet Visited';

	if (ts < 0)  return 'Unable To Visit';

	var date = new Date(ts), days = ["Sunday", "Monday",
		  "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        months = ["January", "February", "March", "April", "May",
    		"June", "July", "August", "September", "October",
    		"November", "December"];

	var pad = function(str) {

		var s = String(str);
		return (s.length < 2) ? "0" + s : s;
	}

	var meridian = (parseInt(date.getHours() / 12) == 1) ? 'PM' : 'AM';
	var hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();

	return days[date.getDay()] + ', ' + months[date.getMonth()] + ' ' + date.getDate()
		+ ' ' + date.getFullYear() + ' ' + hours + ':' + pad(date.getMinutes())
		+ meridian.toLowerCase();
}

// TODO: This should only reset the x-axis/scale, not recreate everything?
function resizeHistorySlider() {

    //log('resizeHistorySlider()');
    
	createSlider(all);
}

function enableLightbox() {

    $('.item').click(function(e) {
       
        var $this = $(this);
        /*setTimeout(function() {
            
            log('item.clicked: '+$this.html(),
                $this[0].getBoundingClientRect().left,
                $this[0].getBoundingClientRect().top
            );
        },3000);*/
        e.stopPropagation();
        lightboxMode(this);         
    });
}

function LOG_ADSET(pre) {
    
  console.log(pre+".ACTUAL-SET: "+adSets[0].ts
    +" index: "+adSets[0].index
    +" ad-id: "+adSets[0].child().id
    +" groupState: "+adSets[0].groupState()
    +" visitedTs: "+adSets[0].child().visitedTs);
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
    
    if ($ele) {
        
        // take into account height of meta-data
        var ew= $ele.width(), eh = $ele.find("img").height() + 110;
        
        // save the state for after (TODO: See #191, this needs to happen in the pack)
        viewState.zoomIdx = zoomIdx; 
        viewState.left = dm.style.marginLeft;
        viewState.top = dm.style.marginTop;
        
        // compute target positions for transform
        var offx = parseInt($ele.attr('data-offx'));
        var offy = parseInt($ele.attr('data-offy')) - 55; // .5 * meta-data
        var mleft = (-5000 + offx), mtop = (-5000 + offy);
        
        // make sure left/bottom corner of meta-data is onscreen (fix to #180)
        if (ew > $(window).width()) 
            mleft += (ew - $(window).width()) / 2;
        if (eh > $(window).height())
            mtop -= (eh - $(window).height()) / 2;
        
        // reset zoom to 100%
        setZoom(zoomIdx = 0);       
        
        // translate to center
        dm.style.marginLeft = mleft+'px';  
        dm.style.marginTop = mtop+'px';
    }       
    else { // restore zoom-state

        setZoom(zoomIdx = viewState.zoomIdx); 
        
        dm.style.marginLeft = viewState.left;
        dm.style.marginTop = viewState.top;
    }
}

function lightboxMode(selected) {
    
    if (selected) var $selected = $(selected);
    
    if ($selected && !$selected.hasClass('inspected')) {

        var inspectedGid = parseInt($selected.attr('data-gid'));
        selectedAdSet = findGroupByGid(inspectedGid);

        $selected.addClass('inspected').siblings().removeClass('inspected');
        
        if (selectedAdSet.count() > 1) {
            
            $selected.find('span.counter-index').show(); // show index-counter
            bulletIndex($selected, selectedAdSet); 
            
            animateInspector($selected);
        }
        
        centerZoom($selected);
        
        $('#container').addClass('lightbox');
    }
    else if ($('#container').hasClass('lightbox')) {
        
        var $item = $('.item.inspected');
        
        // reset the class to the group class        
        setItemClass($item, selectedAdSet.groupState());
        
        // remove inspected & re-hide index-counter
        $item.removeClass('inspected');
        $item.find('span.counter-index').hide(); 
        
        selectedAdSet = null;
        
        // stop animation and restore view
        animateInspector(false); 
        centerZoom(false);
        
        $('#container').removeClass('lightbox');
    }
}

function animateInspector($inspected) {

    //log('animateInspector: '+$inspected);
    
    animatorId && clearTimeout(animatorId); // stop
    
    // animate if we have a dup-ad being inspected
    if ($inspected && selectedAdSet && selectedAdSet.count() > 1) {

        //log("selectedAdSet.count():" +selectedAdSet.count(), selectedAdSet.groupState());
        
        animatorId = setInterval(function() {

            if (++selectedAdSet.index === selectedAdSet.count())
                selectedAdSet.index = 0;

            bulletIndex($inspected, selectedAdSet);

        }, animateMs);
    }
}

function findByAdId(id) {

    //log('findByAdId: '+id);

    for (var i = 0, j = adSets.length; i < j; i++) {

        var childIdx = adSets[i].findChildById(id);
        
        if (childIdx > -1) return {
            
            ad : adSets[i].child(childIdx),
            group : adSets[i],
            index : childIdx
        };
    }

    console.error('No ad for id: ' + id+' (Ad updated before being added to vault?) REFRESH');
    self.port && self.port.emit("refresh-vault");
}

function findItemByGid(gid) {
    
    var items = $('.item');
    for (var i=0; i < items.length; i++) {
        
      // WORKING HERE ***
      $item = $(items[i]);
      if (parseInt($item.attr('data-gid')) === gid)
        return $item;
    }
    
    throw Error('No $item for gid: '+gid);
}

function findGroupByGid(gid) {
    
    for (var i=0, j = adSets.length; i<j; i++) {
        
        if (adSets[i].gid === gid)
            return adSets[i];
    }
    
    throw Error('No group for gid: '+gid);
}

function attachTests() {

	$.getJSON(TEST_ADS, function(json) {

		console.warn("Vault.js :: Loading test-ads: "+TEST_ADS);
	    layoutAds({ data : toAdArray(json), page : TEST_PAGE }); // currentAd?

	}).fail(function(e) { console.warn( "error:", e); });
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
}

// works for scale=1, needs to take other scales into account
function bounds($items, scale) {
    
    var bounds = {
        
        left: Number.POSITIVE_INFINITY,
        top: Number.POSITIVE_INFINITY,
        right: Number.NEGATIVE_INFINITY,
        bottom: Number.NEGATIVE_INFINITY,
        width: Number.NaN,
        height: Number.NaN
    };

    $items.each(function (i,el) {
        
        var elQ = $(el);
        var off = elQ.offset();
        
        off.right = off.left + $(elQ).width();
        off.bottom = off.top + $(elQ).height();
        
        // C: add code for matrix transform scale
        var cs = this.getComputedStyle(this, null);
        var matrix = cs.getPropertyValue("transform");
    
        if (off.left < bounds.left)
            bounds.left = off.left;

        if (off.top < bounds.top)
            bounds.top = off.top;

        if (off.right > bounds.right)
            bounds.right = off.right;

        if (off.bottom > bounds.bottom)
            bounds.bottom = off.bottom;

    });

    bounds.width = bounds.right - bounds.left;
    bounds.height = bounds.bottom - bounds.top;
    
    return bounds;
}

// Chooses the largest zoom size that fits at least 60% of each ad 
function positionAds() { 
    
    var percentVisible = .6,
        windowW = $("#container").width(),
        windowH = $('#svgcon').offset().top;
        
    //var boundsAll = bounds( $('.item'), zooms[0] );
    // check if they fits at full zoom, 
    // if so return; 
    // if not, then try with next scale
    //var boundsAll = bounds( $('.item'), zooms[1] );
    
} 

// TODO: broken (see issue #59) -- needs to be rewritten
function positionAdsOld() { // autozoom & center 

	var percentVisible = .6,
		winW = $("#container").width(),
		winH = $('#svgcon').offset().top,
		i, x, y, w, h, minX, maxX, minY, maxY, problem;

    //log('winW: '+winW+' winH: '+winH);

	for (i=0; i < zooms.length; i++) {

		problem = false; // no problem at start        
        scale = zooms[i] / 100;
        //log('Trying '+zooms[i]+' scale='+scale);
        
		// loop over each image, checking that they (enough) onscreen
		$('.item').each(function(i, img) {

            $this = $(this);

            x = $this.offset().left * scale,  // wrong***
            y = $this.offset().top * scale,     // wrong***
			w = $this.width() * scale,    // scaled width
			h = $this.height() * scale,   // scaled height
			
			minX = (-w * (1 - percentVisible)),
			maxX = (winW - (w * percentVisible)),
			minY = (-h * (1 - percentVisible)),
			maxY = (winH - (h * percentVisible));

			//log(i+")",x,y,w,h);
			// COMPARE-TO (console): $('.item img').each(function(i, img) { log( i+") "+$(this).offset().left) });

			if (x < minX || x > maxX || y < minY || y > maxY) {

				zoomOut();
				//log('Ad('+$this.attr('data-gid')+') offscreen, zoom='+zoomStyle+" BREAK!!!");
				problem = true;
				return false ; // break each() loop
			}
		});
		
		if (!problem) {
		    //log("Finished.ok!");
		    // all ads ok, we're done
		    setZoom(zoomIdx = i);
		    return;
		}
	}
	
    //at smallest size, done
    //log("Finished.fail!");
    setZoom(zoomIdx = zooms.length-1);
}

function openInNewTab(url) {

  var win = window.open(url, '_blank');
  win.focus();
}

function asAdArray(adsets) {
    
    var ads = [];
    for (var i=0, j = adsets.length; i<j; i++) {
        for (var k=0, m = adsets[i].children.length; k<m; k++) 
            ads.push(adsets[i].children[k]);
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
 
        lightboxMode(false);
    });

	/////////// DRAG-STAGE ///////////
	// (from: http://jsfiddle.net/robertc/kKuqH/)

	var dm = document.querySelector('#container');
	if (dm) {
    	dm.addEventListener('dragstart', dragStart, false);
    	dm.addEventListener('dragover', dragOver, false);
    	dm.addEventListener('dragend', dragEnd, false);    	
	}
	else {
	    log("NO #CONTAINER!");
	}

	/////////// ZOOM-STAGE ///////////

	$('#z-in').click(function(e) {

        e.preventDefault();
		zoomIn();
	});

	$('#z-out').click(function(e) {
	    
	    e.preventDefault();
		zoomOut();
	});

    $(window).resize(resizeHistorySlider);
}
