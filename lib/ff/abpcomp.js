const { Cc, Ci, Cu } = require("chrome");

var AdParser = require("./parser").AdParser;
var Options = require("../ffui/options").Options;
var Logger = require("../ffui/logger").Logger;

const contractId = '@rednoise.org/abpcomp';
const addonId = "adnauseam@rednoise.org";

Cu.import("resource://gre/modules/Services.jsm", this);

var AbpComponent = require('sdk/core/heritage').Class({
	
	initd : false,
	noPolicy : false,
	extends: require('sdk/platform/xpcom').Unknown,

	initialize : function(message) {

		try {
			
			if (this.initd) return true;
						
			this.parser = AdParser(this);
			
			this.acquireFunctions();
	
			require("sdk/preferences/service").set("extensions.adblockplus.fastcollapse", false);
		
			Logger.log("AdNauseam Initialized");
	
			this.initd = true;
		}
		catch(e) {
			
			Logger.err(e);
		}
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
		
		this.noPolicy = true;
		
		Options.set('enabled', false);
		
		Cu.import("resource://gre/modules/AddonManager.jsm");		
		
		AddonManager.getAddonByID(addonId, function(addon) {
		
	  		addon.userDisabled = true;
	  		console.log("AddonManager->userDisabled = "+addon.userDisabled);
		});

		return false;
	},
		
	enabled : function(val) {

		if (val) {
			
			this.unpause();
		}
		else {
			
			this.pause();
		}
	},
  
	// Return false if the node SHOULD be blocked (accept=false) 
	
	processNode : function(wnd, node, type, loc, collapse) { // RUN FROM WITHIN ADBLOCK ***

		//Logger.log("processNode("+type+") tag="+node.tagName+" :: "+loc.spec);
		
		try {
			
	 		if (type === Ci.nsIContentPolicy.TYPE_SCRIPT)
	 			return true;
	 			
	        if (!node || !node.ownerDocument || !node.tagName || node.hasAttribute("NOAD")) 
	      		return true;
	      	
	      	var parentUrl = wnd.wrappedJSObject.document.URL;
	      	
	      	var parser = Cc[contractId].getService(Ci.nsISupports).wrappedJSObject.parser;
	      	
	      	// ignore pages loaded in adn-tab
	      	if (parser.isAdnWorker(wnd)) {
	      		
				if (0) Logger.log("IGNORE(recursive) -> "+loc.spec + "\n"+ parentUrl);
				return true;
	      	}
	      	
	      	// ignore our adview page (TODO: also rednoise) -- make into function?
	      	if (parser.ignoreRE.test(parentUrl)) { 
	      		
				if (0) Logger.log("IGNORE(local-url) -> "+loc.spec + "\n"+ parentUrl);
	            return true;
			}
						
			// this is the result adblock would return
	      	var abpResult = parser.processNodeABP(wnd, node, type, loc, collapse);
	      	
	      	// Ignore style-sheets, documents, and unknown types
	      	if (type == Ci.nsIContentPolicy.TYPE_STYLESHEET ||
	            type == Ci.nsIContentPolicy.TYPE_DOCUMENT ||
	            type >= Ci.nsIContentPolicy.TYPE_SUBDOCUMENT) 
			{
				//Logger.log("Bad-type -> "+loc.spec);
	            return abpResult;	
			}
			
			var tag = node.tagName.toUpperCase();
			
			// Don't process images (but do handle iframes)  
	        if (abpResult) { // && node.tagName !== 'IFRAME') {
// 	        	
	        	// if (node.tagName.toUpperCase() === 'IFRAME') {
	        		// Logger.warn('IFRAME(blocked): '+loc.spec);
	        		// return 0;
	        	// }
// 	        	
				
	        	if (!/ima?ge?/i.test(node.tagName) && node.tagName !== 'LINK')
					Logger.warn("(abpResult = true)   -> "+loc.spec+" / tagName: "+node.tagName);
					
	        	return true; // Ci.nsIContentPolicy.ACCEPT;
	        }
		}
		catch(e) {
			
			Logger.err(e);
		}
		
        return parser.handleAd(wnd, node, type, loc, collapse, abpResult);
    },
    
   
	restart : function() {
		
	    Logger.log('AdNauseam[comp] restart');
			
		try {
		
			if (!this.parser)
				throw Error('no parser!');
		
			this.parser.restart();
			
		} catch(e) {
		
			Logger.err(e);
		}
	},
	
    stop : function(reason) {
    	
    	try {
		
			this.restoreFunctions();
	
	    	require("../ffui/uiman").UIManager.closeTab();
	    	
	    	this.parser && (this.parser.stop());
	    	
	    	Logger.log('AdNauseam[comp] stopped (Addon.userDisabled=true)');
    	}
		catch(e) {
			
			Logger.err(e);
		}
    },
    
    pause : function() {
		
		require("../ffui/uiman").UIManager.closeTab();
    	
    	this.parser && (this.parser.pause());
    	
    	Logger.log('AdNauseam[comp] paused (Options.enabled=false)');
    },
    
   	unpause : function() {
   		
   		Logger.log('AdNauseam[comp] unpaused (Options.enabled=true)');
   		
		this.parser && (this.parser.unpause());
    },

	get wrappedJSObject() this
});


var component = AbpComponent();
component.contractId = contractId;
exports.Component = component;
