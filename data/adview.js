/* ISSUES:
 * 	 Show notification in adview if no network
 */
 
 // Another push test from Cyrus

var dbugOffsets = 0;
var inspectorData, inspectorIdx, animatorId, pack, container, animateMs=2000;
var zoomStyle, zoomIdx = 0, resizing = false, zooms = [ 100, /*75,*/ 50, 25, 12.5, 6.25 ];

function makeAdview() { // should happen just once
	
	console.log('makeAdview()'); 
	
	/////////// RESIZE-PANELS

	$('#handle').mousedown(function(e){

	    resizing = true;
	    e.preventDefault();
	});

	$(document).mouseup(function(e) {

    	resizing = false;
    	e.preventDefault();
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
	      	$('#left').css('width', lw);
	        $('#right').css('width', w - e.pageX);
	    }
	    	
	    e.preventDefault(); 
	});
	
	
	var rightPanelWidth = null;  
	
	$('#right').mousedown(function(){
	
		rightPanelWidth = $(this).width();
		console.log("Down: ", $(this).width());
	}); 
	
	$('#right').mouseup(function(){
	
		console.log("Up: ", $(this).width());
		
		if (rightPanelWidth != $(this).width())
		{
			console.log("Right panel width changed!");
			//reloadStylesheets();
			resizeHistorySlider();
		}
		
	}); 
	
	$(window).resize(function() {
	
		console.log('window was resized');
		
		resizeHistorySlider();
	});
	
	function resizeHistorySlider() {
		
		console.log("resizeHistorySlider");
		$("svg").remove();
		$(".tooltip").remove();
		
		var haveOpts = (typeof options !== 'undefined');
		if (!haveOpts)
			console.log("[WARN] No options, using test Ad data!");
					
		historySlider( (haveOpts ? options : test).ads);
	}
	
	function reloadStylesheets() {
		var queryString = '?reload=' + new Date().getTime();
		$('link[rel="stylesheet"]').each(function () {
			this.href = this.href.replace(/\?.*|$/, queryString);
    });
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

	function dragOver(event) { 
		
	
		return _drag(event); 
	}

	function drop(event) { return _drag(event); }

	function _drag(event) {
		
		var offset = event.dataTransfer.getData("text/plain").split(',');
	   	var dm  = document.querySelector('#container');
	   	
	   	//console.log("_drag: ", event.clientX, event.clientY, offset);

		/*  CS: get pixel values from margin-left and margin-top instead of left and top */
	    dm.style.marginLeft = (event.clientX + parseInt(offset[0], 10)) + 'px';
	    dm.style.marginTop = (event.clientY + parseInt(offset[1], 10)) + 'px';
				
		dbugOffsets && updateTestDivs();

	    event.preventDefault();
		
	    return false;
	}

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


	$('#z-clear').unbind().click(function(e) {

		e.preventDefault();
		clearAds();
	});
	
	//////////// HELPER-FUNCTIONS

	function clearAds() {
		
		// remove all .item elements,
		$('.item').remove();
			
		/* Note that window.ads && window.msg are populated in adview-shim.js */
		
		// clear window.ads
		window.ads = [];
		
		// call addon to clear simple-storage
		window.msg && window.msg("ADNClearAds");
	}
	
	updateAdview(window.ads);
	
	setTimeout(function() {
	
		var evt = {
			clientX: 0,
			clientY: 0,
			dataTransfer: {
				setData: function() {},
				getData: function() { return '-5000,-5000' }
			},
			preventDefault: function() {}
		};
			
		drop(evt); // hack to fix offset()
		
		positionAdview(); // autozoom & center
		
		dbugOffsets && updateTestDivs(); // test-divs
		
		$('#container').addClass('container-trans');
		
	}, 100);
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

	dbugOffsets && updateTestDivs();
}
	
function positionAdview() {
	
	console.log("positionAdview");
	
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

			//console.log(i+")",x,y,w,h);
			// COMPARE-TO (console): $('.item img').each(function(i, img) { console.log( i+") "+Math.round($(this).offset().left)) }); 
			
			if (x < minX || x > maxX || y < minY || y > maxY) {
				
				zoomOut();
				console.log('Ad('+$(this).attr('id')+') offscreen, zoom='+zoomStyle);
				return (problem = true); // break jquery each() loop
			}
		});	
		
		if (!problem) return;	// all ads ok, we're done
	}
}

function createInspectorObj(item) {

	return {
			
		imgsrc : $('img', item).attr('src'),
		imgalt : $('img', item).attr('alt'),
		target : $(item).attr('data-target'),
		origin : $(item).attr('data-origin'),
		visited : $(item).attr('data-visited'),
		detected : $(item).attr('data-detected')
	}
}

/*
 * -- hover:
 *  -- if 'out' exists, remove it
 * 	-- check for existing pane with 'in', if exists
 * 			switch in->out
 *  -- populate first empty pane (with no-class): hovered-items nth dup
 *  -- assign 'in' to this pane
 */
function enableInspector() {

	$('.item').mouseenter(function() {
		 
		// don't re-animate the same ad
		if ($(this).hasClass('inspectee'))
			return;
		
		// remember this as last in the inspector	
		$(this).addClass('inspectee').siblings()
			.removeClass('inspectee');

		// load primary ad and any dups for inspector
		inspectorData = loadInspectorData(this);
	
		// fill fields for first empty pane & set class to 'full'
		populateInspector(inspectorData, inspectorIdx=0);
		
		// make/layout controls for duplicates
		makeDuplicateControls(inspectorData);
	
		doAnimation(inspectorData);
		
		if (inspectorData.length>1)
			 cycleThroughDuplicates();
	});
	
	$('.item').mouseleave(function() {
		
		// kill any remaining dup animations
		animatorId && clearTimeout(animatorId);
	});
}

function loadInspectorData(ele) {

	var data = [ createInspectorObj(ele) ]; 
	return findDuplicates(data);
}

function findDuplicates(data) { // contains template at index=0
	
	$(".item-hidden").each(function(i) {

		var next, url = $(this).attr('data-url');
		if (url === data[0].imgsrc) { // same ad-image?
			
			next = createInspectorObj(this);
			data.push(next);
		}
	});	
	
	return data;
}

function makeDuplicateControls(data) {

	// reset the controls (small dots below the image)
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
	
	//console.log('cycleThroughDuplicates()');
	animatorId && clearTimeout(animatorId);
	animatorId = setTimeout(inspectorAnimator, animateMs);
}

function inspectorAnimator() {
	
	if (inspectorData && inspectorData.length>1) { // is it a dup?
		
		inspectorIdx = ++inspectorIdx >= inspectorData.length ? 0 : inspectorIdx;
				
		populateInspector(inspectorData, inspectorIdx);
		
		//console.log($('img', $('.ready').first()).attr('src'));
		
		doAnimation(inspectorData);
		
		cycleThroughDuplicates(); // next
	}
}
		
function populateInspector(iData, dupIdx) {

	console.log('populateInspector('+dupIdx+') '+new Date().getMilliseconds());
	
	var ele = $('.empty').first(), ad = iData[dupIdx];

	if (!ad) 
		throw Error('no inspectorData['+dupIdx +']:', iData);

	// update image-src and image-alt tags
	$('img', ele).attr('src', ad.imgsrc);
	$('img', ele).attr('alt',  ad.imgalt);
	
	// update inspector fields
	$('.target',   ele).text(ad.target);
	$('.origin',   ele).text(ad.origin);
	$('.visited',  ele).text(ad.visited);
	$('.detected', ele).text(ad.detected);
	
	// set the active dot in the dup-control
	$('.controls li:nth-child('+(inspectorIdx+1)+')')
		.addClass('active').siblings().removeClass('active');
	
	// tell the world we are ready to slide 'in'
	$(ele).removeClass().addClass('ready');	
}

function updateAdview(ads) {
	
	var ads = ads || window.ads;

	if (!ads) throw Error("No ads!");

	var uniqueAds = findDups(ads);
	
	//console.log("updateAdview: "+ads.length+" unique="+uniqueAds.length);
	
	var result = formatDivs(uniqueAds);
	$('#container').html(result);

	result = formatStats(uniqueAds);
	$('#stats').html(result);
	
	enableInspector();
	
	repack();
	
	dbugOffsets && addTestDivs();
}

function repack() {
	
	console.log("repack()");

	pack = new Packery(
		'#container', {
		centered : { y : 5000 }, // center packery at half min-height
		itemSelector : '.item',
		gutter : 1
	});
	
}

function formatDivs(ads) {
		
	var html = '';// ads = findDups(ads);

	for (var i=0, j = ads.length; i<j; i++) {
		
		if (ads[i].url) {
			
			var ad = ads[i];
			
			html += '<a href="'+ad.target+'" id="ad'+ad.id+'" class="item';
			html += ad.hidden ? '-hidden ' : ' '; // hide dups w css
			
			if (ad.visited == 0) html += 'pending ';	
			if (ad.visited < 0)  html += 'failed ';	
			
			html += 'dup-count-'+ad.count+'" ';
			html += 'data-detected="'+formatDate(ad.found)+'" ';
			html += 'data-visited="'+formatDate(ad.visited)+'" ';
			html += 'data-target="'+ad.target+'" ';
			html += 'data-url="'+ad.url+'" ';
			//html += 'data-id="'+ad.id+'" ';
			html += 'data-origin="'+ad.page+'">';
			
			if (!ad.hidden) 
			{
				html += '<span class="counter">'+ad.count+'</span>';
				//html += '<span class="eye" data-href="'+ad.page+'">go to origin link</span>';
				html += '<img id="img'+ad.id+'" src="' + ad.url + '" alt="ad-image">';
			}
			
			html += '</div>\n';
		}
	}
	
	//console.log("\nHTML\n"+html+"\n\n");
	
	return html;
}

function formatStats(ads) {
	
	return 'Since '+ formatDate(sinceTime(ads)) + ': <strong>' + // yuck, get rid of html here
	ads.length+' ads detected, '+numVisited(ads)+' visited.</strong>';
}

function formatDateXXX(ts) { // TODO: this is duplicated from adview-shim, remove
	
	if (!ts) return 'pending';
		
	if (ts < 0)  return 'error';
	
	var date = new Date(ts), days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
		months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	
	var pad = function(str) {
		
		str = String(str);
		return (str.length < 2) ? "0" + str : str;
	}
	
	var meridian = (parseInt(date.getHours() / 12) == 1) ? 'PM' : 'AM';
	var hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
	
	return days[date.getDay()] + ' ' + months[date.getMonth()] + ' ' + date.getDate() 
		+ ' ' + date.getFullYear() + ' ' + hours + ':' + pad(date.getMinutes()) 
		+ meridian.toLowerCase();
		
		//+ ':' + pad(date.getSeconds()) + ' ' + meridian;
}  

// hack to grab the native image size
function realSize(theImage) { // use cache?

	// Create new offscreen image
	var theCopy = new Image();
	theCopy.src = theImage.attr("src");

	// Get accurate measurements from it
	return { w: theCopy.width, h: theCopy.height };
}


function addTestDivs() { // debugging-only

	$('.item img').each(function(i, img) { // use offset or position?

		$('body').append('<div id="test'+$(this).attr('id')+
			'" style="z-index:10000; border:1px; border-color: #f00; border-width:1px; border-style:solid"></div>');
	});	
}

function updateTestDivs() { // debugging-only
	
	$('.item img').each(function(i, img) {
		var x = $(this).offset().left,
			y = $(this).offset().top,
			scale = zooms[zoomIdx] / 100,
			sz = realSize($(this)), // original size
			w = sz.w * scale, // scaled width  
			h = sz.h * scale; // scaled height
		
		//console.log(i+"x: ", x);
		
		$('#test'+(this.id)).offset({ top: y, left: x }).width(w).height(h);
	});
}

function formatDivsSimple(ads) {
	
	var html = '';
	for (var i=0, j = ads.length; i<j; i++) {
		
		if (ads[i].url) {
			html += '<div class="item"><img src="' + ads[i].url + '"></div>\n';
		}
	}
	return html;
}

function formatJSON(data) {

	return JSON.stringify(data, null, 4);//.replace(/\n/g, "<br/>");.replace(/ /g, "&nbsp;");
}


// Duplicate functions (also in adview-shim.js) - need to isolate

function findDups(ads) {
	
	var ad, soFar, hash = {};
	
	for (var i=0, j = ads.length; i<j; i++) {
		
		ad = ads[i];
		
		if (!ad.url) continue;
		
		soFar = hash[ad.url];
		if (!soFar) {
			
			hash[ad.url] = 1;
			ad.hidden = false;
		}
		else {
			
			hash[ad.url]++;
			ad.hidden = true;
		}
	}
	
	for (var i=0, j = ads.length; i<j; i++) {
		
		ad = ads[i];
		ad.count = hash[ad.url];
		//console.log(i+") "+ad.count);
	}
	
	return ads;
}

function formatStats(ads) {
	
	return 'Since '+ formatDate(sinceTime(ads)) + ': <strong>' + // yuck, get rid of html here
	ads.length+' ads detected, '+numVisited(ads)+' visited.</strong>';
}

function numVisited(ads) {
	
	var numv = 0;
	for (var i=0, j = ads.length; i<j; i++) {
			
		if (ads[i].visited > 0) 
			numv++;
	}
	return numv;
}

function sinceTime(ads) {
	
	var oldest = +new Date(), idx = 0;
	for (var i=0, j = ads.length; i<j; i++) {
			
		if (ads[i].found < oldest) { 
			oldest = ads[i].found;
			idx = i;
		}
	}
	return oldest;
}

function formatDate(ts) {
	
	if (!ts) return 'pending';
		
	if (ts < 0)  return 'error';
	
	var date = new Date(ts), days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
		months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	
	var pad = function(str) {
		
		str = String(str);
		return (str.length < 2) ? "0" + str : str;
	}
	
	var meridian = (parseInt(date.getHours() / 12) == 1) ? 'PM' : 'AM';
	var hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
	
	return days[date.getDay()] + ' ' + months[date.getMonth()] + ' ' + date.getDate() 
		+ ' ' + date.getFullYear() + ' ' + hours + ':' + pad(date.getMinutes()) 
		+ meridian.toLowerCase();
		
		//+ ':' + pad(date.getSeconds()) + ' ' + meridian;
}  
