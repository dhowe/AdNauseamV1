const Cc = require("chrome").Cc, Ci = require("chrome").Ci;

const UIManager = require("./ffui/uiman").UIManager;
const Logger = require("./ffui/logger").Logger;
require("./ff/abpcomp");
require("./ff/detector");

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
    
    if (UIManager.mode && require('./config').PARSER_TEST_MODE) {

        if (require('./config').PARSER_TEST_MODE != 'clear') {
            
            console.log("Loading Test Ads: "+path);
            var path = require('./config').PARSER_TEST_ADS; 
            var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
            file.initWithPath(path); 
            require("./ff/abpcomp").Component.parser.importAds(file);
            require("./ffui/uiman").UIManager.openVault(); // open vault at start
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
