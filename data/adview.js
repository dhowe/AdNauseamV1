/* ISSUES:
 * Add:
 * 	Handle video assets better (especially images)
 * 	Show notification in adview if no network
 */

var inspectorData, inspectorIdx, animatorId, pack, container;
var zratio = 1.2, zstepSz = .05, zholdMs = 200, animateMs=2000;
var zoomIdx = 0, resizing = false, zooms = [ 100, /*75,*/ 50, 25, 12.5, 6.25 ];

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

	$(document).mousemove(function(e) {

	    if (resizing) {  // constrain drag width here

	    	var w = $('body').width(),
	    		lw = e.pageX = Math.min(Math.max(w*.3, e.pageX), w*.9);
	        $('#left').css('width', lw);
	        $('#right').css('width', w - e.pageX);
	        
	        pack && pack.layout();
	    }
	    
	    e.preventDefault(); // needed?
	});

	/////////// DRAG-STAGE

	document.querySelector('#container').addEventListener('dragstart', dragStart, false);
	document.body.addEventListener('dragover', dragOver, false);
	document.body.addEventListener('drop', drop, false);
	// from: http://jsfiddle.net/robertc/kKuqH/

	function dragStart(event) {
		
	    var style = window.getComputedStyle(document.querySelector('#container'), null);
		var x = parseInt(style.getPropertyValue("left"), 10) - event.clientX;
		var y = parseInt(style.getPropertyValue("top"),  10) - event.clientY;
		//console.log("dragStart: "+x+","+y);
	    event.dataTransfer.setData("text/plain", x + ',' + y);
	}

	function dragOver(event) { return _drag(event); }

	function drop(event) { return _drag(event); }

	function _drag(event) {

		var offset = event.dataTransfer.getData("text/plain").split(',');
	   	var dm  = document.querySelector('#container');
	    dm.style.left = (event.clientX + parseInt(offset[0], 10)) + 'px';
	    dm.style.top = (event.clientY + parseInt(offset[1], 10)) + 'px';
	    //console.log(dm.style.left+","+dm.style.top, $( window ).width(), $( window ).height(), packBounds());
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
		
		// clear window.ads
		window.ads = [];
		
		// call addon to clear simple-storage
		window.msg && window.msg("ADNClearAds");
	}
	
	updateAdview();
	positionAdview();
}

function zoomIn() {
	
	(zoomIdx > 0) && setZoom(--zoomIdx);
}

function zoomOut() {
	
	(zoomIdx < zooms.length-1) && setZoom(++zoomIdx);
}

function setZoom(idx) {

	var style =('z-'+zooms[idx]).replace(/\./, '_');
	$('#container').removeClass().addClass(style);
	$('#ratio').html(zooms[idx]+'%');
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
	
	console.log("updateAdview: "+ads.length+" unique="+uniqueAds.length);
	
	var result = formatDivs(uniqueAds);
	$('#container').html(result);

	result = formatStats(uniqueAds);
	$('#stats').html(result);
	
	enableInspector();
	
	repack();
}

function repack() {
	
	console.log("new Packery()");

	pack = new Packery(
		'#container', {
		centered : { y : 5000 }, // center packery at half min-height
		itemSelector : '.item',
		gutter : 1
	});
	
}

function formatDivs(ads) {
		
	var html = '';// ads = findDups(ads);
	
	//console.log(ads);
	
	for (var i=0, j = ads.length; i<j; i++) {
		
		if (ads[i].url) {
			
			var ad = ads[i];
			
			html += '<a href="'+ad.target+'" class="item';
			html += ad.hidden ? '-hidden ' : ' '; // hide dups w css
			
			if (ad.visited == 0) html += 'pending ';	
			if (ad.visited < 0)  html += 'failed ';	
			
			html += 'dup-count-'+ad.count+'" ';
			html += 'data-detected="'+formatDate(ad.found)+'" ';
			html += 'data-visited="'+formatDate(ad.visited)+'" ';
			html += 'data-target="'+ad.target+'" ';
			html += 'data-url="'+ad.url+'" ';
			html += 'data-origin="'+ad.page+'">';
			
			if (!ad.hidden) 
			{
				html += '<span class="counter">'+ad.count+'</span>';
				//html += '<span class="eye" data-href="'+ad.page+'">go to origin link</span>';
				html += '<img src="' + ad.url + '" alt="ad">';
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
		+ meridian.toLowerCase() + ' ('+ts+')'; // attach ts to end for debugging
		
		//+ ':' + pad(date.getSeconds()) + ' ' + meridian;
}  
/*
function filterByDate(ads, min, max) {
	
	//console.log('filterByDate: '+ads.length+' ads, min='+formatDate(min)+', max='+formatDate(max));
	
	var filtered = [];
	for (var i=0, j = ads.length; i<j; i++) {
		 
		//ads[i].filtered = false;
		
		if (ads[i].found < min || ads[i].found > max) {
			
			//console.log('filtered: '+formatDate(ads[i].found));
			//ads[i].filtered = true;
		}
		else {
			filtered.push(ads[i]);
		}
	}
	//console.log('filterByDate: in='+ads.length+' out='+filtered.length);

	return filtered;
}*/

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

// hack to grab the native image size
function realSize(theImage) { // use cache?

	// Create new offscreen image
	var theCopy = new Image();
	theCopy.src = theImage.attr("src");

	// Get accurate measurements from it
	return { w: theCopy.width, h: theCopy.height };
}

// 1. Zoom so that all ads are at least 50% visible
// 2. Center the collage in the window
// Use: packBounds() and zoomOut()
function positionAdview() { 
	
	var percentVisible = .5; // each ad must be 50% visible
	
	/*console.log("Window: 0,0,"+$(window).width()+','+$(window).height());
	console.log("RightP: "+$('#right').css('left')+','+$('#right').css('top')+','+$('#right').width()+','+$('#right').height());
	console.log("LeftP: 0,0,"+($(window).width()-$('#right').width())+','+$(window).height());
	var px = Math.round(pb.x+pb.width/2);
	var py = Math.round(pb.y+pb.height/2);
	console.log('CenterPack: '+px+","+py);
	//$('.clearb').css("top",+py+"px");
	//$('.clearb').css("left",+px+"px");*/

	console.log('positionAdview()');
	
	return;
	
	// get the bounds of the collage
	var pb = packBounds();
	
	var tries = 0; // number of tries so far
	
	// get width and height of window
	var winH = $(window).height(),
		winW = $(window).width() - $('#right').width(); 
	
	console.log("positionAdview().pre",pb);
	
	// Part 1: keep zooming out until all ads (upper-left corner) are onscreen =============
	while (pb.x<0 || pb.y<0) {
		
		console.log("zoomOut("+pb.x+","+pb.y+") "+zooms[zoomIdx]);

		zoomOut();
		pb = packBounds();
		if (++tries > 5)
			break;
	}
	
	// Part 2: Now center the collage in the container ==================================
	
	var dm  = document.querySelector('#container');
    //dm.style.left = '10px';
    //dm.style.top =-2500+'px';
	
	console.log("positionAdview().done: ", packBounds(), zooms[zoomIdx]);
}

// Returns the bounds of the collage 
// returns Object with x, y, width, height
function packBounds(zoom) {
	
	zoom = zoom || 1;
	
	var minX=Number.MAX_VALUE, 
		maxX=-Number.MAX_VALUE, 
		minY=Number.MAX_VALUE, 
		maxY=-Number.MAX_VALUE, x, y, z, w;
					
	$('.item img').each(function(i, img) { // use offset or position?

		x = $(this).offset().left,
			y = $(this).offset().top,
			sz = realSize($(this)),
			w = sz.w, h = sz.h;
		
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x+w > maxX) maxX = x+w;
		if (y+h > maxY) maxY = y+h;
		
		//console.log(i+': x='+$(this).offset().left+" y="+$(this).offset().left);
	});
	
	//var zoom = zooms[zoomIdx]; 
	
	// Returns the bounds of the collage
	return { x: minX, y: minY, width: (maxX-minX)*zoom, height: (maxY-minY)*zoom };
}


// resize each image according to aspect ratio (not used)
function resize(r) {

	//console.log('resize: '+r);
	$('.item img').each(function(i, img) {

		var $img = $(img), sz = realSize($img);
		$img.css({
			'width'  : sz.w * r,
			'height' : sz.h * r
		});
	});

	$('#ratio').html(r.toFixed(2));

	pack.layout();
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
