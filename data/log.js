self.port && self.port.on('show-log', function(payLoad) { initLog(payLoad); });
self.port && self.port.on('add-log-entry', function(payLoad) { addLogEntry(payLoad); });
self.port && self.port.on('add-log-path', function(payLoad) { addLogPath(payLoad); });

function initLog(log) {
	
	for (var i in log) {
		
		if ( i == 0 && ( log[i].i == 0 ) )
			$('#content').html("");
			
		var $entry = $('<div>' + convertWhiteSpace(log[i].msg) + '</div');
		
		$('#content').prepend( $entry );
	}
}

function convertWhiteSpace(text) {
	
	// Uses 4 '&emsp;' as a Tab char
	return text.replace(/\n/g, "<br>").replace(/\t/g, "&emsp;&emsp;&emsp;&emsp;");
}

function addLogEntry(log) {
	
	// Delete extra log entry
	if ( $('#content').children().length > 100 )
		$('#content').find(":first-child").remove();
	// Delete "no log available" message
	else if ( $('#content').children().length == 0 )
		$('#content').html("");

	var $entry = $('<div>' + convertWhiteSpace(log[log.length - 1].msg) + '</div>').hide();

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