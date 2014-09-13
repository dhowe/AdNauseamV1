const { Class } = require('sdk/core/heritage');
const { Unknown } = require('sdk/platform/xpcom');
const { prefs } = require('sdk/simple-prefs');
const { data } = require("sdk/self");
const tabs = require('sdk/tabs');

// Note: Loaded before we have a logger!

var AdnOptions = Class({
	
	tab : null,
	initd : false,
	worker : null,
	enabled : true,
	saveLogs : true,
	disableLogs : false,
	outlineAds : false,
	verboseNotify : true,
	
	extends : Unknown,

	initialize : function() {
		
		if (this.initd) return;
			
		var me = this;
		
		require('sdk/simple-prefs').on('', function(pname) { // any pref change
			
			var Logger = require("./adnlogger").Logger;
			
			Logger.log("Options."+pname+"="+prefs[pname]);
			
			me.load(); // sync
						
			if (pname === 'enabled') {
				
				var comp = require("./adncomp").Component;
				comp && comp.enabled(prefs[pname]);
			}
			
			else if (pname === 'disableLogs' && prefs['disableLogs']) {
				
				require("./adnlogger").Logger.reset();
			}
					
			// attempt to saveLogs while Logs are disabled
			else if (pname === 'saveLogs' && prefs['saveLogs'] && prefs['disableLogs']) {
				
				Logger.alert("You must first uncheck 'disableLogs' before checking 'saveLogs'");
				
				prefs['saveLogs'] = false;
			}
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
		
		if (typeof prefs['verboseNotify'] != 'undefined')
			this.verboseNotify = prefs['verboseNotify'];
				
		if (typeof prefs['outlineAds'] != 'undefined')
			this.outlineAds = prefs['outlineAds'];
	},
		
	toggle : function(pname) {
			
		if (typeof prefs[pname] != 'undefined') {
			
			prefs[pname] = !prefs[pname];
		}
	},

	toJSON : function() {

	    var options = {};
		
		options.enabled = this.enabled;
		options.saveLogs = this.saveLogs;
		options.disableLogs = this.disableLogs;
		options.outlineAds = this.outlineAds;
		options.verboseNotify = this.verboseNotify;
		
		return options;
	},
	
	dump : function(logger) {
		
		if (!logger) throw Error("no logger here!");
		
		logger.log('Options:\n  enabled=' + this.enabled+ '\n  saveLogs=' + this.saveLogs
			+ '\n  disableLogs=' + this.disableLogs + '\n  outlineAds='+this.outlineAds);
	},  
		
	closeTab : function() {
		
		if (this.tab) {
				
			this.tab.unpin();
			this.tab.close();
		}
	},
	
	updateAdview : function(field, theAd) {
		
		var update = { id: theAd.id, field: field, value: theAd[field] };
		
		if (!this.worker) {
			//require("./adnlogger").Logger.log("updateAdview: No adview open!");
			return;
		}
		
		this.worker.port.emit("ADNUpdateAd", update);
	},
	
  	loadAdview : function(tab) {
	  		
	    var parser = require("./adncomp").Component.parser;
	    
		var worker = tab.attach({
			
			contentScriptFile : [ 
				data.url('lib/jquery-1.8.3.min.js'),
				data.url('adview-shim.js')
			],
			
			contentScriptOptions : { ads: parser.getAds() }
		});	
		
		var me = this;
		worker.port.on("ADNClearAds", function(data) { 
            
  			parser.clearAds(); 
  			me.closeTab();
        });
        
        this.worker = worker;
  	},
  	
	openInTab : function(pageUrl) {
		
		var me = this;
		
		if (!this.tab) {
			
			//console.log("NO ADN-TAB, recreating...");
			tabs.open({
				
				url: pageUrl,
			    isPinned: true,
				onOpen: function(tab) {
					me.tab = tab;
			  	},
	
			  	onReady : function(tab) {
			  		
					//console.log("URL(onReady): "+tab.url);
					
					if (/adview.*\.html$/.test(tab.url))
						me.loadAdview(tab);
				},
				
				onActivate : function(tab) {
					
					//console.log("URL(onActivate): "+tab.url);
					
					if (/adview.*\.html$/.test(tab.url))
						me.loadAdview(tab);
				},
				
			  	onClose: function(tab) {
			  		
					me.tab = null;
			  	}
			});
		}
		else {
			
			this.tab.url = pageUrl; 
  			this.tab.activate();
		}
	}
	
});

exports.Options = AdnOptions();

