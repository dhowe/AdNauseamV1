//const { Cc, Ci, Cu } = require("chrome");

const { Component } = require("./adncomp");
const { components } = require("chrome");
const { Options } = require("./adnoptions");
const { Logger, LogFile } = require("./adnlogger");
const { data } = require("sdk/self");
const tabs = require("sdk/tabs");

var widget = require("adnwidgetXUL").Widget();
			
    // id: "adnwidget",
    // label: "AdNauseam",
    // tooltiptext: "AdNauseam",
    // image: buttonIcon(),

		
function showAdView() { 

	var ads = require("./adncomp").Component.parser.getAds();
	
	if (!ads || !ads.length) { 
		
		Logger.notify("No ads detected thus far...");
		return;
	}
	
	Options.openInTab(data.url("adview.html"));
}

function toggleEnabled() {
	
	Options.toggle('enabled');

	updateMenu();
}

function updateMenu() {
	
	updateButton();
	
    //menu.port.emit("ADNUpdateMenu", Options.toJSON());  // NEED?
}

function updateButton() {
	
	if (widget && widget.button)
		widget.button.setAttribute( "image", buttonIcon());
		
	if (widget && widget.menuEnabled) 
		widget.menuEnabled.setAttribute( "label", toggleLabel());
}
  
function buttonIcon() {
	
	return (Options && Options.enabled)
		? data.url('img/adn.png') 
		: data.url('img/adng.png');
}

function toggleLabel() {
	
	return (Options && Options.enabled) ? 'Disable' : 'Enable';
}


