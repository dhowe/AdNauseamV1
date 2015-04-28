/* handles registering and callbacks for generic events */

/*global Services */

const { Ci, Cu } = require("chrome");

Cu.import('resource://gre/modules/Services.jsm');

require("sdk/system/events").on("http-on-modify-request", onModifyRequest);
require("sdk/system/events").on("http-on-examine-response", onExamineResponse);
require("sdk/system/events").on("browser:purge-session-history", onClearHistory);
require("sdk/tabs").on("activate", onActivateTab);

var pmOpts = {

        include: "*", // All DOM windows (ie. all pages + all iframes)

        contentScriptWhen: "start", // only document head here

        attachTo: 'top', // ignore iframes here

        onAttach: function onAttach(worker) {

            var parser = require("./adncomp").Component.parser;
            if (worker.tab.url == worker.url) { // if at top level

                parser.onAttach(worker.tab);
            }
            worker.destroy(); // cleanup the attached worker
        }
    };
    
require("sdk/page-mod").PageMod(pmOpts);


// *********************************************************
// Hack to eliminate multiple attaching of top-level page by
// calling another pageMod for iframes (and ignoring non-iframes)
//
// TODO: must be a better way to do this--post as question somewhere

pmOpts.attachTo = 'frame';
pmOpts.onAttach = function(worker) {

    if (worker.tab.url != worker.url) { // if at top level

        //console.log("ATTACH-IFRAME: "+worker.url+"\n\t\tto "+worker.tab.url);
        require("./adncomp").Component.parser.pageMap[worker.url] = {

            parent: worker.tab.url
        };
    }

    worker.destroy(); // cleanup the attached worker
};
require("sdk/page-mod").PageMod(pmOpts);

// *********************************************************

/*function onQuitApplication(event) {

    console.log('onQuitApplication: ' + exiting);

    exiting = true;

    console.log('onQuitApplication2: ' + exiting);
}
*/

function onActivateTab() { 

    var uiman = require("./uiman").UIManager;
    uiman.updateBadge();
    uiman.updateMenu(); 
}

function onClearHistory(event) {

    if (require("./options").Options.get("clearAdsWithHistory")) { // TODO: localize

        require("./logger").Logger.log('UI->clear-ads-with-history');
        require("./adncomp").Component.parser.clearAds();
    }
}

function onModifyRequest(event) {

    if (isAdnWorker(event)) {

        var httpChannel = event.subject.QueryInterface(Ci.nsIHttpChannel),
            url = httpChannel.URI.spec,
            origUrl = httpChannel.originalURI.spec,
            parser = require("./adncomp").Component.parser;

        parser.visitor.beforeLoad(httpChannel, event.subject, url, origUrl);
    }
}

function onExamineResponse(event) {

    if (isAdnWorker(event)) {

        var httpChannel = event.subject.QueryInterface(Ci.nsIHttpChannel),
            url = httpChannel.URI.spec,
            origUrl = httpChannel.originalURI.spec,
            parser = require("./adncomp").Component.parser;

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
                return request.notificationCallbacks.getInterface(Ci.nsILoadContext).associatedWindow;
            }
        } catch (e) {}

        try {
            if (request.loadGroup && request.loadGroup.notificationCallbacks) {
                return request.loadGroup.notificationCallbacks.getInterface(Ci.nsILoadContext).associatedWindow;
            }
        } catch (e) {}
    } else {

        require("./adnutil").AdnUtil.warn("request !instanceof Ci.nsIRequest!");
    }

    return null;
}