const { Cc, Ci, Cu } = require("chrome");
const { Class } = require('sdk/core/heritage');
const { Unknown } = require('sdk/platform/xpcom');
const { prefs } = require('sdk/simple-prefs');

const gprefs = require("sdk/preferences/service");
const contractId = '@rednoise.org/adncomp';
const addonId = "adnauseam@rednoise.org";

const { Options } = require("./adnoptions");
const { Logger } = require("./adnlogger");
const { AdParser } = require("./adnparser");
const { Button } = require("./adnviews"); // save

Cu.import("resource://gre/modules/Services.jsm", this);

var AdnComponent = Class({
	
	initd : false,
	noPolicy : false,
	extends: Unknown,

	initialize : function(message) { // returns true on success
		
		if (this.initd) return true;
				
		gprefs.set("javascript.options.strict", false);  // remove for prod

		this.parser = AdParser(this);
		
		this.acquireFunctions();

		gprefs.set("extensions.adblockplus.fastcollapse", false);
	
		Logger.log("AdNauseam Initialized");

		this.initd = true;
	},
	
	acquireFunctions : function() {
		
		this.retrievePolicy();
		
		if (this.Policy) {
			
			this.parser.processNodeABP = this.Policy.processNode; // save the old
			this.Policy.processNode = this.processNode;    // reassign our new one
		}
 	},
 	
 	retrievePolicy : function() {
 		
 		// redirect ABP.processNode() calls to our own parser function
 		
 		var result = {};
		result.wrappedJSObject = result;
		Services.obs.notifyObservers(result, "adblockplus-require", 'contentPolicy');

		if (!result.exports || !result.exports.Policy)  
			return this.disable('No Adblock-Plus! AdNauseam will be installed,'
				+' but remain disabled until you install the Adblock-Plus addon');
				 
		if (!result.exports.Policy.processNode) 			
			return this.disable('AdNauseam is incompatible with this version of Adblock!');

		this.Policy = result.exports.Policy; // save for cleanup	
 	}, 
 	
 	restoreFunctions : function() {
 				
		// restore processNode calls back to adblock
		
		if (this.noPolicy) return; // already disabled b/c ABP is missing
		
 		if (!this.Policy) this.retrievePolicy();
 		
 		if (!(this.Policy && this.parser && this.parser.processNodeABP)) {
 			
 			Logger.warn('Unable to restore Policy to ABP!\n'+
 				this.Policy +' '+this.parser + ' ' +
 				typeof this.parser.processNodeABP+')');
 			return;
 		}

		Logger.log('AdNauseam: restoring functions');
		
		this.Policy.processNode = this.parser.processNodeABP;
 	},

	// user-disabled
	disable : function(alertMsg) {
		
		if (alertMsg) Logger.alert(alertMsg);
		
		Cu.import("resource://gre/modules/AddonManager.jsm");
		
		this.noPolicy = true;
		
		//Options.enabled = false;
		prefs['enabled'] = false;
				
		AddonManager.getAddonByID(addonId, function(addon) {
		
	  		addon.userDisabled = true;
	  		console.log("AddonManager->userDisabled = "+addon.userDisabled);
		});
		
		Button && Button.destroy();
		
		return false;
	},
		
	enabled : function(val) {

		Button && Button.update();
		
		if (val) {
			
			this.unpause();
		}
		else {
			
			this.pause();
		}
	}, 
  
	// Return false (accept=false) if the node SHOULD be blocked
	
	processNode : function(wnd, node, type, loc, collapse) { // RUN FROM WITHIN ADBLOCK ***

		//Logger.log("processNode("+type+") tag="+node.tagName+" :: "+loc.spec);
		
 		if (type === Ci.nsIContentPolicy.TYPE_SCRIPT)
 			return true;
 			
        if (!node || !node.ownerDocument || !node.tagName || node.hasAttribute("NOAD"))
      		return true;
      	
      	var parentUrl = wnd.wrappedJSObject.document.URL;
      	
      	// ignore our adview page (TODO: also rednoise) -- make into function?
      	if (/^(resource|javascript|about):/i.test(parentUrl)) { 
      		
			if (0) Logger.log("IGNORE(local-url) -> "+loc.spec + "\n"+ parentUrl);
            return true;
		}
            	
		var parser = Cc[contractId].getService(Ci.nsISupports).wrappedJSObject.parser;
      	var abpResult = parser.processNodeABP(wnd, node, type, loc, collapse);
      	
      	if (type == Ci.nsIContentPolicy.TYPE_STYLESHEET ||
            type == Ci.nsIContentPolicy.TYPE_DOCUMENT ||
            type > Ci.nsIContentPolicy.TYPE_SUBDOCUMENT) 
		{
            return abpResult;	
		}
		
        if (abpResult == 1) return true;

        return parser.handleAd(wnd, node, type, loc, abpResult);
    },
    
   
	restart : function() {
		
		if (!this.parser)
			throw Error('no parser!');   
			
		this.parser.restart();
	},
	
    stop : function(reason) {
    	    	
    	// This never happens, so there is no way to clean-up
    	// See: https://bugzilla.mozilla.org/show_bug.cgi?id=627432#c12
		if (reason == 'remove' || reason == 'uninstall') {	
			
			require('./adnviews').Button.destroy();
			Logger.dispose();
		}

		this.restoreFunctions();

    	Options.closeTab();
    	
    	this.parser && (this.parser.stop());
    	
    	Logger.log('AdNauseam stopped: (Addon.userDisabled=true)');
    },
    
    pause : function() {
		
		Options.closeTab();
    	
    	this.parser && (this.parser.pause());
    	
    	Logger.log('AdNauseam paused (Options.enabled=false)');
    },
    
   	unpause : function() {
   		
   		Logger.log('AdNauseam unpaused (Options.enabled=true)');
   		
		this.parser && (this.parser.unpause());
    },

	get wrappedJSObject() this
});

var component = AdnComponent();
exports.Component = component;
exports.Id = contractId;

