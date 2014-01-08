const { Cc, Ci, Cu } = require("chrome");
const { Class } = require('sdk/core/heritage');
const { Unknown } = require('sdk/platform/xpcom');

const { Options } = require("./adnoptions");
const { Logger } = require("./adnlogger");
const { AdParser } = require("./adnparser");
const { prefs } = require('sdk/simple-prefs');

const gprefs = require("sdk/preferences/service");
const contractId = '@rednoise.org/adncomp';

Cu.import("resource://gre/modules/Services.jsm", this);

var AdnComponent = Class({
	
	initd : false,
	extends: Unknown,

	initialize : function(message) { // returns true on success
		
		if (this.initd) return true;
		
		gprefs.set("javascript.options.strict", false);  // remove for prod
		
		Options.init(this);
		
		var result = {};
		result.wrappedJSObject = result;
		Services.obs.notifyObservers(result, "adblockplus-require", 'contentPolicy');
		
		if (!result.exports || !result.exports.Policy) { // TODO: change to alert (or set message in adnpanel)
			
			Logger.alert("No Adblock-Plus! Ad Nauseam will be installed,"
				+" but remain disabled until you install the AdBlock addon"); 
				
			// TODO: should abort install here (maybe)...
			
			prefs['enabled'] = false;
			
			return false;
		}
		
		if (!result.exports.Policy.processNode) { // TODO: change to alert (or set message in adnpanel)
			
			Logger.alert("Ad Nauseam is incompatible with this version of Adblock!");
			
			// TODO: should abort install here... 
			
			prefs['enabled'] = false;
			
			return false;
		}

		this.parser = AdParser(this);
		
		// redirect processNode calls to our own parser function
		this.parser.processNodeABP = result.exports.Policy.processNode;
		result.exports.Policy.processNode = this.processNode;
	
		gprefs.set("extensions.adblockplus.fastcollapse", false);
	
		Logger.log("Ad Nauseam Initialized");
		
		return (this.initd = true);
	},

	// return false if the node should be blocked
	
	processNode : function(wnd, node, type, loc, collapse) { // RUN FROM WITHIN ADBLOCK ***

 		if (type === Ci.nsIContentPolicy.TYPE_SCRIPT)
 			return true;
 			
        if (!node || !node.ownerDocument || !node.tagName || node.hasAttribute("NOAD"))
      		return true;
      	
      	var parentUrl = wnd.wrappedJSObject.document.URL;
      	
      	// ignore our adview page (TODO: also rednoise) -- make into function?
      	if (/^(resource|javascript|about):/i.test(parentUrl)) { 
      		
			Logger.log("IGNORE :: (local-url) "+loc.spec);
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
		
		this.parser && (this.parser.restart());
		
	},
	
    stop : function() {
    	
    	Logger.log("Ad Nauseam Stopped");
    	
    	Options.closeTab();
    	
    	this.parser && (this.parser.stop());
    },

	get wrappedJSObject() this
});

var component = AdnComponent();
exports.Component = component;
exports.Getter = function() { return component; }
exports.Id = contractId;

