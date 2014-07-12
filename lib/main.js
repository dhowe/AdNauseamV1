/* TODO
 *
 * Pages: 
 *      identify all ads loaded for a given page, when it is completely loaded (show count in notify/widget)
 * 
 * Alerts
 *      on save of inconsistent options	(both-ways)
 * 
 * Interface
 * 
 * 		Ad visualization w' history
 * 
 * 		Show number of ads on current page (on widget)
 * 
 * 		Check/respect 'private-browsing'
 * 
 * Logs
 * 		Need to truncate log at some point
 */

const { Cc, Ci, Cu } = require("chrome");
const { Logger } = require("./adnlogger");
const { Component, Id } = require("./adncomp");

require("sdk/system/events").on("http-on-modify-request",  onModifyRequest);
require("sdk/system/events").on("http-on-examine-response", onExamineResponse);
require("sdk/windows").browserWindows.on('open', updateInterface);
require("sdk/windows").browserWindows.on('activate', updateInterface);

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

function updateInterface(event) {
	
	require("./adnviews").Button.update();
}

exports.onUnload = function(reason) {
	
	if (1) console.log("Main::onUnload() -> "+reason);
	
	Component.stop(reason);
};	

exports.main = function(options, callbacks) {
	
	if (1) Logger.log("Main::main() -> "+options.loadReason);	
	
	// Create and register the AdnComp(onent) via the contract ID
	require('sdk/platform/xpcom').Service
		({ contract: Id, Component: function() { return Component; }});
	
	if (options.loadReason == "install" || options.loadReason == "downgrade") {
		
		// CHECK: ADNVIEWS
        require("./adnviews").Button.moveTo({
            toolbarID: "nav-bar",
            forceMove: true
        });
    }
    else if (options.loadReason == "enable") {
    	
    	Component && (Component.restart(options.loadReason));
    }    
    
   	// cleanup any left over adn-tabs
   	var tabs = require("sdk/tabs");
  	for each (var tab in tabs) {
    	if (/adview.html$/.test(tab.url) || /adnauseam.log$/.test(tab.url)) {
    		tab.unpin();
    		tab.close();
    	}
	}
};
