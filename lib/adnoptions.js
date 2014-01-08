const { Class } = require('sdk/core/heritage');
const { Unknown } = require('sdk/platform/xpcom');
const { prefs } = require('sdk/simple-prefs');
const { data } = require("sdk/self");
const tabs = require('sdk/tabs');

var AdnOptions = Class({
	
	initd : false,
	adnTab : null,
	enabled : true,
	saveLogs : true,
	disableLogs : false,
	outlineAds : false,
	
	extends : Unknown,

	init : function(comp) {
		
		if (this.initd) return;
		
		this.component = comp;
			
		var me = this;
		
		require('sdk/simple-prefs').on('', function(pname) { // any pref change
			
			console.log("onPrefChange::"+pname+"->"+prefs[pname]);
			
			if (pname === 'enabled') {
				
				if (prefs[pname])
					me.component.restart();
				else
					me.component.stop();
			}
					
			// attempt to saveLogs while Logs are disabled
			if (pname === 'saveLogs' && prefs['saveLogs'] && prefs['disableLogs']) {
				
				me.alert("You must first uncheck 'disableLogs' before checking 'saveLogs'");
				
				prefs['saveLogs'] = false;
			}
				
			me.load(); // sync
		});
		
		this.initd = true; 
		
		this.load();
	},

	load : function() {
		
		if (!this.initd) 
			throw Error("[ADN] Options object has not been initialized");

		if (typeof prefs['enabled'] != 'undefined')
			this.enabled = prefs['enabled'];		
	
		if (typeof prefs['disableLogs'] != 'undefined') 
			this.disableLogs = prefs['disableLogs'];
			
		if (typeof prefs['saveLogs'] != 'undefined')
			this.saveLogs = prefs['saveLogs'];
			
		if (typeof prefs['outlineAds'] != 'undefined')
			this.outlineAds = prefs['outlineAds'];
		
		this.dumpOptions();		
	},
	
	/*save : function(options) { // called from menu
		
		if (!options) throw Error("No options arg!");
			
		prefs['enabled'] = options.enabled; 
	    prefs['saveLogs'] = options.saveLogs;
	    prefs['disableLogs'] = options.disableLogs;
	    prefs['outlineAds'] = options.outlineAds;
	    
	    this.load();
	},*/
	
	// setEnabled : function(val) {
// 		
		// prefs['enabled'] = val; 
	// },
	
	toggle : function(pname) {
			
		//console.log("ENABLED1: "+prefs['enabled']);
		
		if (typeof prefs[pname] != 'undefined') {
			
			prefs[pname] = !prefs[pname];
//			console.log("SET PREF: enabled="+prefs['enabled']+" "+prefs[pname]); 
		}
			
		//console.log("ENABLED2: "+prefs['enabled']);
	},

	toJSON : function() {

	    var options = {};
		
		options.enabled = this.enabled;
		options.saveLogs = this.saveLogs;
		options.disableLogs = this.disableLogs;
		options.outlineAds = this.outlineAds;
		
		return options;
	},
	
	log : function(msg) {
		
		return (require("adnlogger").Logger || console).log(msg);
	},
	
	alert : function(msg) {
		
		var logger = require("adnlogger").Logger; 
		if (logger) {
			logger.alert(msg);
		}
		else
			console.warn(msg);
	},
	
	dumpOptions : function() {

		this.log('Options:\n  enabled=' + this.enabled+ '\n  saveLogs=' + this.saveLogs
			 + '\n  disableLogs=' + this.disableLogs + '\n  outlineAds='+this.outlineAds);
	},  
		
	closeTab : function() {
		
		if (this.tab) {
		
			this.log("Closing ADN-tab");
			
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
	}
	
});

exports.Options = AdnOptions();

