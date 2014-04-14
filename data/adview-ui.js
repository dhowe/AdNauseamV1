var inspectorData, inspectorIdx, animatorId, pack, container;
var zratio = 1.2, zstepSz = .05, zholdMs = 200, animateMs=2000, offset={};
var zoomIdx = 0, resizing = false, zooms = [ 100, 75, 50, 25, 12.5, 6.25 ];

$(document).ready(makeAdview);
$(document).focus(makeAdview);

function makeAdview() {

	var zoomId = -1, pack = new Packery(
		document.querySelector('#container'), {
		centered : { y : 300 }, // why??
		itemSelector : '.item',
		gutter : 1
	});
	
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
	    }
	    
	    pack.layout();
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
		console.log("dragStart: "+x+","+y); 
	    event.dataTransfer.setData("text/plain", x + ',' + y);
	    offset.x = x;
	    offset.y = y;
	    	// (parseInt(style.getPropertyValue("left"), 10)-event.clientX) 
	    	// + ',' + (parseInt(style.getPropertyValue("top"), 10)-event.clientY));
		// event.preventDefault(); -> breaks dragging 
	} 
	
	function dragOver(event) { return _drag(event); } 
	
	function drop(event) { return _drag(event); } 
	
	function _drag(event) {
		
		var offset = event.dataTransfer.getData("text/plain").split(',');
	   	var dm  = document.querySelector('#container');
	    dm.style.left = (event.clientX + parseInt(offset[0], 10)) + 'px';
	    //dm.style.left = (event.clientX + parseInt(offset.x, 10)) + 'px';
	    dm.style.top = (event.clientY + parseInt(offset[1], 10)) + 'px';
	    //dm.style.top = (event.clientY + parseInt(offset.y, 10)) + 'px';
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
	
	function setZoom(idx) {
		
		//console.log('zoomIdx='+zoomIdx);
		var style =('z-'+zooms[idx]).replace(/\./, '_');
		$('#container').removeClass().addClass(style);
		$('#ratio').html(zooms[idx]+'%');
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
	
	// hack to grab the native image size
	function realSize(theImage) { // use cache?
		
		// Create new offscreen image 
		var theCopy = new Image();
		theCopy.src = theImage.attr("src");
		
		// Get accurate measurements from it
		return { w: theCopy.width, h: theCopy.height };
	}
}

function populateInspector(selectedIdx) {
	
	(selectedIdx >= inspectorData.length) && (selectedIdx = 0);
		
	inspectorIdx = selectedIdx;
	var selected = inspectorData[inspectorIdx];
	
	if (!selected) throw Error("No selected!!");
	
	// copy hovered image attributes into inspector
	$('.target',   '.inspect li:first-child()').text(selected.target);
	$('.target',   '.inspect li:first-child()').attr('href',  selected.target);

	$('.origin',   '.inspect li:first-child()').text(selected.origin);
	$('.origin',   '.inspect li:first-child()').attr('href',  selected.origin);
	
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
