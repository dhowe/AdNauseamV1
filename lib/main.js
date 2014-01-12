// NEXT: handle toggle of logsDisable to true, then view-log
// check outlineAds, push

/* TODO
 * Alerts:
 * 		
 * 		on adblock missing or incomp.
 * 		on view-log in disable-log mode
 *      on save of inconsistent options 		
 * 
 * Interface
 * 
 * 		Ad visualizations
 * 
 * 		Show number of ads on current page (on widget)
 * 
 * 		Check/respect 'private-browsing'
 * 
 * Logs
 * 		Check/obey options (disable/persist)  
 */

const { Cc, Ci, Cu } = require("chrome");
const { Logger } = require("./adnlogger");
const { Component, Id } = require("./adncomp");

require("sdk/system/events").on("http-on-modify-request",  onModifyRequest);
require("sdk/system/events").on("http-on-examine-response", onExamineResponse);

function onModifyRequest(event) {

	var httpChannel = event.subject.QueryInterface(Ci.nsIHttpChannel), 
       url = httpChannel.URI.spec, origUrl = httpChannel.originalURI.spec;
    
	if (isAdnWorker(event)) 
		Component.parser.visitor.beforeLoad(event.subject, url, origUrl);
}

function onExamineResponse(event) {
	
	var httpChannel = event.subject.QueryInterface(Ci.nsIHttpChannel), 
        url = httpChannel.URI.spec, origUrl = httpChannel.originalURI.spec;

	if (isAdnWorker(event)) 
		Component.parser.visitor.afterLoad(event.subject, url, origUrl);
}

function isAdnWorker(event) {

    var cHandler, win = windowForRequest(event.subject);

	if (win) cHandler = win.QueryInterface(Ci.nsIInterfaceRequestor)
		.getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell)
		.chromeEventHandler;
		
	return (cHandler && cHandler.hasAttribute("ADN"));
}

function windowForRequest(request) {

	if (request instanceof Ci.nsIRequest) {
		try {
			if (request.notificationCallbacks) {
				return request.notificationCallbacks.getInterface
					(Ci.nsILoadContext).associatedWindow;
			}
		} catch(e) {}

		try {
			if (request.loadGroup && request.loadGroup.notificationCallbacks) {
				return request.loadGroup.notificationCallbacks.getInterface
					(Ci.nsILoadContext).associatedWindow;
			}
		} catch(e) {}
	}
	else {
		console.warn("request !instanceof Ci.nsIRequest!");
	}

	return null;
}

exports.onUnload = function(reason) {
	
	if (0) console.log("Main::onUnload() -> "+reason);
	
	Component.stop();
};

exports.main = function(options, callbacks) {
	
	// Create and register the AdnComp(onent) via the contract ID
	require('sdk/platform/xpcom').Service
		({ contract: Id, Component: function() { return Component; }});
	
	if (0) Logger.log("Main::main() -> "+options.loadReason);	
};
