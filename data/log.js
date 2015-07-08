self.port && self.port.on('show-log', function(payLoad) {
  initLog(payLoad);
});
self.port && self.port.on('add-log-entry', function(payLoad) {
  addLogEntry(payLoad);
});
self.port && self.port.on('add-log-path', function(payLoad) {
  addLogPath(payLoad);
});

const TAB = '', BR = '<br/>';

function initLog(log) {

	clearDefaultMsg();

	$('#x-close-button').click(function(e) {

		e.preventDefault();
		self.port && self.port.emit("close-log");
	});

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

	return '[' + ds + '] ';
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

	$('#logpath').attr('href', url);
}

// Remove "no log available" message before showing log
function clearDefaultMsg() {

	if ($('#content').children().length == 0)
		$('#content').empty();
}
