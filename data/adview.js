var inspectorData, inspectorIdx, animatorId, pack, container;
var zratio = 1.2, zstepSz = .05, zholdMs = 200, animateMs=2000;
var zoomIdx = 0, resizing = false, zooms = [ 100, 75, 50, 25, 12.5, 6.25 ];

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
		//console.log("dragStart: "+event.target);
	    var style = window.getComputedStyle(document.querySelector('#container'), null);
		var x = parseInt(style.getPropertyValue("left"), 10) - event.clientX;
		var y = parseInt(style.getPropertyValue("top"),  10) - event.clientY;
		//console.log("dragStart: "+x+","+y);
	    event.dataTransfer.setData("text/plain", x + ',' + y);
		// event.preventDefault(); -> breaks dragging
	}

	function dragOver(event) { return _drag(event); }

	function drop(event) { return _drag(event); }

	function _drag(event) {

		var offset = event.dataTransfer.getData("text/plain").split(',');
	   	var dm  = document.querySelector('#container');
	    dm.style.left = (event.clientX + parseInt(offset[0], 10)) + 'px';
	    dm.style.top = (event.clientY + parseInt(offset[1], 10)) + 'px';
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
	
	/////////// INSPECTOR

	// hover to put a new ad in the inspector
	$('.item').hover(function() {
		
		var img = $('img', this),
			src = img.attr('src'),
			alt = img.attr('alt');

	    // grab the data for the new ad(s) from html attributes
		var first = {
			
			target : $(this).attr('data-target'),
			origin : $(this).attr('data-origin'),
			visited : $(this).attr('data-visited'),
			detected : $(this).attr('data-detected')
		}

		inspectorData = [ first ];

		// check all duplicate items to see which apply for this ad
		$(".item-hidden").each(function(i) {

			var url = $(this).attr('data-url');
			if (url === src) {
				var next = {
					target : $(this).attr('data-target'),
					origin : $(this).attr('data-origin'),
					visited : $(this).attr('data-visited'),
					detected : $(this).attr('data-detected')
				}
				inspectorData.push(next);
			}
		});

		// reset the controls (small dots below the image)
		$(".controls" ).empty();

		for (var i=0; i < inspectorData.length; i++) {

			var li = '<li data-idx="'+i+'"';
			if (i == 0) li += ' class="active"';
			$('.controls').append(li + '><a href="#" class="btn circle"></a></li>');
		}

		// allow user to select a duplicates to view by mousing over a control
		$('ul.controls > li').mouseenter(function (e) {

    		//$(this).addClass('active').siblings().removeClass('active');
    		var idx = $(this).attr('data-idx');

    		if (!inspectorData || inspectorData.length < 1)
    			throw Error("No inspector data!!!");

			populateInspector(idx);

    		e.preventDefault();
		});

		// update image-src and image-alt tags for new ad
		$('.inspect img').attr('src', src);
		$('.inspect img').attr('alt', alt);

		// update data fields and cycle if we have duplicates
		populateInspector(0);
		if (inspectorData.length > 1)
			cycleThroughDuplicates();
	});

	//////////// HELPER-FUNCTIONS

	function zoomIn() {
		(zoomIdx > 0) && setZoom(--zoomIdx);
	}

	function zoomOut() {
		(zoomIdx < zooms.length-1) && setZoom(++zoomIdx);
	}
	
	function clearAds() {
		
		console.log('clear-ads(placeholder): '+window.ads.length);
		// need to clear window.ads, delete all .item, then call addon to clear simple-storage
		//window.ads=[];
		//repack();
	}

	function setZoom(idx) {

		//console.log('zoomIdx='+zoomIdx);
		var style =('z-'+zooms[idx]).replace(/\./, '_');
		$('#container').removeClass().addClass(style);
		$('#ratio').html(zooms[idx]+'%');
	}
	
	updateAdview();
}

// hack to grab the native image size
function realSize(theImage) { // use cache?

	// Create new offscreen image
	var theCopy = new Image();
	theCopy.src = theImage.attr("src");

	// Get accurate measurements from it
	return { w: theCopy.width, h: theCopy.height };
}

// resize each image according to aspect ratio

function resize(r) {

	// OR: document.body.style.zoom="300%"
	
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

function populateInspector(selectedIdx) {

	(selectedIdx >= inspectorData.length) && (selectedIdx = 0);

	inspectorIdx = selectedIdx;
	var selected = inspectorData[inspectorIdx];

	if (!selected) throw Error("No selected!!");

	// copy hovered image attributes into inspector
	$('.target',   '.inspect li:first-child()').text(selected.target);
	//$('.target',   '.inspect li:first-child()').attr('href',  selected.target);

	$('.origin',   '.inspect li:first-child()').text(selected.origin);
	//$('.origin',   '.inspect li:first-child()').attr('href',  selected.origin);

	$('.visited',  '.inspect li:first-child()').text(selected.visited);
	$('.detected', '.inspect li:first-child()').text(selected.detected);

	$("ul.controls li:nth-child("+(inspectorIdx+1)+")" )
		.addClass('active').siblings().removeClass('active');
}

function cycleThroughDuplicates() {
	animatorId && clearTimeout(animatorId);
	animatorId = setTimeout(inspectorAnimator, animateMs);
}

function inspectorAnimator() {
	if (inspectorData && inspectorData.length>1) // is this a dup?
		populateInspector(inspectorIdx+1);
	cycleThroughDuplicates();
}

// was adview-ui.js ==========================================

function updateAdview(ads) {
	
	var ads = ads || window.ads;

	if (!ads) throw Error("No ads!!!!");

	var uniqueAds = findDups(ads);
	
	console.log("updateAdview: "+ads.length+" unique="+uniqueAds.length);
	
	var result = formatDivs(uniqueAds);
	$('#container').html(result);

	result = formatStats(uniqueAds);
	$('#stats').html(result);
	
	console.log("pack.layout()");
	
	repack();
}

function repack() {
	
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

function filterByDate(ads, min, max) {
	
	console.log('filterByDate: '+ads.length+' ads, min='+formatDate(min)+', max='+formatDate(max));
	
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
	console.log('filterByDate: in='+ads.length+' out='+filtered.length);

	return filtered;
}

function findDups(ads) {
	
	var ad, soFar, hash = {};
	
	for (var i=0, j = ads.length; i<j; i++) {
		
		ad = ads[i];
		if (!ad.url || ad.hidden) 
			continue;
		
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
