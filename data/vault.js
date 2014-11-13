var inspectorData, inspectorIdx, animatorId, pack, container, animateMs = 2000;
var zoomStyle, zoomIdx = 0, resizing = false, zooms = [ 100, /*75,*/ 50, 25, 12.5, 6.25 ];
itemClicked = false;

self.port && self.port.on('layout-ads', layoutAds); // refresh all
self.port && self.port.on('update-ads', updateAds); // update some

function layoutAds(addonData) { // NOTE: this can be called multiple times
   
    if (!this.inspectorData)
        this.inspectorData = addonData.inspectorData;
        
	var ads = processAdData(addonData.data).ads;
	
	log('Vault.layoutAds: '+ads.length);
	
	all = ads.slice(); // save original set

	addInterfaceHandlers();

    createSlider(ads);
	
	doLayout(ads, true);
}

function updateAds(addonData) {

    if (!this.inspectorData)
        this.inspectorData = addonData.inspectorData;
    
    //// PROBLEM: NULL IF ITEM IN INSPECTOR ALREADY (need to pass back/forth to addon)
    //console.log("Vault.updateAds***: ", inspectorData); 

    var ads = processAdData(addonData.data).ads, 
       vdate, updates = addonData.updates;           
       
	log('Vault.updateAds(): '+ads.length);

	all = ads.slice(); // save original set
		
	// update class/title/visited/resolved-url
    updates.map(doUpdate);

	computeStats(ads);	
}

function findAdById(id, ads) {
    
    for (i=0, j=ads.length; i< j; i++) {
        
        if (ads[i].id === id)
            return ads[i]
    }
    
    return null;
}

function doUpdate(updated) {
    
    var sel = '#ad' + updated.id;

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
    $(sel).removeClass('pending').addClass((updated.visitedTs > 0) ? 'visited' : 'failed');
    $(sel).removeClass('just-visited').addClass('just-visited');
       
    // Update inspector fields with (title,visitedTs,targetUrl)
    if ($(sel).hasClass('inspectee')) 
        updateInspector(updated, vdate);
}

function updateInspector(updated, vdate) {

    if (inspectorData && inspectorData.length) {
 
        // update the existing inspector object
        for (var i=0, j = inspectorData.length; i<j; i++) {
            
            inspectorData[i].visited = vdate;
            inspectorData[i].title = updated.title;
            if (updated.resolvedTargetUrl)
                inspectorData[i].target =updated.resolvedTargetUrl;
        }

        // update all phases of the animation
        $('.panes > li').each(function() {
                 
            populateInspectorDetails(this, inspectorData[0]);
        });
    }
}

function doLayout(theAds, resetLayout) {

console.log('Vault.doLayout: '+theAds.length);

    if (!theAds) throw Error("No ads!");

    var result = formatDivs(theAds);

    $('#container').html(result);

    computeStats(theAds);

    enableInspector();

    repack(theAds, resetLayout);
    //dbugOffsets && addTestDivs();
}

function computeStats(theAds) {

	$('#stats').html(formatStats(theAds));
}

function repack(theAds, resetLayout) {

	log("Vault.repack()");

	var visible =  $(".item").length;
	
    showAlert(visible ? false : 'no ads found');
	
	if (visible > 1) { // count non-hidden ads
	
		setTimeout(function() {

			pack = new Packery(
				'#container', {
					centered : { y : 5000 }, // centered half min-height
					itemSelector : '.item',
					gutter : 1
			});
			
			if (resetLayout) positionAds();
		
		}, 300);		
	}
	else if (visible === 1) {

		// center single ad here (no pack)
		var sz = realSize($('.item img'));
		$(".item").css({ top: '5000px' , left: (5000 - sz.w/2)+'px' } );
	}
}

function formatDivs(ads) {

	//log('formatDivs: '+ads.length);

	var ad, textAds = 0, html = '';

	for (var i=0, j = ads.length; i<j; i++) {

        ad = ads[i];
        
		if (ad.contentType === 'text') {

			textAds++;
		}
		else // assume: contentType === 'img'
		{
			html += '<a id="ad'+ad.id+'" class="item';
			html += ad.hidden ? '-hidden ' : ' '; // hidden via css

			if (ad.visitedTs == 0) html += 'pending ';
			if (ad.visitedTs < 0)  html += 'failed ';
			if (ad.visitedTs > 0)  html += 'visited ';

			// TODO: what if text-ad?

			html += 'dup-count-'+ad.count+'" ';
			html += 'data-title="'+ad.title+'" ';
			html += 'data-foundTs="'+formatDate(ad.foundTs)+'" ';
			html += 'data-visitedTs="'+formatDate(ad.visitedTs)+'" ';
			html += 'data-targetUrl="'+ad.targetUrl+'" ';
			html += 'data-contentData="'+ad.contentData+'" ';
			html += 'data-pageUrl="'+ad.pageUrl+'">';

			if (!ad.hidden)
			{
				html += '<span class="counter">'+ad.count+'</span>';
				//html += '<span class="eye" data-href="'+ad.page+'">go to origin link</span>';
				html += '<img id="img'+ad.id+'" src="' + ad.contentData + '" alt=""';
				html += ' onError="this.onerror=null; this.src=\'img/blank.png\';">';
			}

			html += '</div>\n';
		}

	}

	log("Ignoring "+textAds + ' text-ads');

	return html;
}

function formatStats(ads) {

	return 'Since '+ formatDate(sinceTime(ads)) + ': <strong>' + // yuck, get rid of html here
	ads.length+' ads detected, '+numVisited(ads)+' visited.</strong>';
}

function numVisited(ads) {

	var numv = 0;
	for (var i=0, j = ads.length; i<j; i++) {

		if (ads[i].visitedTs > 0)
			numv++;
	}
	return numv;
}

function sinceTime(ads) {

	var oldest = +new Date(), idx = 0;
	for (var i=0, j = ads.length; i<j; i++) {

		if (ads[i].foundTs < oldest) {
			oldest = ads[i].foundTs;
			idx = i;
		}
	}
	return oldest;
}

function dragStart(event) {

    var style = window.getComputedStyle(document.querySelector('#container'), null);

	/*  CS: get pixel values from margin-left and margin-top instead of left and top */
	var x = parseInt(style.getPropertyValue("margin-left"), 10) - event.clientX;
	var y = parseInt(style.getPropertyValue("margin-top"),  10) - event.clientY;

    event.dataTransfer.setData("text/plain", x + ',' + y);
}

function handleDragStart(e) {
	this.style.opacity = '0.4';  // this / e.target is the source node.
}

function dragOver(event) {	return _drag(event); }
function drop(event) { return _drag(event); }

function _drag(event) {

	var offset = event.dataTransfer.getData("text/plain").split(',');
   	var dm  = document.querySelector('#container');

   	//log("_drag: ", event.clientX, event.clientY, offset);

	/*  CS: get pixel values from margin-left and margin-top instead of left and top */
    dm.style.marginLeft = (event.clientX + parseInt(offset[0], 10)) + 'px';
    dm.style.marginTop = (event.clientY + parseInt(offset[1], 10)) + 'px';

	//dbugOffsets && updateTestDivs();

    event.preventDefault();

    return false;
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

	return days[date.getDay()] + ' ' + months[date.getMonth()] + ' ' + date.getDate()
		+ ' ' + date.getFullYear() + ' ' + hours + ':' + pad(date.getMinutes())
		+ meridian.toLowerCase();
}

// TODO: This should only reset the x-axis/scale, not recreate everything
function resizeHistorySlider() {

	createSlider(all); // is this ok, or need a copy? 
}

function enableInspector() {

	$('.item').mouseenter(function() { 
	    
	    // populate the inspector & animate if dups
        if (!$('#container').hasClass('lightbox-view')) 
        {
	       setInspectorFields(this);
        }
    });
    
    $('.item').click(function(e) { 
        
        e.preventDefault();
        
        setInspectorFields(this);
        
        $(this).addClass('lightbox-selected')
            .siblings().removeClass('lightbox-selected');
            
        $('#container').toggleClass('lightbox-view');
        
        //console.log( 'lightbox: '+$('#container').hasClass('lightbox-view') ); 
        
        itemClicked = true; 
    });

	$('.item').mouseleave(function() {
	    
        if (!$('#container').hasClass('lightbox-view')) 
        {
		  // kill any remaining dup animations
		  clearInspector();
        }
	});
}

function clearInspector() {
    
    animatorId && clearTimeout(animatorId);
}

function setInspectorFields(ele) {
       
    // don't reset animatation of the same ad
    if (!$(ele).hasClass('inspectee')) {

        // remember this as last in the inspector
        $(ele).addClass('inspectee').siblings()
            .removeClass('inspectee');

        // load primary ad & all dups for inspector
        inspectorData = loadInspectorData(ele);
        
        notifyAddon(inspectorData);
        
        // fill fields for first empty pane & set class to 'full'
        populateInspector(inspectorData, inspectorIdx=0);

        // make/layout controls for duplicates
        makeDuplicateControls(inspectorData);

        doAnimation(inspectorData);
    }

//console.log("setInspectorFields(): "+inspectorData.length);

    if (inspectorData.length>1)  // but cycle either way
         cycleThroughDuplicates();         
}

function notifyAddon(idata) {
    
    if ( typeof notifyTimer == 'undefined')
        var notifyTimer = 0;
        
    clearTimeout(notifyTimer);
    
    notifyTimer = setTimeout(function() {

        self.port.emit("update-inspector", idata);
        
    }, 200); // not sure if we need this delay
}

function loadInspectorData(ele) {

	var data = [ createInspectorObj(ele) ];
	return findDuplicates(data); // returns data
}

function createInspectorObj(item) {

	return {

		imgsrc : $('img', item).attr('src'),
		imgalt : $('img', item).attr('alt'),
		title: $(item).attr('data-title'),
		target : $(item).attr('data-targetUrl'),
		origin : $(item).attr('data-pageUrl'),
		visited : $(item).attr('data-visitedTs'),
		detected : $(item).attr('data-foundTs'),
		content: $(item).attr('data-contentData')
	}
}

function findDuplicates(insDataArr) { // contains template at index=0

	$(".item-hidden").each(function(i) {

		var next, url = $(this).attr('data-contentData');
		
		//console.log(url+' ?= '+insDataArr[0].imgsrc);
		
		if (url === insDataArr[0].content) { // same ad-image?

			next = createInspectorObj(this);
			insDataArr.push(next);
		}
	});

	return insDataArr;
}

function makeDuplicateControls(data) {

	// reset the controls (small dots below img)
	$(".controls" ).empty();
	
	for (var i=0; i < data.length; i++) {

		var li = '<li data-idx="'+i+'" class=';
		li += (i == 0)  ? 'active' : 'passive';
		$('.controls').append(li+'><a href="#"'+
			 ' class="btn circle"></a></li>');
	}
}

/* Swap-panes
 * ----------
 * out   ->  empty
 * in    ->  out
 * ready ->  in
 */
function doAnimation(data) {

	// move pane 'out' to 'empty', move 'in' to 'out'
	$('.panes>li').each(function(i) {

		$( this ).removeClass('out').addClass('empty');
		if ($( this ).hasClass('in')) {
		    
			$( this ).removeClass().addClass('out');
		}
		else { // hack to get correct img in place for dups

			$('img', $( this )).attr('src', data[0].imgsrc);
			$('img', $( this )).attr('alt',  data[0].imgalt);
		}
	});

	// set current pane (class='ready') to 'in'
	$('.ready').removeClass().addClass('in');
}

function cycleThroughDuplicates() {

	//log('cycleThroughDuplicates()');
	animatorId && clearTimeout(animatorId);
	animatorId = setTimeout(inspectorAnimator, animateMs);
}

function inspectorAnimator() {

	if (inspectorData && inspectorData.length>1) { // is it a dup?

		inspectorIdx = ++inspectorIdx >= inspectorData.length ? 0 : inspectorIdx;

		populateInspector(inspectorData, inspectorIdx);

		doAnimation(inspectorData);

		cycleThroughDuplicates(); // next
	}
}

function populateInspector(iData, dupIdx) {

	//log('populateInspector('+dupIdx+') '+new Date().getMilliseconds());

	var ele = $('.empty').first(), insp = iData[dupIdx];

	if (!insp) throw Error('no inspectorData['+dupIdx+']', iData);

    populateInspectorDetails(ele, insp);

	// set the active dot in the dup-control
	$('.controls li:nth-child('+(inspectorIdx+1)+')')
		.addClass('active').siblings().removeClass('active');

	// tell the world we are ready to slide 'in'
	$(ele).removeClass().addClass('ready');
}
    
function populateInspectorDetails(ele, insp) {
    
    // update image-src and image-alt tags
    $(ele).find('img')
        .attr('src', insp.imgsrc)
        .attr('alt',  insp.imgalt);
    
    // update inspector fields  
    $(ele).find('.title').text(insp.title);
    $(ele).find('.target').text(insp.target);
    $(ele).find('.origin').text(insp.origin);
    $(ele).find('.visited').text(insp.visited);
    $(ele).find('.detected').text(insp.detected);
}

function attachTests() {
    
	$.getJSON(TEST_ADS, function(jsonObj) {

		console.warn("Vault.js :: Loading test-ads: "+TEST_ADS);
	    layoutAds({ data : jsonObj, page : TEST_PAGE });

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


function positionAds() { // autozoom & center

	log("Vault.positionAds");

	var percentVisible = .6,
		winH = $('#svgcon').offset().top,
		winW = $(window).width() -  $('#right').width(),
		i, x, y, w, h, minX, maxX, minY, maxY, problem;

	for (i=0; i < zooms.length; i++) {

		problem = false; // no problem at start

		// loop over each image, checking that they (enough) onscreen
		$('.item img').each(function(i, img) {

			x = $(this).offset().left,
			y = $(this).offset().top,
			scale = zooms[zoomIdx] / 100,
			sz = realSize($(this)), // original size
			w = sz.w * scale, // scaled width
			h = sz.h * scale, // scaled height
			minX = (-w * (1 - percentVisible)),
			maxX = (winW - (w * percentVisible)),
			minY = (-h * (1 - percentVisible)),
			maxY = (winH - (h * percentVisible));

			//log(i+")",x,y,w,h);
			// COMPARE-TO (console): $('.item img').each(function(i, img) { log( i+") "+Math.round($(this).offset().left)) });

			if (x < minX || x > maxX || y < minY || y > maxY) {

				zoomOut();
				log('Ad('+$(this).attr('id')+') offscreen, zoom='+zoomStyle);
				return (problem = true); // break jquery each() loop
			}
		});

		if (!problem) return;	// all ads ok, we're done
	}
}

function addInterfaceHandlers(ads) {

	/////////// RESIZE-PANELS

	$('#handle').mousedown(function(e){

        e.preventDefault();
	    resizing = true;
	});

	$(document).mouseup(function(e) {
	    
        e.preventDefault();
    	resizing = false;
	});
	
    $(document).click(function(e) {
        
        e.preventDefault();
        (!itemClicked) && $('#container').removeClass('lightbox-view');
        itemClicked = false;
    });


	/////////// DRAG-STAGE

	document.querySelector('#container').addEventListener('dragstart', dragStart, false);
	document.body.addEventListener('dragover', dragOver, false);
	document.body.addEventListener('drop', drop, false);
	  // from: http://jsfiddle.net/robertc/kKuqH/

	$(document).mousemove(function(e) {

	    if (resizing) {  // constrain drag width here

	    	var w = $('body').width(),
	    		lw = e.pageX = Math.min(Math.max(w*.3, e.pageX), w*.9);

	      	$('#left').width(lw);
	        $('#right').width(w - e.pageX);

	        resizeHistorySlider();
	    }

	    e.preventDefault();
	});


	/////////// ZOOM-STAGE

	// click zoom-in
	$('#z-in').unbind().click(function(e) {

		zoomIn();
		e.preventDefault();
	});

	// click zoom-out
	$('#z-out').unbind().click(function(e) {

		zoomOut();
		e.preventDefault();
	});

    $(window).resize(function() {

        if ( typeof resizeTimer == 'undefined')
            var resizeTimer = 0;
            
        clearTimeout(resizeTimer);
        
        resizeTimer = setTimeout(function() {
            
            $('#left').width(''); // hack so that a panel-drag doesnt 
            $('#right').width(''); //  break window-resizing
            
            resizeHistorySlider();
            
        }, 500); // not sure if we need this delay
    }); 
}
