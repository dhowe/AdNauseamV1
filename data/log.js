self.port && self.port.on('show-log', function(payLoad) { initLog(payLoad); });
self.port && self.port.on('add-log-entry', function(payLoad) { addLogEntry(payLoad); });
self.port && self.port.on('add-log-path', function(payLoad) { addLogPath(payLoad); });

function initLog(log) {

	clearDefaultMsg();

	for (var i in log) {

		var $entry = $('<div>' + convertWhiteSpace(log[i]) + '</div');

		$('#content').prepend($entry);
	}
}

function convertWhiteSpace(text) {
	
	// Uses 4 '&emsp;' as a Tab char
	return text.replace(/\n/g, "<br>").replace(/\t/g, "&emsp;&emsp;&emsp;&emsp;");
}

function addLogEntry(log) {
	
	clearDefaultMsg();

	var $entry = $('<div>' + convertWhiteSpace(log[log.length - 1]) + '</div>').hide();

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

// Delete "no log available" page message before printing logJSON
function clearDefaultMsg() {

	if ($('#content').children().length == 0)
		$('#content').html("");
}