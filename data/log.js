self.port && self.port.on('show-log', function(payLoad) { initLog(payLoad); });
self.port && self.port.on('add-log-entry', function(payLoad) { addLogEntry(payLoad); });
self.port && self.port.on('add-log-path', function(payLoad) { addLogPath(payLoad); });

const TAB = '&emsp;&emsp;&emsp;&emsp;', BR = '<br/>';

function initLog(log) {

	clearDefaultMsg();

	var $div = $('<div/>', { id: 'logview' });
	for (var i in log) {

		$('#content').prepend(formatEntry(log[i]));
	}
}

function formatEntry(entry) {

	var $entry = $('<div/>', { class: 'logentry' });

	$('<span/>', {

		class: 'logtime',
		html: formatDateStamp(entry.time)

	}).appendTo($entry);

	$('<span/>', {

		class: 'logtext',
		html: convertSpace(entry.text)

	}).appendTo($entry);

	return $entry;
}

function formatDateStamp(ds) {

	return '[' + new Date(ds).toUTCString() + '] ';
}

function convertSpace(text) {

	if (!(text && text.length)) {

		console.log('\nBad log text: '+typeof text, text);
		return '';
	}

	return text.replace(/\n/g, BR).replace(/\t/g, TAB);
}

function addLogEntry(log) {

	clearDefaultMsg();

	var logEntry = log[log.length - 1],
		$entry = formatEntry(logEntry);

	$entry.hide();

	$('#content').prepend($entry);

	$entry.fadeIn(1500);
}

function addLogPath(url) {

	$('<a>', {

		href: url,
		text: 'Log File',
		target: 'logFile'

	}).appendTo('#logpath');
}

// Remove "no log available" message before showing log
function clearDefaultMsg() {

	if ($('#content').children().length == 0)
		$('#content').empty();
}
