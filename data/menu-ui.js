$(document).ready(function() { 
		
	$('#log-button').unbind().click(function() {
		//console.log('#log-button.click');
		self.port && self.port.emit('show-log');
	});
	
	$('#clear-ads').unbind().click(function(e) {
		
		e.preventDefault();
		
		console.log('#clear-ads.click');
		
		$('.ad-item').remove();
		$('.ad-item-text').remove();
		
		$("#settings-close").trigger( "click" );
		
		// call addon to clear simple-storage
		self.port && self.port.emit("clear-ads");
	});

	$('#vault-button').unbind().click(function() {
		//console.log('#vault-button.click');
		if (self.port) {
			
			self.port.emit('show-vault');
		}
		else {
			console.log('vaulr');
			window.location.href = 'advault.html';
		}
	});

	$('#pause-button').unbind().click(function() {
		//console.log('#pause-button.click');
		self.port && self.port.emit('disable');
	});

	$('#settings-close').unbind().click(function() {

		//console.log('#settings-close.click');

		$('.page').toggleClass('hide');
		$('.settings').toggleClass('hide');

		self.port && self.port.emit('hide-settings');
	});

	$('#settings-open').unbind().click(function() {

		//console.log('#settings-open.click');

		$('.page').toggleClass('hide');
		$('.settings').toggleClass('hide');

		self.port && self.port.emit('show-settings');
	});

	$('#about-button').unbind().click(function() {
		//console.log('#about-button.click');
		self.port && self.port.emit('show-about');
	});

	$('#cmn-toggle-1').unbind().click(function() {
		
		var val = $(this).prop('checked'); 
		
		//console.log('#disable-logs.click: '+val);
		self.port && self.port.emit('disable-logs', { 'value' : val });
	}); 
});