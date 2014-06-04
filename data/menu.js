
$(document).ready(function(){

	$("#adn-enabled").click(function()   { msg("ADNToggleEnabled"); });
	$("#adn-menu-info").click(function() { msg("ADNShowAdView"); });
	$("#adn-menu-help").click(function() { msg("ADNShowHelp"); });
	$("#adn-menu-log").click(function()  { msg("ADNShowLog"); });
});

var pad1 = '&nbsp;&nbsp;&nbsp;', pad2 = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
//for key-accels: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';

function msg(m) { addon.port.emit(m); }

function updateEnabled(options) {

	var enabled = options.enabled;
	
	if (enabled) {

		$("#adn-enabled").html('Disable');
		
		$("#adn-img-enabled").attr("src", "img/off_icon.png");		
	} 
	else {
		
		$("#adn-enabled").html('Enable');

		$("#adn-img-enabled").attr("src", "img/on_icon.png");
	}
}

addon.port.on("ADNUpdateMenu", updateEnabled);
