require("sdk/preferences/service").set("javascript.options.strict", false); // remove for prod

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
};

exports.onUnload = function(reason) {

    if (1) console.log("Main::onUnload() -> "+reason);

    require("./ff/abpcomp").Component.stop(reason);
};

// Test AdVault immediately with test-data
if (0) {
	
	var ads = require('./test/test-ad-data').ads; 
	require("sdk/tabs").open({
	
	    url: require("sdk/self").data.url("advault.html"),
	
	    onReady:function(tab){
	
	        worker = tab.attach({
	            contentScriptFile:[ data.url("adinject.js") ],
	        });
	        
			worker.port.emit("refresh-ads", { "ads": ads });
	    }
	});
}