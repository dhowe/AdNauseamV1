var options; 

$(document).ready(function(){

	$("#adn-enabled").click(toggleEnabled);
	$("#adn-menu-info").click(showAdView);
	$("#adn-menu-help").click(showHelp);
	$("#adn-menu-log").click(showLog);

});

function showHelp() {
	
	//console.log("Menu::showHelp");
	addon.port.emit("ADNShowHelp");
	// CHANGE TO: 
}

function showLog() {
		
	//var w = window.open("file://"+options.logFile);
	//console.log("Menu::showLog"); 
	//addon.port.emit("ADNCloseMenu");
	// CHANGE TO: 
	addon.port.emit("ADNShowLog");
}

function showAdView() {
	
	//console.log("Menu::showInfo");
	addon.port.emit("ADNShowAdView"); // move close-menu into main::showAdView() 
//	addon.port.emit("ADNCloseMenu");
}

function toggleEnabled() {
	
	// move to adnoptions.js
	
	//console.log("Menu::toggleOnOff");
	
	options.enabled = !options.enabled;
	
	var wrapper = { "options" : options };
	
	addon.port.emit("ADNSaveOptions", wrapper.options);
	
	updateMenu(wrapper);
	
	addon.port.emit("ADNCloseMenu");
}

// ====================================================================

function updateMenu(json) {

	options = json.options;
	
	//console.log("Menu::updateMenu()->enabled="+options.enabled);

	if (options.enabled) {

		$("#adn-enabled").html('disable');
		$("#adn-img-enabled").attr("src", "img/off_icon.png");
	} 
	else {
		
		$("#adn-enabled").html('enable');
		$("#adn-img-enabled").attr("src", "img/on_icon.png");
	}
}

addon.port.on("ADNSendOptions", updateMenu);
