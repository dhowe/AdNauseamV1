const { Cc, Ci, Cu } = require("chrome");
const { Class } = require('sdk/core/heritage');
const { Unknown } = require('sdk/platform/xpcom');
const { prefs } = require('sdk/simple-prefs');
const gprefs = require("sdk/preferences/service");
const contractId = '@rednoise.org/adncomp';

const { Options } = require("./adnoptions");
const { Logger } = require("./adnlogger");
const { AdParser } = require("./adnparser");
const { Widget } = require("./adnviews"); // save

Cu.import("resource://gre/modules/Services.jsm", this);

var AdnComponent = Class({
	
	initd : false,
	extends: Unknown,

	initialize : function(message) { // returns true on success
		
		if (this.initd) return true;
		
		//Options.init(this);
		
		gprefs.set("javascript.options.strict", false);  // remove for prod
		
		var result = {};
		result.wrappedJSObject = result;
		Services.obs.notifyObservers(result, "adblockplus-require", 'contentPolicy');
		
		if (!result.exports || !result.exports.Policy) { 
			
			return this.disable("No Adblock-Plus! Ad Nauseam will be installed,"
				+" but remain disabled until you install the AdBlock addon"); 
		}
		
		if (!result.exports.Policy.processNode) {
			
			return this.disable("Ad Nauseam is incompatible with this version of Adblock!");
		}

		this.parser = AdParser(this);
		
		// redirect processNode calls to our own parser function
		this.parser.processNodeABP = result.exports.Policy.processNode;
		result.exports.Policy.processNode = this.processNode;
	
		gprefs.set("extensions.adblockplus.fastcollapse", false);
	
		Logger.log("Ad Nauseam Initialized");
		
		this.initd = true;
	},
	
	disable : function(alertMsg) {
		
		if (alertMsg) Logger.alert(alertMsg);
		
		// TODO: should do Addon.userDisabled=true  here... 
		
		prefs['enabled'] = false;
		
		return false;
	},
		
	enabled : function(val) {
		
		//Logger.log("enabled("+val+")");

		require("./adnviews").updateWidget();
		
		if (val) {
			
			this.restart();
		}
		else {
			this.stop();
		}
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
      		
			Logger.log("IGNORE(local-url) -> "+loc.spec + "\n"+ parentUrl);
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
	
    stop : function() {
    	
    	Logger.log("Ad Nauseam Stopped");
    	
    	Options.closeTab();
    	
    	this.parser && (this.parser.stop());
    },

	get wrappedJSObject() this
});

var component = AdnComponent();
exports.Component = component;
exports.Id = contractId;

