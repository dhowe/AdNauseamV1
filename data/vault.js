//inspectorData, inspectorIdx, animatorId, resizing = false, , animateMs = 2000, container, pack;
var viewState = { zoomIdx: 0, left: '-5000px', top: '-5000px' }, 
    zoomStyle, zoomIdx = 0, zooms = [ 100, 50, 25, 12.5, 6.25 ],
    animatorId, animateMs = 2000, selectedAdSet, adSets,
    states = ['pending', 'visited', 'failed' ]; 

/* NEXT: 
    -- VAULT: wide-ads not centering properly
    -- MENU: ads not filtering by page!
    -- MENU: image-ads not refreshing on failure
    -- MENU: check broken image handling
    -- MUSHON: Version in menu
    -- ZOOM: position-ad must consider slider
        
    -- CURRENT-AD (disabled for now)
        test current-ad handling (broken in shared.js)
*/         

self.port && self.port.on('layout-ads', layoutAds); // refresh all
self.port && self.port.on('update-ad', updateAd); // update some

function layoutAds(json) {
    
    var adArray = json.data;

    adSets = createAdSets(adArray); 
    
    log('Vault.layoutAds: '+adSets.length);

    addInterfaceHandlers();
    
    createSlider(adArray);

    doLayout(adSets, true);

    //tagCurrentAd(addonData.currentAd);
    
    log('Vault.layoutAds DONE');
}


// CHANGED(12/19): Each ad is now visited separately
function updateAd(json) {

    log('Vault.updateAds() :: '+json.update.id);
//     
    // if (json.update.id !== 14) {
        // log('Vault.updateAds() :: ignoring #'+json.update.id);
        // return;
    // }

    // update class/title/visited/resolved-url
    doUpdate(json.update);

    //tagCurrentAd(addonData.currentAd);
    
    computeStats(adSets);
}

function doLayout(adsets, resetLayout) {

    log('Vault.doLayout: '+adsets.length);

    if (!adsets) throw Error("No ads!");
    
    $('.item').remove();

    createDivs(adsets);

    computeStats(adsets);

    enableLightbox();

    repack(resetLayout);
    
    //dbugOffsets && addTestDivs();
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

    log('doUpdate: #'+updated.id);
    
    var groupInfo = findByAdId(updated.id),
        $item = findItemByGid(groupInfo.group.gid),
        adset = groupInfo.group, itemClass;

    //log('doUpdate: '+groupInfo.group.gid+"/idx="+groupInfo.index);

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

    log('doUpdate: #'+updated.id+".setItemClass(pre)");
    setItemClass($item, adset.groupState());
    
    log('doUpdate: #'+updated.id+".bulletIndex(pre)");
    (adset.count() > 1) && bulletIndex($item, adset);    
}

function setItemClass($item, state) {
    
    //log('setItemClass:'+$item[0].classList+"->"+state);

    states.map(function(d) { $item.removeClass(d) } ); // remove-all
    $item.addClass(state);
    
    //log('\t\t'+$item[0].classList);
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
    
    $('<a/>', { class: 'inspected-title',
     
                href: ad.pageUrl,
                text: ad.pageTitle
                
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
        text: ad.title
                
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

        //log('\t\t TMP-SET GROUP: '+state);
        
        // (temporarily) add the state-class to the div
        setItemClass($div, state);
        
        // tell the addon 
        //self.port && self.port.emit("update-inspector", { "id": adset.id() } );
    }
    
    //log('\t\t CLASSES: '+($bullet[0] ? $bullet[0].classList : 'NO CLASS LIST'));
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
        
        onerror: "this.onerror=null; this.width=200; this.height=100; " +
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

function centerSingle($item) {
    
  
    
    //$('#svgcon').hide();
}
        
function repack(resetLayout) {

    //log("Vault.repack() :: "+visible);
    
	var $items =  $(".item"), visible = $items.length;

    showAlert(visible ? false : 'no ads found');

    $('#container').imagesLoaded(function() {
         
    	if (visible > 1) {

log("PACKING ***");

    		new Packery('#container', {
    		    
    			centered : { y : 5000 }, // centered half min-height
    			itemSelector : '.item',
    			gutter : 1
    		});
            
            if (resetLayout) positionAds();
    		
    		log('------------------------------------------------');
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

	//dbugOffsets && updateTestDivs();
}

function dragEnd(e) {
 
    $('#container').removeClass('dragged');
}

function formatDate(ts) {

	if (!ts) return 'pending';

	if (ts < 0)  return 'Unable to Visit';

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
       
        //log('item.clicked');
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
    
    //log('lightboxMode: '+selected);
    
    var dm = document.querySelector('#container');
    
    if ($ele) { // save zoom-state
        
        viewState.zoomIdx = zoomIdx; 
        viewState.left = dm.style.marginLeft;
        viewState.top = dm.style.marginTop;
          
        setZoom(zoomIdx = 0);
        
        var offx = parseInt($ele.attr('data-offx')), offy = parseInt($ele.attr('data-offy'));
        dm.style.marginLeft = (-5000 + offx)+'px'; // TODO: also needs offset from collage center 
        dm.style.marginTop = (-5000 + offy)+'px'; // TODO: also needs offset from collage center
        
        log("click: ",dm.style.marginLeft,dm.style.marginTop,offx,offy);
    }       
    else { // restore zoom-state
        
        setZoom(zoomIdx = viewState.zoomIdx); 
        
        dm.style.marginLeft = viewState.left;
        dm.style.marginTop = viewState.top;
    }
}

function lightboxMode(selected) {
    
    //log('lightboxMode: '+selected);
    
    if (selected) var $selected = $(selected);

    if ($selected && !$selected.hasClass('inspected')) {

        var inspectedGid = parseInt($selected.attr('data-gid'));
        selectedAdSet = findGroupByGid(inspectedGid);

        $selected.addClass('inspected').siblings().removeClass('inspected');
        
        if ($selected.find('.bullet').length > 1) {
            
            $selected.find('span.counter-index').show();
            bulletIndex($selected, selectedAdSet);
        }
        
        animateInspector($selected);
        centerZoom($selected);
        
        $('#container').addClass('lightbox');
    }
    else if ($('#container').hasClass('lightbox')) {
        
        var $item = $('.item');
        
        // reset the class to the group class        
        if ($item.hasClass('inspected')) {//TODO: this seems to be failing (see #1 above)
            
            //log('lightboxMode: SET-FINAL-STATE: '+ selectedAdSet.groupState());
            //log('\t\t LM-CLASSES: '+($item ? $item[0].classList : 'NO CLASS LIST'));
            setItemClass($item, selectedAdSet.groupState());
        }
           
        $item.removeClass('inspected');
        $item.find('span.counter-index').hide(); 
        
        $selected = null;
        selectedAdSet = null;
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

	//dbugOffsets && updateTestDivs();
}

function positionAds() { // autozoom & center (ugly)

    return; // log('positionAds');

	var percentVisible = .6,
		winW = $("#container").width(),
		winH = $('#svgcon').offset().top,
		i, x, y, w, h, minX, maxX, minY, maxY, problem;

    //log('winW: '+winW+' winH: '+winH);
    setZoom(zoomIdx = 0);

	for (i=0; i < zooms.length; i++) {

		problem = false; // no problem at start
        
        setZoom(zoomIdx = i);
        scale = zooms[zoomIdx] / 100;
        log('Trying '+zooms[i]+' scale='+scale);
        
		// loop over each image, checking that they (enough) onscreen
		$('.item').each(function(i, img) {

            $this = $(this);

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
				log('Ad('+$this.attr('data-gid')+') offscreen, zoom='+zoomStyle+" BREAK!!!");
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
