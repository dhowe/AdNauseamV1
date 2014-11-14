const Cc = require("chrome").Cc, Ci = require("chrome").Ci;

require("sdk/preferences/service").set("javascript.options.strict", false); // remove for prod

require("./ffui/uiman");
require("./ffui/logger");
require("./ff/abpcomp");
require("./ff/detector");

exports.main = function(options, callbacks) {	
	
	require("./ffui/logger").Logger.log("Main::main() -> "+options.loadReason);	

	// Create and register our component (abpcomp) via the contract-id
	require('sdk/platform/xpcom').Service
		({ contract: '@rednoise.org/abpcomp', Component: 
			function() { return require("./ff/abpcomp").Component; }});
			
	require("./ffui/uiman").UIManager.cleanupTabs(); // close leftover adn-tabs

    if (options) { // check for first-install
console.log(options.loadReason);
        switch(options.loadReason) {

        

        case "install":
        
            console.log("FIRST-INSTALL");
            //require("./ffui/uiman").UIManager.openMenu();
       
            //require('sdk/tabs').open(require("sdk/self").data.url("firstrun.html"));
            //break;
        
        
        case "downgrade":
        
            //console.log("FIRST-INSTALL");
            require("./ffui/uiman").UIManager.openFirstRun();       
            //require('sdk/tabs').open(require("sdk/self").data.url("firstrun.html"));
            break;
        }
    }
    
    if (require('./config').PARSER_TEST_MODE) {

        var path = require('./config').PARSER_TEST_ADS; console.log('path='+path);
        var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
        file.initWithPath(path); 
        require("./ff/abpcomp").Component.parser.importAds(file);
        require("./ffui/uiman").UIManager.openVault(); // open vault at start
    }
}

exports.onUnload = function(reason) {

    if (1) console.log("Main::onUnload() -> "+reason);

    require("./ff/abpcomp").Component.stop(reason);
};




