var prefs = require('sdk/simple-prefs').prefs;
var data = require("sdk/self").data;

/* NEXT:
  1) FIGURE OUT WHY OPTIONS ARENT LOGGING
  2) Whether they are being sent to menu
  3) Why they are not persisting?
  */
// Note: Loaded before we have a logger

var _Options = require('sdk/core/heritage').Class({
	
	tab : null,
	worker : null,

	initialize : function() {

		require('sdk/simple-prefs').on('', function(pname) { // any pref change

			require("./logger").Logger.log("Options."+pname+"="+prefs[pname]);
			
			if (pname === 'enabled') {
	
				require("./uiman").UIManager.refreshMenu();
			}
			else if (pname === 'disableLogs' && prefs['disableLogs']) {
				
				require("./logger").Logger.reset();
			}
		});				
	},	
	
	get : function(pname) {
		
		if (typeof prefs[pname] === 'undefined') {
			
			require("./logger").Logger.warn
				("No pref for: "+pname+"! returning null");
				
			return null;
		} 
		
		return prefs[pname];
	},
	
	set : function(pname, val) {

		prefs[pname] = val;
	},
	
	toggle : function(pname) {
		
		if (typeof prefs[pname] == 'undefined') 
			throw Error("No pref for: "+pname); 
		
		prefs[pname] = !prefs[pname]
	},

	toJSON : function() {

	    var options = {};
		
		options.enabled = prefs['enabled'];
		options.disableLogs = prefs['disableLogs'];
		options.disableOutgoingReferer = prefs['disableOutgoingReferer'];
		options.disableOutgoingCookies = prefs['disableOutgoingCookies'];
		options.disableIncomingCookies = prefs['disableIncomingCookies'];
		options.version = require("sdk/self").version;

		return options;
	},
	
	dump : function(logger) {

		if (!logger) throw Error("no logger!");
		
		var s = '[Options]', opts = this.toJSON(), count = 0;
		
		for (var pref in opts) {
		    
		    if (opts.hasOwnProperty(pref)) {
		        //v =  
		        s += '\n\t\t\t'+pref + '=' + opts[pref];
		    }
		        
		    //if (s.length > 80) s += '\n';
		    
		}
		
		logger.log(s);  
	},  
	
});

exports.Options =  _Options();

