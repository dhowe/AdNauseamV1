/* TODO
 * 
 * PageWorker
 * 
 * 		Ad visualizations (2)
 * 
 * Interface
 * 
 * 		Show number of ads on current page (on widget)
 * 
 * 		Check/respect 'private-browsing'
 * 
 * Logs
 * 		Check/obey options (disable/persist)  
 */

const { Cc, Ci, Cu } = require("chrome");
const { Component, Getter, Id } = require("./adncomp");
const { Menu, Widget, Adview } = require("./adnviews");

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
		Logger.log("request !instanceof Ci.nsIRequest!");
	}

	return null;
}

exports.onUnload = function(reason) {
	
	// Logger.log("Main::onUnload() -> "+reason);
	
	Component.stop();
};

exports.main = function(options, callbacks) {
	
	// Create and register the AdnComponent via contract ID
	require('sdk/platform/xpcom').Service({ contract: Id, Component: Getter });
	
	//Logger.log("Main::main() -> "+options.loadReason);	
};

//Logger.log("Main::completed");