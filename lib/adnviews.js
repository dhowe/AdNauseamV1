const { Cc, Ci, Cu } = require("chrome");
const { Options } = require("./adnoptions");
const { Logger, LogFile } = require("./adnlogger");
const { Component } = require("./adncomp");
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

function toggleEnabled() {
	
	Options.toggle('enabled');

	widget.contentURL = widgetIcon();
	
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

function showAdView() {
	
	menu.hide();
	updateAdView();
}

function updateMenu() {
	
    menu.port.emit("ADNUpdateMenu", Options.toJSON()); 
}

function hideMenu() { menu.hide(); }

function hideAdView() { adview.hide(); }
    
function updateAdView() { // TODO: should use adn-tab instead
 	
 	if (Options.enabled) {
 	
		var browser = require('sdk/window/utils').getMostRecentBrowserWindow(),
		ads = Component.parser.adlookup[tabs.activeTab.url],
		pHeight = browser.content.window.innerHeight - 15,
		pWidth = browser.content.window.innerWidth - 4;
	}
	
	if (!ads) { 
		Logger.notify("\nNo ads detected so far...");
		return;
	}
	
	adview.contentURL = data.url("adview.html");
	 
	adview.port.emit("ADNUpdateAdView", { 
		
		width: pWidth,
		height: pHeight,
		page: tabs.activeTab.url,
		lookup: Component.parser.adlookup 
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
    

//Logger.log("Main::completed");