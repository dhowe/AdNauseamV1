//const { Cc, Ci, Cu } = require("chrome");
const { Component } = require("./adncomp");
const { Options } = require("./adnoptions");
const { Logger, LogFile } = require("./adnlogger");
const { data } = require("sdk/self");
const tabs = require("sdk/tabs");

/////////////// MENU /////////////////

let menu = require("sdk/panel").Panel({
	
    width:110,  // 100 for 3 items
    height:110, // 100 for 3 items
    contentURL: data.url("menu.html"),
    onShow: updateMenu,
});


menu.port.on("ADNToggleEnabled",toggleEnabled); 
menu.port.on("ADNShowAdView", 	showAdView);
menu.port.on("ADNCloseMenu", 	hideMenu);
menu.port.on("ADNShowHelp", 	showHelp);	
menu.port.on("ADNShowLog", 		showLog);
menu.port.on("ADNNotify",  		doNotify);
menu.port.on("ADNAlert",  		doAlert);

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

function toggleEnabled() {
	
	Options.toggle('enabled');

	updateMenu();
		
	menu.hide();
}
   
function showHelp() {
	
	Options.openInTab("http://www.rednoise.org/adnauseam/help.html");
	
	menu.hide();
}

function showLog() { // TODO: update logs every second while open
	
	if (Options.disableLog || !Logger.ostream) {
		
		Logger.notify("No log available (Ad Nauseam is disabled or" 
			+" the 'disableLogs' preference is checked)"); // TODO: localize
	}
	else { 
		
		Options.openInTab("file://" + LogFile);
	}
	
	menu.hide(); 
}

function updateMenu() {
	
	updateWidget();
	
    menu.port.emit("ADNUpdateMenu", Options.toJSON()); 
}

function hideMenu() { menu.hide(); }

function hideAdView() { adview.hide(); }
    
function showAdView() { // TODO: should use adn-tab instead
 	
	menu.hide();

 	if (Options.enabled) {
 	
		var browser = require('sdk/window/utils').getMostRecentBrowserWindow(),
			allAds = require("./adncomp").Component.parser.getAds(),
			//adlookup[tabs.activeTab.url],
			pHeight = browser.content.window.innerHeight - 15,
			pWidth = browser.content.window.innerWidth - 4;
	}
	
	if (!allAds || !allAds.length) { 
		Logger.notify("\nNo ads detected so far...");
		return;
	}
	
	adview.contentURL = data.url("adview.html");
	 
	adview.port.emit("ADNUpdateAdView", { 
		
		ads: allAds,
		width: pWidth,
		height: pHeight,
		page: tabs.activeTab.url
		//lookup: Component.parser.adlookup 
	});
	
	adview.resize(pWidth, pHeight);
	adview.show();
}

function doNotify(options) {
	
	if (!options || !options.message)
		Logger.err("Bad call to notify()");
	
	var title = options.title || null;
	
	Logger.notify(options.message, title);
}

function doAlert(options) {
	
	if (!options || !options.message)
		Logger.err("Bad call to alert()");
	
	var title = options.title || null;
	
	Logger.alert(options.message, title);
}

function widgetIcon() {
	
	return (Options && Options.enabled) 
		? data.url('img/adn.png') 
		: data.url('img/adng.png');
}

function updateWidget() {
	
    widget.contentURL = widgetIcon();
}

function onTabClosed(theTab) { // NOT USED AT MOMENT
	
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
	
function onTabLoaded(tab) { // NOT USED AT MOMENT

	console.log("TAB-LOADED: " + tab.url + " TAB: #" +tab.id+"/"+tab.title);
}

exports.updateWidget = updateWidget;    
exports.widget = widget;
exports.adview = adview;
exports.menu = menu;	

//Logger.log("Main::completed");