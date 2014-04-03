var zratio = 1.2, zstepSz = .05, zholdMs = 200, animateMs=2000;
var inspectorData, inspectorIdx, animatorId, pack, container;
var zoomIdx=0, zooms = [ 100, 75, 50, 25, 12.5, 6.25 ];

$(document).ready(makeAdview);
$(document).focus(makeAdview);

function makeAdview() {
	
	//console.log('makeAdview');
	
	var container = document.querySelector('#container');
	var zoomId = -1, pack = new Packery(container, {
		
		centered : { y : 300 }, // why 300??
		itemSelector : '.item',
		gutter : 1
	});
	
	addEventHandlers();
	//resize(zratio);
	
	function addEventHandlers() {
			
		/////////// RESIZE PANELS
		
		var h = $('#handle'), l = $('#left'), r = $('#right'), w = $('body').width(), isDragging = false;
	
		h.mousedown(function(e){
		    isDragging = true;
		    e.preventDefault();
		});
		
		$(document).mouseup(function() {
	    	isDragging = false;
			}).mousemove(function(e) {
		    if (isDragging){  // constrain drag width here
		    	var lw = e.pageX = Math.min(Math.max(w*.3, e.pageX), w*.9);
		        l.css('width', lw);
		        r.css('width', w - e.pageX);
		    }
		    pack.layout();
		});
		
		/////////// DRAG CONTAINER
		
		function drag_start(event) {
		    var style = window.getComputedStyle(event.target, null);
		    event.dataTransfer.setData("text/plain", (parseInt(style.getPropertyValue("left"), 10)
		    	 - event.clientX) + ',' + (parseInt(style.getPropertyValue("top"), 10) - event.clientY));
		} 
		function drag_over(event) { 
	
		    return _drag(event); 
		} 
		function drop(event) { 
			
		    return _drag(event);
		} 
		function _drag(event) {
			
			var offset = event.dataTransfer.getData("text/plain").split(',');
		   	var dm  = document.querySelector('#container');
		    dm.style.left = (event.clientX + parseInt(offset[0], 10)) + 'px';
		    dm.style.top = (event.clientY + parseInt(offset[1], 10)) + 'px';
		    event.preventDefault(); 
		    return false;
		}
		
		var dm  = document.querySelector('#container');
		dm.addEventListener('dragstart', drag_start, false); 
		document.body.addEventListener('dragover', drag_over, false); 
		document.body.addEventListener('drop', drop, false);
		
		//from: http://jsfiddle.net/robertc/kKuqH/
		
		/////////// ZOOMING
		
		// click zoom-in
		$('#z-in').click(function(e) {
			e.preventDefault();
			//resize(zratio += zstepSz);
			zoomIn();
		});
		

		// click zoom-out
		$('#z-out').click(function(e) {
			e.preventDefault();
			//if (zratio > .1)	resize(zratio -= zstepSz);
			zoomOut();
		});
		
		/* // hold zoom-in 
		$('#z-in').mousedown(function() {
	    	zoomId = setInterval(function(){ zoomIn(); }, zholdMs);
		}).bind('mouseup mouseleave', function() {
		    clearTimeout(zoomId);
		});
		
		// hold zoom-out
		$('#z-out').mousedown(function() {
	    	//zoomId = setInterval(function(){ if (zratio > .1) resize(zratio -= zstepSz); }, zholdMs);
	    	zoomId = setInterval(function(){ zoomOut(); }, zholdMs);
		}).bind('mouseup mouseleave', function() {
		    clearTimeout(zoomId);
		});*/

		/////////// INSPECTOR

		// hover to put item(s) in inspector
		$('.item').hover(function() {

			animatorId && clearTimeout(animatorId);		
			animatorId = setTimeout(inspectorAnimator, animateMs); 

			var img = $('img', this), src = img.attr('src'), alt = img.attr('alt');
			
			$('.inspect img').attr('src', src);
			
			// copy hovered image attributes into inspector
			$('.inspect img').attr('alt', alt);

			var first = {
				target : $(this).attr('data-target'),
				origin : $(this).attr('data-origin'),
				visited : $(this).attr('data-visited'),
				detected : $(this).attr('data-detected')
			}

			inspectorData = [ first ];
			
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

			/////////// RESET CONTROLS
			
			$(".controls" ).empty();
			
			for (var i=0; i < inspectorData.length; i++) {
				
				var li = '<li data-idx="'+i+'"';
				if (i == 0) li += ' class="active"';
				$('.controls').append(li + '><a href="#" class="btn circle"></a></li>');
			}	
			
			$('ul.controls > li').mouseenter(function (e) {
			    
	    		//$(this).addClass('active').siblings().removeClass('active');
	    		var idx = $(this).attr('data-idx');
	    		
	    		//console.log('idx: '+idx);
	    		
	    		if (!inspectorData || inspectorData.length < 1) 
	    			throw Error("No inspector data!!!");
	    		
				populateInspector(idx);
	
	    		//console.log(this);
	    		
	    		e.preventDefault();
			});

			populateInspector(0);
		});
	}
	
	// hack to grab the native image size
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
	
	function setZoom(idx) {
		
		var style =('z-'+zooms[idx]).replace(/\./, '_');
		$('#container').removeClass().addClass(style);
		$('#ratio').html(zooms[idx]+'%');
		//console.log('zoomIn: '+$('#container').attr('class')+" style="+style);
	}
	
	function zoomOut() {

		(zoomIdx < zooms.length-1) && setZoom(++zoomIdx);
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
}

function populateInspector(selectedIdx) {
	
	if (selectedIdx >= inspectorData.length)
		selectedIdx = 0;
		
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
	
	//$("ul.controls")
	$("ul.controls li:nth-child("+(inspectorIdx+1)+")" )
		.addClass('active').siblings().removeClass('active');
}
	
function inspectorAnimator() {
	
	if (inspectorData && inspectorData.length>1) 
		populateInspector(inspectorIdx+1);
	
	animatorId && clearTimeout(animatorId);
	animatorId = setTimeout(inspectorAnimator, animateMs); 
}

function trimPath(u, max) { // TODO: should show full domain?
	return u;
	max = max || 30;
	if (u && u.length > max) 
		u = u.substring(0, max / 2) + '...' + u.substring(u.length-max/2);
	return u;
}