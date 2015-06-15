var logJSON = self.options && self.options.logJSON;

self.port && self.port.on('show-log', showLog);

function showLog() {
	console.log("logJSON from log.js", logJSON);
}
