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
	    console.log(dm.style.left+","+dm.style.top, $( window ).width(), $( window ).height(), packBounds());
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

		clearAds();
		e.preventDefault();
	});
	
	//////////// HELPER-FUNCTIONS

	
	
	function clearAds() {
		
		console.log('clear-ads(placeholder)');
		
		// need to clear window.ads, delete all .item, then call addon to clear simple-storage
		//window.ads=[];
		//console.log('preDate: '+window.ads);
		//runFilter();
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

function cycleThroughDuplicates() {
	
	console.log('cycleThroughDuplicates()');
	animatorId && clearTimeout(animatorId);
	animatorId = setTimeout(inspectorAnimator, animateMs);
}

function inspectorAnimator() {
	
	if (inspectorData && inspectorData.length>1) { // is it a dup?
		
		inspectorIdx = ++inspectorIdx >= inspectorData.length ? 0 : inspectorIdx;
		console.log('inspectorAnimator.inspectorIdx='+inspectorIdx);
		populateInspector("#pane1", inspectorData, inspectorIdx);
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

	console.log('enableInspector');	
	
	$('.item').mouseenter(function() {
		 
		// don't re-animate the same ad
		if ($(this).hasClass('inspectee'))
			return;
		
		// remember this as in the inspector	
		$(this).addClass('inspectee').siblings()
			.removeClass('inspectee');

		// reset the data
		inspectorData = [ createInspectorObj(this) ]; 
		findDuplicates();
		
		// fill fields for first empty pan & set class to 'full'
		populateInspector($('.empty').first(), inspectorData, inspectorIdx=0);
		createDupControls();

		$(".item-hidden").each(function(i) {

			var next, url = $(this).attr('data-url');
			if (url === inspectorData[0].imgsrc) { // same ad-image?
				
				next = createInspectorObj(this);
				inspectorData.push(next);
			}
		});	
	
		doAnimation();
	});
}

function findDuplicates() {
	
	$(".item-hidden").each(function(i) {

		var next, url = $(this).attr('data-url');
		if (url === inspectorData[0].imgsrc) { // same ad-image?
			
			next = createInspectorObj(this);
			inspectorData.push(next);
		}
	});	
}

function createDupControls() {

	// reset the controls (small dots below the image)
	$(".controls" ).empty();
	for (var i=0; i < inspectorData.length; i++) {

		var li = '<li data-idx="'+i+'" class=';
		li += (i == 0)  ? 'active' : 'passive';
		$('.controls').append(li+'><a href="#"'+
			 ' class="btn circle"></a></li>');
	}
}
function doAnimation() {
	
	// move pane 'in' to 'out', move 'out' to 'empty' 
	$('.panes>li').each(function( i ) {  
 
			$( this ).removeClass('out').addClass('empty');
		if ($( this ).hasClass('in'))
			$( this ).removeClass().addClass('out');
	});
	
	// set current pane (class='ready') to 'in'
	$('.ready').removeClass().addClass('in');
	
	if (inspectorData.length > 1) 
		cycleThroughDuplicates();
}
		
// hover to put a new ad in the inspector
$('.itemx').hover(function() {
	
	// save current inspectee to 'outgoing' pane
	if (inspectorData && inspectorData.length)
		populateInspector("#pane3", inspectorData, 0);
	
    // grab the data for the new ad(s) from html attributes
    
	var first = createInspectorObj(this); 
	inspectorData = [ first ]; // clearing our the old data
	inspectorIdx = 0;
	
	//console.log('inspectorData: ',inspectorData);

	// check all duplicate items to see which apply for this ad
	$(".item-hidden").each(function(i) {

		var url = $(this).attr('data-url');
		if (url === first.imgsrc) { // same ad-image?
			var next = createInspectorObj(this);
			inspectorData.push(next);
		}
	});	

	// allow user to select a duplicates to view by mousing over a btn-circle (dot)
	$('ul.controls > li').mouseenter(function (e) {

		if (!(inspectorData && inspectorData.length))
			throw Error("No inspector data!!!");
		
		//console.log("DUP-IDX: "+$(this).attr('data-idx'));

		populateInspector("#pane1",  inspectorData, $(this).attr('data-idx'));

		e.preventDefault();
	});

	// update data fields and cycle if we have duplicates
	populateInspector("#pane1", inspectorData, 0);
	
	// TODO: put the duplicates in 'wait' state (#pane)
	if (inspectorData.length>1) { 
	
		populateInspector("#pane2",  inspectorData, 1);
	}
});

function populateInspector(ele, iData, dupIdx) {

	var ad = iData[dupIdx];// + ';//:first-child()';

	if (!ad) 
		throw Error("No item for dupIdx:"+dupIdx+"!!", iData);

	// update image-src and image-alt tags
	$('img', ele).attr('src', ad.imgsrc);
	$('img', ele).attr('alt',  ad.imgalt);
	
	// update inspector fields
	$('.target',   ele).text(ad.target);
	$('.origin',   ele).text(ad.origin);
	$('.visited',  ele).text(ad.visited);
	$('.detected', ele).text(ad.detected);
	
	$(ele).removeClass().addClass('ready');
	
	$('.gcontrols li:nth-child('+(inspectorIdx+1)+')')
		.addClass('active').siblings().removeClass('active');
}

function updateAdview(ads) {
	
	var ads = ads || window.ads;

	if (!ads) throw Error("No ads!!!!");

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

function positionAdview() { 
	
	var pb = packBounds();
	console.log("Window: 0,0,"+$(window).width()+','+$(window).height());
	console.log("RightP: "+$('#right').css('left')+','+$('#right').css('top')+','+$('#right').width()+','+$('#right').height());
	console.log("LeftP: 0,0,"+($(window).width()-$('#right').width())+','+$(window).height());
	var px = Math.round(pb.x+pb.width/2);
	var py = Math.round(pb.y+pb.height/2);
	console.log('CenterPack: '+px+","+py);
	//$('.clearb').css("top",+py+"px");
	//$('.clearb').css("left",+px+"px");

	return;
	
	var pb = packBounds(), tries = 0;
	
	console.log("positionAdview().pre",pb);
	
	while (pb.x<0 || pb.y<0) {
		
		console.log("zoomOut("+pb.x+","+pb.y+") "+zooms[zoomIdx]);

		zoomOut();
		pb = packBounds();
		if (++tries > 5)
			break;
	}
	
	var dm  = document.querySelector('#container');
    //dm.style.left = '10px';
    //dm.style.top =-2500+'px';
	
	console.log("positionAdview().done: ", packBounds(), zooms[zoomIdx]);
}

function packBounds(zoom) {
	
	zoom = zoom || 1;
	var minX=Number.MAX_VALUE, 
		maxX=-Number.MAX_VALUE, 
		minY=Number.MAX_VALUE, 
		maxY=-Number.MAX_VALUE, x, y, z, w;
					
	$('.item img').each(function(i, img) { // use offset or position

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
	
	//var zoom = zoomzooms[zoomIdx]; 
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
