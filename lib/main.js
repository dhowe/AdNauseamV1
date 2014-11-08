require("sdk/preferences/service").set("javascript.options.strict", false); // remove for prod

//require("sdk/simple-storage").storage.adlookup = {};

require("./ffui/uiman");
require("./ffui/logger");
require("./ff/abpcomp");
require("./ff/detector");

// Test AdVault immediately
if (0) require("./ffui/uiman").UIManager.openAdVault();

exports.main = function(options, callbacks) {	
	
	require("./ffui/logger").Logger.log("Main::main() -> "+options.loadReason);	

	// Create and register our component (abpcomp) via the contract-id
	require('sdk/platform/xpcom').Service
		({ contract: '@rednoise.org/abpcomp', Component: 
			function() { return require("./ff/abpcomp").Component; }});
			
	require("./ffui/uiman").UIManager.cleanupTabs(); // close leftover adn-tabs
};

exports.onUnload = function(reason) {

    if (1) console.log("Main::onUnload() -> "+reason);

    require("./ff/abpcomp").Component.stop(reason);
};



