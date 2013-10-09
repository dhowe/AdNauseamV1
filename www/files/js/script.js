$(document).ready(function() {	
	// Effects
	$easingType= 'easeInOutQuart';
	
	//Initialising
	initialise('body'); // call function
	
	
	/*---------------------------------------------- 
				S H O W / H I D E   T O P 
	------------------------------------------------*/	
	var topposition = $('#top').height() - 5;
	$("#top").css({ 'top': '-'+topposition+'px' });
	
	$(window).resize(function() {
		topposition = $('#top').height() - 5;
		$("#top").css({ 'top': '-'+topposition+'px' });
	});
	
	$(".showhidetop").click(function() { 
		var status = $(this).parent('.top_inner').parent('#top').css('top');
		if (status == '-'+topposition+'px') {
			 $(this).parent('.top_inner').parent('#top').animate({ 'top': '0px' }, 500, $easingType);
			 $(this).addClass('hidetop');
			} else {
			 $(this).parent('.top_inner').parent('#top').animate({ 'top': '-'+topposition+'px' }, 500, $easingType);
			 $(this).removeClass('hidetop');
		}
		return false;
	});
	
	
	
	
	/*---------------------------------------------- 
				   I S O T O P E   (masonry)
	------------------------------------------------*/
	var $container = $('#masonry');
	$container.imagesLoaded( function(){
		$container.isotope({
			itemSelector : '.masonry_item'
		});	
	});
	
	
	
	/*---------------------------------------------- 
			 D R O P   D O W N   N A  V I
	------------------------------------------------*/
	$('nav li').hover(function() {
		$(this).children('ul').fadeIn(200);
	}, function() {
		$(this).children('ul').fadeOut(200);
	});
	
	
	
	/*---------------------------------------------- 
		S O C I A L   I C O N S   A N I M A T I O N
	------------------------------------------------*/
	$('.socialmedia a').hover(function() {
		$(this).find('span').animate({ 'marginTop': '-30px' }, 300, $easingType);
	}, function() {
		$(this).find('span').animate({ 'marginTop': '0px' }, 300, $easingType);
	});
	
		
	
	
	/*---------------------------------------------- 
				   B A C K   T O P   T O P
	------------------------------------------------*/
	$('.totop').click(function(){
		//alert('test');	
		$('html, body').animate({scrollTop: 0}, 600, $easingType);
		return false;						   
	});
	
	$(window).scroll(function() {
		var position = $(window).scrollTop();
		if ( position > 300 )  {
			$( '.totop' ).fadeIn( 350 );
		} else { 
			$( '.totop' ).fadeOut( 350 );
		}
		
		if(navigator.platform == 'iPad' || navigator.platform == 'iPhone' || navigator.platform == 'iPod') { $('.totop').css("position", "static"); };
		
	});
	
	
	
	
	/*---------------------------------------------- 
				     F I L T E R
	------------------------------------------------*/
	// onclick reinitialise the isotope script
	$('.filter li a').click(function(){
		
		$('.filter li a').removeClass('active');
		$(this).addClass('active');
		
		var selector = $(this).attr('data-option-value');
		$container.isotope({ filter: selector });
		
		return(false);
	});
	
	
	
	
	/*---------------------------------------------- 
				R E S P ON S I V E   N A V 
	------------------------------------------------*/
	$("<select />").appendTo("nav");
	
	$("<option />", {
	   "selected": "selected",
	   "value"   : "",
	   "text"    : "Go to..."
	}).appendTo("nav select");
	
	// Populate dropdown with menu items
	$("nav li").each(function() {
		
		var depth   = $(this).parents('ul').length - 1;
		
		var indent = '';
		if( depth > 0 ) { indent = ' - '; }
		if( depth > 1 ) { indent = ' - - '; }
		if( depth > 2 ) { indent = ' - - -'; }
		if( depth > 3 ) { indent = ' - - - -'; }

		
		 var el = $(this).children('a');
		 $("<option />", {
			 "value"   : el.attr("href"),
			 "text"    : (indent+el.text())
		 }).appendTo("nav select");
	});
	
	$("nav select").change(function() {
	  window.location = $(this).find("option:selected").val();
	});
	
	
	/*---------------------------------------------- 
				  C H E C K   F O R M 
	------------------------------------------------*/
	// create the checkfalse div's
	$('.checkform .req').each(function(){
		$(this).parent().append('<span class="checkfalse">false</span>');
	});
	$('.checkfalse').hide();
	
	$(".checkform").on("click", 'input[type="submit"]', function() {
				
		form = $(this).parent('div');
		$form = $(form).parent('.checkform');
		form_action = $form.attr('target');
		id = $form.attr('id');
		
		var control = true;
		
		$form.find('label.req').each(function(index){
			var name = $(this).attr('for');
			defaultvalue = $(this).html();
			value = $form.find('.'+name).val();
			formtype = $form.find('.'+name).attr('type');
									
			if (formtype == 'radio' || formtype == 'checkbox') {
				if ($('.'+name+':checked').length == 0) { $(this).siblings('.checkfalse').fadeIn(200); control = false;  } else { $(this).siblings('.checkfalse').fadeOut(200); }
			} else if(name == 'email') {
				var re = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
				if (!value.match(re)) { $(this).siblings('.checkfalse').fadeIn(200); $form.find('.'+name).addClass('false'); control = false;  } else { $(this).siblings('.checkfalse').fadeOut(200); 
					$form.find('.'+name).removeClass('false'); }
			} else {
				if (  value == '' || 
					  value == defaultvalue
					  ) { 
					$(this).siblings('.checkfalse').fadeIn(200); $form.find('.'+name).addClass('false'); control = false;  } else { $(this).siblings('.checkfalse').fadeOut(200); 
						$form.find('.'+name).removeClass('false'); 
				}
			}
			
		});
		
		
		if (!control) { 
		
			$("#form-note").fadeIn(200);
			return false; 
		
		} else {
			
			$("#form-note").fadeOut(200);
			
			if (form_action && form_action !== '') {
				var str = $form.serialize();
					
				   $.ajax({
				   type: "POST",
				   url: form_action,
				   data: str,
				   success: function(msg){
					$("#form-note").ajaxComplete(function(event, request, settings){
						$(this).html(msg);
						$(this).delay(200).fadeIn(200);
					});
				   }
			});
			}
			return false;
			
		} // END else {
		
	});
	
	
});



function initialise(content) {	

	/*---------------------------------------------- 
				 F L E X S L I D E R 
	------------------------------------------------*/
	$(content+' .slidermain .flexslider').flexslider({
		animation: "slide",
		controlsContainer: "#slider",
		animationDuration: 700,
		start: function(slider){
        	var defaultwidth = $(slider).find("ul li:last-child").width();
			var defaultheight = $(slider).find("ul li:last-child").height();
			var resizeamount = defaultwidth/$(slider).width();
			var resizedwidth = $(slider).width();
			var resizedheight = Math.round(defaultheight/resizeamount);
			//$(slider).parent('#slider').css({ 'height': resizedheight+'px' });
		},
		before: function(slider) {
			var sliderheight = $(slider).find("li:eq("+(slider.animatingTo+1)+")").height();
			//$(slider).parent('#slider').animate({ 'height': sliderheight+'px' }, 500, $easingType);
      	}
	});
	
	$(content+' .slidercontent .flexslider').flexslider({
		animation: "slide",
		slideshow: false,
		controlsContainer: "#slider",
		animationDuration: 700,
		start: function(slider){
			var defaultwidth = $(slider).find("ul li:last-child").width();
			var defaultheight = $(slider).find("ul li:last-child").height();
			var resizeamount = defaultwidth/$(slider).width();
			var resizedwidth = $(slider).width();
			var resizedheight = Math.round(defaultheight/resizeamount);
			$(slider).parent('#slider').css({ 'height': resizedheight+'px' });
		},
		before: function(slider) {
			var sliderheight = $(slider).find("li:eq("+(slider.animatingTo+1)+")").height();
			$(slider).parent('#slider').animate({ 'height': sliderheight+'px' }, 500, $easingType);
			// adapt to the #animationsection if is parent
			var sidebarheight = $(slider).closest('#pageloader').find('#sidebar').height() + parseFloat($(slider).closest('#pageloader').find('#sidebar').css('paddingTop')) + parseFloat($(slider).closest('#pageloader').find('#sidebar').css('paddingBottom')) ;
			var paddings = parseFloat($(slider).closest('#pageloader').css('paddingTop')) + parseFloat($(slider).closest('#pageloader').css('paddingBottom'));
			var sectionheight = paddings + sliderheight;
			if ((sidebarheight+paddings) < sectionheight) { resizeheight = sectionheight; } else { resizeheight = sidebarheight+paddings; }
			if ($(window).width() < 768) { resizeheight =  paddings+sidebarheight+sliderheight;}
			$(slider).closest('#animationsection').animate({ 'height': resizeheight+'px' }, 500, $easingType);
      	}
	});
	
	
	
	
	/*---------------------------------------------- 
				   I M G   H O V E R
	------------------------------------------------*/
	/* SETTINGS */
	var hoverFade = 300;	
		
	// check if .overlay already exists or not
	$('.imgoverlay a').each(function(index){
		if($(this).find('.overlay').length == 0) { 
			$(this).append('<div class="overlay"></div>');
			//$(this).append('<div class="overlay"><span>Text</span></div>');
			$(this).find('.overlay').css({ opacity: 0 });
		} 										
	});
	
	$(content+' .imgoverlay').hover(function(){
		$(this).find('.overlay').animate({ opacity: 0.4 }, hoverFade);
		//$(this).find('.overlay span').animate({ top: '50%', opacity: 1 }, 200, $easingType);
	}, function(){
		$(this).find('.overlay').delay(200).animate({ opacity: 0 }, hoverFade);
		/*$(this).find('.overlay span').animate({ top: '100%', opacity: 0 }, 200, $easingType, function(){
			$(this).css({top:'0%'});																				  
		});*/
	});
	
	
		
	
	/*---------------------------------------------- 
				   F A N C Y B O X
	------------------------------------------------*/
	$(content+' .openfancybox').fancybox();
	
		
	
	/*---------------------------------------------- 
				      T O G G L E 
	------------------------------------------------*/	
	$(content+" .toggle_title a").click(function() { 
		
		var status = $(this).find('span').html();
		if (status == '+') { $(this).find('span').html('-'); } else { $(this).find('span').html('+'); }
		
		$(this).toggleClass('active');
		$(this).parent().siblings('.toggle_inner').slideToggle(300);
		return(false);
	});
	
	

} // END function initialise()