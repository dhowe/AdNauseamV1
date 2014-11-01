var aboutURL = "https://github.com/dhowe/AdNauseam/wiki/Help";
var Options = require("./options").Options;
var data = require("sdk/self").data;

var _UIManager = require('sdk/core/heritage').Class({
	
	tab : null,
	menu : null,
	button : null,
	worker : null,

	initialize : function() {

		this.button = require('sdk/ui/button/toggle').ToggleButton({
		
			id : "adnauseam-button",
			label : "AdNauseam",
			icon : this.buttonIconSet(),
			onChange :this.handleChange.bind(this)
		});
		
		this.menu = require("sdk/panel").Panel({
		
			contentURL : data.url("./popup-menu.html"),
			contentScriptFile : [
				data.url("lib/jquery-1.10.2.min.js"), 
				data.url("lib/jquery-1.11.2-ui.js"),
				data.url("popup-menu.js")
			],
			onHide : this.closePanel.bind(this),
			onShow :this.openPanel.bind(this)
		});
		
		// register event-handlers ---------------------------------
		
		this.menu.port.on("show-vault", function() {
		
			this.menu.hide();
			this.openAdVault();
			
		}.bind(this));
		 
		this.menu.port.on("toggle-enabled", function() {
		
			Options.toggle('enabled');
			
		}.bind(this));
		
		this.menu.port.on("disable", function() {
		
			//Options.set('enabled', false);
			Options.toggle('enabled');
			
		}.bind(this));
		
		this.menu.port.on("show-about", function() {
			
			this.menu.hide();
			this.openInTab(aboutURL);
			
		}.bind(this));
		
		this.menu.port.on("show-log", function() {
			
			this.menu.hide();
			
			var Logger = require("./logger").Logger;
		
			if (Options.get('disableLogs') || !Logger.ostream) {
				
				Logger.notify("No log available (AdNauseam is disabled or" 
					+" the 'disableLogs' preference is checked)"); // TODO: localize
			}
			else { 
				
				this.openLog();
			}
			
		}.bind(this));
	},
	
	closeTab : function() {
		
		if (this.tab) {
				
			this.tab.unpin();
			this.tab.close();
		}
	},

	openLog: function() {
		
		this.openInTab("file://" + require("./logger").Logger.logFile.path);
	},
		
	updateAdVault : function(field, theAd) {
		
		var update = { id: theAd.id, field: field, value: theAd[field] };
		
		if (!this.worker) {
			//require("./logger").Logger.log("updateAdview: No adview open yet!");
			return;
		}
		
		this.worker.port.emit("update-ad", update);
	},
	
	openAdVault: function() {
		
		this.openInTab(data.url('advault.html'));
	},

  	refreshAdVault: function(tab) {
		
		// console.log("refreshAdVault");
	    //var ads = require('../test/test-ad-data').ads; // tmp-remove

		var worker = tab.attach({
			
			contentScriptFile : [ data.url('adinject.js') ],
		});	
		
		var me = this;
		
		worker.port.on("clear-ads", function(data) { 
            
  			require("../ff/abpcomp").Component.parser.clearAds(); 
  			me.closeTab();
        });
        
		worker.port.emit("refresh-ads", { "ads": require("../ff/abpcomp").Component.parser.getAds() } ); 

        this.worker = worker;
  	},
  	
	openInTab : function(pageUrl) {
		
		var me = this;
		
		if (!this.tab) {
				
			require('sdk/tabs').open({
				
				url: pageUrl,
				
			    isPinned: true,
			    
				onOpen: function(tab) {
					me.tab = tab;
			  	},
	
			  	onReady : function(tab) {
			  		
					//console.log("URL(onReady): "+tab.url);
					
					if (/advault*\.html$/.test(tab.url))
						me.refreshAdVault(tab);
				},
				
				onActivate : function(tab) {
					
					//console.log("URL(onActivate): "+tab.url);
					
					if (/advault.*\.html$/.test(tab.url))
						me.refreshAdVault(tab);
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
	},
	
	getWorker : function() {
		
		return this.worker;
	},
	
	refreshMenu : function() {
	
		this.menu.port.emit("refresh-panel",  Options.toJSON());	
		this.button.icon = this.buttonIconSet();
	},
	
	handleChange : function(state) {
	
		//console.log("handleChange"); 
		
		if (state.checked) {
	
			this.menu.show({
				
				position : this.button,
				width : 387,
				height : 500,
			});		
		} 
		
		this.refreshMenu();
	},
	
	buttonIconSet : function() {
	
		return {
			
			"16" : this.buttonIcon(16),
			"32" : this.buttonIcon(32),
			"64" : this.buttonIcon(64)
		};
	},
	
	buttonIcon : function(size) {
		
		return Options.get('enabled')
			? data.url('img/icon-'+size+'.png') 
			: data.url('img/icon-'+size+'g.png');
	},
	
	closePanel : function() {
		
		this.button.state('window', { checked : false });
		this.menu.port.emit("close-panel"); // -> popup-menu.js
	},
	
	openPanel : function() {
	
		//var rawAds = require('../test/test-ad-data').ads; // tmp-remove
		
		var pageUrl = require('sdk/tabs').activeTab.url;
		
		//console.log('page :: ' + pageUrl);
	
		this.menu.port.emit("refresh-ads", this.processAdData(pageUrl)); // -> popup-menu.js
	},
	
	processAdData : function(pageUrl) {
		
		var ads = require("../ff/abpcomp").Component.parser.getAds();
		
		var ad, unique=0, onpage=[], soFar, hash = {};
		
		// set hidden val for each ad
		for (var i=0, j = ads.length; i<j; i++) {
			
			ad = ads[i];
			
			if (!ad.contentData) continue;
			
			soFar = hash[ad.contentData];
			if (!soFar) {
				
				// new: add a hash entry
				hash[ad.contentData] = 1;
				ad.hidden = false;
				
				// update count on this page
				if (pageUrl === ads[i].pageUrl) {
					
					// TODO: don't count old ads from same url
					onpage.push(ads[i]);
				} 
	
				// update total (unique) count			
				unique++;
			}
			else {
				
				// dup: update the count
				hash[ad.contentData]++;
				ad.hidden = true;
			}
		}
		
		// update the count for each ad from hash
		for (var i=0, j = ads.length; i<j; i++) {
			
			ad = ads[i];
			ad.count = hash[ad.contentData];
		}
	
		return { ads: ads, uniqueCount: unique, onpage: onpage };
	}
});

exports.UIManager = _UIManager(); 
