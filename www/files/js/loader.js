$(document).ready(function() {
	
	// Settings
	var slideToSpeed = 500;
	var slideUpSpeed = 700;
	var $easingType= 'easeInOutQuart';
	
	// Caching
	var $close_button = $('#close');	
	var $load_items = $('a.loadcontent');
	// end Caching
	
	var startview = true;
	if ($('body').attr("id") !== 'home') { startview = false; var startportfolio = true; var portfolio = true; }
	
	var hash = window.location.hash.substr(1);
	var y=0;
	$load_items.each(function(){
		var i=0;
		var $this = $(this);							 
		var rel = $this.attr('rel');
		var href = $this.attr('href');
		if(hash==rel){
			// Bugfix for multiple load if more links exists
			if (y < 1) {
				$(this).addClass('active');
				$('html, body').delay(1000).animate({scrollTop: $("#header").prop("scrollHeight")}, slideToSpeed, $easingType, function() {
					if (i < 1) { // Bugfix for double load html, body
						$(this).addClass('active');
						$('#slidersection').animate({'marginLeft':'-100%'}, 1000, $easingType, function() {
							$('#loader div div').fadeIn(200);																
							$('#loadingsection').css({'left':'100%'});																
							loadContent(href);
						});
						
					}
					i++;
				});
			}
			y++;
		}											
	});
	
	
	
	$("body").on("click", 'a.loadcontent', function() {
		var i=0;
		
		//  remove & add active class
		$load_items.removeClass('active');
		$(this).addClass('active');					   
		//						   
			
		var $this = $(this);	
		var rel = $this.attr('rel');
		var id = $this.attr('id');
		var href = $this.attr('href');
		
		
		if(window.location.hash.substr(1) == rel) { 
			$('html, body').animate({scrollTop: $("header").prop("scrollHeight")}, slideToSpeed, $easingType);
		} else {
			window.location.hash = rel;	// set the hash
			$('html, body').animate({scrollTop: $("header").prop("scrollHeight")}, slideToSpeed, $easingType, function() {
				// Bugfix for double load html, body
				if (i < 1) {
					if (startview) { 
						$('#slidersection').animate({'marginLeft':'-100%'}, 800, $easingType, function() {
							$('#loader div div').fadeIn(200);																
							$('#loadingsection').css({'left':'100%'});																
							loadContent(href, '#slidersection');
						});
						startview = false;
					} else {
						if (id == 'nav-prev') {
							var animposition = '100%';	
							var startposition = '-100%';	
						} else {
							var animposition = '-100%';	
							var startposition = '100%';	
						}
						
						if (startportfolio) {
							$('#loader div div').fadeIn(200);																
							$('#loadingsection').css({'left':'100%'});																
							loadContent(href, '#loadingsection');
						} else {
							$('#loadingsection').animate({'left':animposition}, 800, $easingType, function() {
								$('#loader div div').fadeIn(200);																
								$('#loadingsection').css({'left':startposition});																
								loadContent(href, '#loadingsection');
							});
						}
					}
				}
				i++;
			});
		}
		return(false);
	});
	
	
	
	function loadContent(href, hidedcontent) {
		startview = false;
		startportfolio = false;
		$('#loader').fadeIn(100);
		var LoadContentWrapper = href;
		$('#pageloader').queue(function() {
			$(this).load(LoadContentWrapper +' #maincontent, #sidebar', function() {
				initialise('#loadingsection'); // after loading is complete we initialise all scripts
				$('#pageloader').find('#sidebar').append('<div id="close"><a href="">Close</a></div>');
				$('#loader div div').delay(1700).fadeOut(200, function() {
					var newheight = $('#loadingsection').height();
					$('#animationsection').animate({'height': newheight+'px'}, 500, $easingType);
					$('#loadingsection').animate({'left':'0%'}, 800, $easingType, function() {
						$('#animationsection').css({'height': newheight+'px'});	// SECURITY FOR ANIMATION
					});												   
				});
			});
			$(this).dequeue();
		});
	}
	
	
	
	$("body").on("click", 'div#close a', function() {
		$load_items.removeClass('active');
		$('#loadingsection').animate({'left':'100%'}, 1000, $easingType, function() {
			if (portfolio) {
				$('#animationsection').animate({'height': '0px'}, 500, $easingType);
				startview = false;
				startportfolio = true;
			} else {
				$('#loader div div').fadeIn(200).delay(1000).fadeOut(200, function() {
					var newheight = $('#slidersection').height();
					$('#animationsection').animate({'height': newheight+'px'}, 500, $easingType);
					$('#slidersection').animate({'marginLeft':'0%'}, 800, $easingType, function() {
						$('#animationsection').css({'height': 'auto'});	 // SECURITY FOR ANIMATION
					});
				});
				startview = true;
			}
		});
		window.location.hash = '#_';								// delete hash
		return(false);
	});
	
	

});