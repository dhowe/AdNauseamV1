const { Cc, Ci, Cu } = require("chrome");
const { Options } = require("./adnoptions");
const { Component } = require("./adncomp");
const { data } = require("sdk/self");
const tabs = require("sdk/tabs");

/////////////// MENU /////////////////

let menu = require("sdk/panel").Panel({
	
    width:110,  // 100 for 3 items
    height:110, // 100 for 3 items
    contentURL: data.url("menu.html"),
    onShow: sendOptions,
});

menu.port.on("ADNSaveOptions",  saveMenuState); 
menu.port.on("ADNShowAdView", 	showAdView);
menu.port.on("ADNCloseMenu", 	hideMenu);
menu.port.on("ADNShowHelp", 	showHelp);	
menu.port.on("ADNShowLog", 		showLog);

exports.menu = menu;	

/////////////// WIDGET /////////////////

let widget = require("sdk/widget").Widget({
	
	id: "adn-widget",
	label: "Ad Nauseam",
	panel: menu,
	contentURL: widgetIcon(),
    contentScriptWhen: 'ready',
    contentScriptFile: data.url('widget.js')
});

widget.port.on('right-click', function() {});


/////////////// ADVIEW /////////////////

let adview = require("sdk/panel").Panel({
	
	contentURL : data.url("adview.html"),
});

adview.port.on("ADNCloseAdView", hideAdView); 


/////////////// FUNCTIONS /////////////////
   
function showHelp() {
	
	Options.openInTab("http://www.rednoise.org/adnauseam/help.html");
	menu.hide();
}

function showLog() { // TODO: update logs every second while open
	
	Options.openInTab("file://"+Options.logFile);
	menu.hide();
}

function showAdView() {
	
	menu.hide();
	updateAdView();
}

function sendOptions() {
	
    menu.port.emit("ADNSendOptions", { "options": Options.toJSON() }); 
}

function hideMenu() { menu.hide(); }

function hideAdView() { adview.hide(); }
    
function updateAdView() { // TODO: should use adn-tab instead
 	
	var browser = require('sdk/window/utils').getMostRecentBrowserWindow(),
		ads = Component.parser.adlookup[tabs.activeTab.url],
		pWidth = browser.content.window.innerWidth - 4, 
		pHeight = browser.content.window.innerHeight - 15;
	
	adview.contentURL = data.url("adview.html");
	 
	adview.port.emit("ADNUpdateAdView", { 
		
		width: pWidth,
		height: pHeight,
		page: tabs.activeTab.url,
		lookup: Component.parser.adlookup 
	});
	
	if (!ads) { 
		pHeight = 100;
		pWidth = 300;
	}
	
	adview.resize(pWidth, pHeight);
	adview.show();
}

function saveMenuState(options) {
	
	Options.saveOptions(options);
	widget.contentURL = widgetIcon();
}

function widgetIcon() {
	return (Options && Options.enabled) 
		? data.url('img/adn.png') 
		: data.url('img/adng.png');
}

function onModifyRequest(event) {

   var httpChannel = event.subject.QueryInterface(Ci.nsIHttpChannel), 
       origUrl = httpChannel.originalURI.spec;
    
	var url = checkForAdnWorker(event); 
	if (url) Component.parser.visitor.beforeLoad(event.subject, url, origUrl);
}

function onExamineResponse(event) {
	
	var httpChannel = event.subject.QueryInterface(Ci.nsIHttpChannel), 
       origUrl = httpChannel.originalURI.spec;

	var url = checkForAdnWorker(event); 
	if (url) Component.parser.visitor.afterLoad(event.subject, url, origUrl);
}

function checkForAdnWorker(event) {

    var httpChannel = event.subject.QueryInterface(Ci.nsIHttpChannel), 
        url = httpChannel.URI.spec, origUrl = httpChannel.originalURI.spec;
    
    var cHandler, win = windowForRequest(event.subject);

	if (win) cHandler = win.QueryInterface(Ci.nsIInterfaceRequestor)
		.getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell)
		.chromeEventHandler;
		
	return (cHandler && cHandler.hasAttribute("ADN")) ? url : null;
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

function onTabClosed(theTab) { // NOT USED
	
	var url = theTab.url, exists = false, lookup = Component.parser.adlookup;
			
	if (url === 'about:blank') return;

	// see if this url exists in any tab, if not then delete it from table
	for each (var tab in tabs) {
		if (tab != theTab && tab.url == url) {
			exists = true;
			break;
		}
	}
		
	if (!(exists && /^(resource|javascript|about):/i.test(url))) { 
		
		console.log("DELETE: "+url);
		
		if (lookup && lookup[url]) 
			delete lookup[url]; 
	}
}
	
function onTabLoaded(tab) { // NOT USED

	console.log("TAB-LOADED: " + tab.url + " TAB: #" +tab.id+"/"+tab.title);
}
    

//Logger.log("Main::completed");