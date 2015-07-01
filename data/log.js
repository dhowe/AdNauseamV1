self.port && self.port.on('show-log', function(payLoad) {
	
	initLog(payLoad);
});
self.port && self.port.on('add-log-entry', function(payLoad) {
	
	addLogEntry(payLoad);
});
self.port && self.port.on('add-log-path', function(payLoad) {
	
	addLogPath(payLoad);
});

function initLog(log) {
	
	for (var i in log) {
		
		if ( i == 0 && ( log[i].i == 0 ) )
			$('#content').html("");
			
		var $entry = $('<span>', {

			text: deleteExtraChars(log[i].msg)
		}).append("</br>");
		
		$('#content').prepend( $entry );
	}
}

function deleteExtraChars(text) {
	
	// needs better handling of the Option entry
	return text.replace(/\n(.*)/g, "");
}

function addLogEntry(log) {
	
	// delete extra log entry
	if ( $('#content').children().length > 100 )
		$('#content').find(":first-child").remove();
	// delete "no log available" message
	else if ( $('#content').children().length == 0 )
		$('#content').html("");

	var $entry = $('<span>', {

		text: deleteExtraChars(log[log.length - 1].msg)
	}).append("</br>").hide();

	$('#content').prepend($entry);
	
	$entry.fadeIn(2500);
}

function addLogPath(url) {
	
	$('<a>', {
		text: 'Log File',
		href: url,
		target: 'logFile'
	}).appendTo('#logFilePath');
}