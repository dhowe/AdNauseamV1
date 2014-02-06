//const { Cc, Ci, Cu } = require("chrome");

const { Component } = require("./adncomp");
const { Options } = require("./adnoptions");
const { Logger, LogFile } = require("./adnlogger");
const { data } = require("sdk/self");
const tbb = require("tbb/toolbarbutton");
const tabs = require("sdk/tabs");

/////////////// Button-Menu ///////////////

let menu = require("sdk/panel").Panel({
	
    width:90,
    height:95, 
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


/////////////// Adn-Button /////////////////

let button = tbb.ToolbarButton({
		
    id: "adn-button",
    label: "AdNauseam",
    tooltiptext: "AdNauseam",
    image: buttonIcon(),
    panel: menu
 });
     
button.update = updateButton;


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
	
	menu.hide();
	
	if (Options.disableLog || !Logger.ostream) {
		
		Logger.notify("No log available (AdNauseam is disabled or" 
			+" the 'disableLogs' preference is checked)"); // TODO: localize
	}
	else { 
		
		Options.openInTab("file://" + LogFile);
	}
}

function updateMenu() {
	
	updateButton();
	
    menu.port.emit("ADNUpdateMenu", Options.toJSON()); 
}

function hideMenu() { menu.hide(); }

//function hideAdView() { adview.hide(); }

function showAdView() { 
	
	menu.hide();
	
	var ads = require("./adncomp").Component.parser.getAds();
	
	if (!ads || !ads.length) { 
		
		Logger.notify("No ads detected thus far...");
		return;
	}
	
	Options.openInTab(data.url("adview.html"));
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

function buttonIcon() {
	
	return (Options && Options.enabled)
		? data.url('img/adn.png') 
		: data.url('img/adng.png');
}

function updateButton() {
	
	if (button) {
		
    	button.contentURL = buttonIcon();
    	var delegate = button.delegate();
    	if (!delegate)
    		Logger.log("No Button delegate!");
    	delegate && delegate.setAttribute( "image", button.contentURL);
    }
}

function onTabLoaded(tab) { // NOT USED AT MOMENT

	console.log("TAB-LOADED: " + tab.url + " TAB: #" +tab.id+"/"+tab.title);
}

exports.Button = button;
