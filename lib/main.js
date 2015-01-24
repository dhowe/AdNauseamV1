const Cc = require("chrome").Cc, Ci = require("chrome").Ci;
const UIManager = require("./ff/uiman").UIManager;
const Logger = require("./ff/logger").Logger;

require("./ff/abpcomp");
require("./ff/httpevents");

exports.main = function(options, callbacks) {	

	Logger.log('Main::main() -> '+options.loadReason + (UIManager.cfx ? ' [cfx]' : '')); 	

	// Create and register our component (abpcomp) via the contract-id
	require('sdk/platform/xpcom').Service
		({ contract: '@rednoise.org/abpcomp', Component: 
			function() { return require("./ff/abpcomp").Component; }});
			
	UIManager.cleanupTabs(); // close leftover adn-tabs

    if (options) { // check for first-install
        
        switch(options.loadReason) {

            case "install":
            case "upgrade":
            case "downgrade":
            
                UIManager.openFirstRun();       
                break;
        }
    }
    
    if (UIManager.cfx && require('./config').PARSER_TEST_MODE) {

        if (require('./config').PARSER_TEST_MODE != 'clear') {
            
            var path = require('./config').PARSER_TEST_ADS;
            console.log("Loading Test Ads: "+path); 
            var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
            file.initWithPath(path); 
            UIManager.importAds(file);
            require("./ff/vaultman").VaultManager.openVault(); // open vault at start
        }
    }
}

exports.onUnload = function(reason) {

    if (1) console.log("Main::onUnload() -> "+reason);

    require("./ff/abpcomp").Component.stop(reason);
};



// var Data = require("sdk/self").data;
// var pageMod = require("sdk/page-mod");
// pageMod.PageMod({
  // include: [ "*.google.com", "*.google.com.hk" ], 
  // //contentScriptWhen: 'ready',
  // contentScriptFile: [ Data.url("lib/jquery-1.10.2.min.js"), Data.url("elemhide.js") ]
// });
