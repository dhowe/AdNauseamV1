const { Class } = require('sdk/core/heritage');
const { Unknown } = require('sdk/platform/xpcom');
const { Logger, LogFile } = require("./adnlogger");
const { prefs } = require('sdk/simple-prefs');
const { data } = require("sdk/self");
const tabs = require('sdk/tabs');

var AdnOptions = Class({
	
	adnTab : null,
	logFile : null,
	enabled : true,
	saveLogs : true,
	disableLogs : false,
	
	extends : Unknown,

	load : function(comp) {
					
		//Logger.log("Creating AdnOptions :: "+comp);
		
		this.component = comp;
		
		this.enabled = true;
		if (typeof prefs['enabled'] != 'undefined')
			this.enabled = prefs['enabled'];
			
		this.disableLogs = false;
		if (typeof prefs['disableLogs'] != 'undefined')
			this.disableLogs = prefs['disableLogs'];
			
		this.saveLogs = true; // TODO: change for prod
		if (typeof prefs['saveLogs'] != 'undefined')
			this.saveLogs = prefs['saveLogs'];
			
		if (this.disableLogs) { 
			this.saveLogs = false;
			prefs['saveLogs'] = false;
		}
			
		this.logFile = LogFile;
	
		this.dumpOptions();
	},
	
	closeTab : function() {
		
		if (this.tab) {
		
			Logger.log("Closing adn-tab");
			
			this.tab.unpin();
			this.tab.close();
		}
	},

	openInTab : function(pageUrl) {
		
		var found = false, dis = this; 
		
		for each (var tab in tabs) {
			
			//console.log("checking this.tabId("+this.tab+") =? "+tab);
  			if (tab === this.tab) {
  				
  				//console.log("FOUND ADN-TAB!!!");
  				this.tab = tab;
  				tab.url = pageUrl; 
  				found = true;
  			}
  		}
  		
		if (!found) {
			
			//console.log("NO ADN-TAB, recreating...");
			tabs.open({
				
				url: pageUrl,
			    isPinned: true,
				favicon: data.url('img/adn.png'), // not working
				onOpen: function(tab) {
					dis.tab = tab;
			  	}
			});
		}
	},
	
	toJSON : function() {

	    var options = {};
		
		options.logFile = this.logFile;
		options.enabled = this.enabled;
		options.saveLogs = this.saveLogs;
		options.disableLogs = this.disableLogs;
		
		return options;
	},

	saveOptions : function(options) {
		
		if (!options) options = this.toJSON();
			
	    if (this.enabled != options.enabled){

			this.enabled = options.enabled;
			
			Logger.log("Options: enabled=" + this.enabled);
			
	    	if (options.enabled) {
	    		
	        	this.component.restart(); // restart objects/timer
	        }
	        else {
	        	this.component.stop(); // destroy loaded pages 
	        }	        
	    }

	    this.saveLogs = options.saveLogs;
	    this.disableLogs = options.disableLogs;
	    
	    if (this.disableLogs) { 
			this.saveLogs = false;
		}
	    
	    // TODO: validate user-selection in UI 
	    // 		 shouldnt be able to pick disableLogs AND persistLogs

		prefs['enabled'] = this.enabled; 
	    prefs['saveLogs'] = this.saveLogs;
	    prefs['disableLogs'] = this.disableLogs;
	    
	    //this.dumpOptions();			
	},
		
	dumpOptions : function() {
		
		Logger.log('Options:\n  enabled=' + this.enabled+ '\n  saveLogs=' + this.saveLogs
			 + '\n  disableLogs=' + this.disableLogs + '\n  logFile='+this.logFile);
	}  
	
});

exports.Options = AdnOptions();

