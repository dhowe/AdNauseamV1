const { Cc, Ci, Cu } = require("chrome");
const UIManager = require("./ff/uiman").UIManager;
const Logger = require("./ff/logger").Logger;

exports.main = function(options, callbacks) {	

	Logger.log('Main::main() -> '+options.loadReason + (UIManager.cfx ? ' [cfx]' : '')); 	

    if (options) { // check for first-install
        
        switch(options.loadReason) {

            case "install":
            case "upgrade":
            case "downgrade":
            
                UIManager.firstRun = true;       
        }
    }
    
	// Create and register our component (abpcomp) via the contract-id
	require('sdk/platform/xpcom').Service
		({ contract: '@rednoise.org/adncomp', Component: 
			function() { return require("./ff/adncomp").Component; }});
			
	UIManager.cleanupTabs(); // close leftover adn-tabs

    if (UIManager.cfx && require('./config').PARSER_TEST_MODE) {

        if (require('./config').PARSER_TEST_MODE != 'clear') {
            
            var path = require('./config').PARSER_TEST_ADS;
            Logger.log("Loading Test Ads: "+path); 
            var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
            file.initWithPath(path); 
            UIManager.importAds(file);
            require("./ff/vaultman").VaultManager.openVault(); // open vault at start
        }
    }
    
    UIManager.firstRun && UIManager.openFirstRun();
    
    require("./ff/eventman");
};

exports.onUnload = function(reason) {

    if (1) Logger.log("Main::onUnload() -> "+reason);

   
    require("./ff/adncomp").Component.stop(reason);
};
