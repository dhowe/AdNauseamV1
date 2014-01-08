
$(document).ready(function(){

	$("#adn-enabled").click(function()   { msg("ADNToggleEnabled"); });
	$("#adn-menu-info").click(function() { msg("ADNShowAdView"); });
	$("#adn-menu-help").click(function() { msg("ADNShowHelp"); });
	$("#adn-menu-log").click(function()  { msg("ADNShowLog"); });
});

function msg(m) { addon.port.emit(m); }

function updateEnabled(options) {

	var enabled = options.enabled;
	
	//console.log("Menu::updateMenu(enabled="+enabled+")");

	if (enabled) {

		$("#adn-enabled").html('disable');
		
		$("#adn-img-enabled").attr("src", "img/off_icon.png");		
	} 
	else {
		
		$("#adn-enabled").html('enable');

		$("#adn-img-enabled").attr("src", "img/on_icon.png");
	}
}

addon.port.on("ADNUpdateMenu", updateEnabled);
