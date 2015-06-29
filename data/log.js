self.port && self.port.on('show-log', function(payLoad) {
	
	// console.log("logJSON from log.js: ", payLoad);
	printLog(payLoad);
});

function printLog(log) {
	
	for (var i in log) {
		
		if ( i == 0 && ( log[i].i == 0 ) )
			$('#content').html("");
			
		$('#content').append( log[i].msg + "</br>" );
		
		window.scrollTo(0, document.body.scrollHeight);
	}
}
