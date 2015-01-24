const Ci = require("chrome").Ci;

require("sdk/system/events").on("http-on-modify-request", onModifyRequest);
require("sdk/system/events").on("http-on-examine-response", onExamineResponse);

require("sdk/page-mod").PageMod({
    
    include: "*", // All DOM windows (ie. all pages + all iframes)
    
    contentScriptWhen: "start", // only document head here
                                
    attachTo: 'top', // ignore iframes here
     
    onAttach: function onAttach(worker) {
        
            if (worker.tab.url == worker.url) { // if at top level
                
                require("./abpcomp").Component.parser.onAttach(worker.tab);
            }
                
            worker.destroy(); // cleanup the attached worker
        }
    }
);

function onModifyRequest(event) {

	if (isAdnWorker(event)) {
		
		var httpChannel = event.subject.QueryInterface(Ci.nsIHttpChannel), 
            url = httpChannel.URI.spec, origUrl = httpChannel.originalURI.spec,
            parser = require("./abpcomp").Component.parser;

		parser.visitor.beforeLoad(httpChannel, event.subject, url, origUrl);
	}
}

function onExamineResponse(event) {
	
	if (isAdnWorker(event))  {
	    
        var httpChannel = event.subject.QueryInterface(Ci.nsIHttpChannel), 
            url = httpChannel.URI.spec, origUrl = httpChannel.originalURI.spec,
            parser = require("./abpcomp").Component.parser;
		 
		parser.visitor.afterLoad(httpChannel, event.subject, url, origUrl);
	}
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
