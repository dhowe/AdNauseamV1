const aboutURL = "https://github.com/dhowe/AdNauseam/wiki/Help";
const Options = require("./options").Options;
const Timers = require("sdk/timers");
const Data = require("sdk/self").data;

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
			onChange : this.handleChange.bind(this)
		});
		
		this.menu = require("sdk/panel").Panel({
			
			contentURL : Data.url("menu.html"),
			contentScriptFile : [
				Data.url("lib/jquery-1.10.2.min.js"),
				Data.url("lib/jquery-1.11.2-ui.js"),
				Data.url("menu.js")
			],
			onHide : this.closeMenu.bind(this),
			onShow : this.openMenu.bind(this)
		});
		
		this.registerEventHandlers();
	},
	
	openVault: function() {
		
console.log('uiman.openVault');

		this.openInTab(Data.url('vault.html'));
	},
	
	refreshVault: function() {

		var parser = require("../ff/abpcomp").Component.parser;

		this.worker = this.tab.attach({
			contentScriptFile : [
				Data.url('lib/jquery-1.10.2.min.js'),
				Data.url('lib/d3.min.js'),
				Data.url('lib/packery.min.js'),
				Data.url('vault-ui.js'),   
				Data.url('vault.js') 
			],
		});
		
		var pageUrl = require('sdk/tabs').activeTab.url;
		var adhash = require("../ff/abpcomp").Component.parser.adlookup;

		this.worker.port.emit("refresh-ads", { data: adhash, page: pageUrl });
  	},
	
	openMenu : function() {

		//var rawAds = require('../test/test-ad-data').ads; // tmp-remove
		this.updateMenu();
	},
	
	updateMenu : function(updates) { 

		if (this.menu && this.menu.isShowing) {
				
			var pageUrl = require('sdk/tabs').activeTab.url;
			if (require('../config').PARSER_TEST_UPDATES) {

				pageUrl = require('../config').PARSER_TEST_PAGE;
				console.log("*TEST*: Using test.pageUrl: " + pageUrl);
			}
			
			var adhash = require("../ff/abpcomp").Component.parser.adlookup;

			if (updates) {
				//console.log(updates.length, updates);
				this.menu.port.emit("update-ads", { data: adhash, updates: updates, page: pageUrl }); // -> menu.js
			}
			else {
				this.menu.port.emit("refresh-ads", { data: adhash, page: pageUrl }); // -> menu.js
			}
		}		
	},

	updateOnAdVisit : function(updates) {
		
		this.updateMenu(updates);
	},
	
	updateOnAdFound: function(ad) {
		
		// just reset the whole list here		
		this.updateMenu();
	},
	
	closeTab : function() {

		if (this.tab) {

			this.tab.unpin();
			this.tab.close();
		}
	},

	openLog: function() {

		this.openInTab(Data.url('log.html'));
			//file://" + require("./logger").Logger.logFile.path");
	},
	
  	refreshLogView: function(tab) {
  		
		this.worker = tab.attach({
			//contentScriptFile : [ Data.url('log-injector.js') ],
		});
		this.worker.port.emit("refresh-log", { "path": require("./logger").Logger.logFile.path } );
  	},
	
	openInTab : function(pageUrl) {

		if (!this.tab) {

			function refreshView() {

				if (/vault.html$/.test(this.tab.url)) {
					
					//console.log('3: '+typeof this.refreshVault);
					this.refreshVault.apply(this);
					//console.log('4: '+typeof this.refreshVault);
				}
					
				if (/log.html$/.test(this.tab.url))
					this.refreshLogView.bind(this);
			}

			require('sdk/tabs').open({

				url: pageUrl,

			    isPinned: true,

			  	onReady : refreshView.bind(this),

				onActivate : refreshView.bind(this),

				onOpen: function(tab) {

					this.tab = tab;

			  	}.bind(this),

			  	onClose: function(tab) {

					this.tab = null;

			  	}.bind(this)
			});
		}
		else {
console.log('4');
			this.tab.url = pageUrl;
  			this.tab.activate();
		}
	},
	
	cleanupTabs : function() {
	
	  	for (var tab of require("sdk/tabs")) {
	  		
	    	if (/vault.html$/.test(tab.url) || /log.html$/.test(tab.url)) {
	    		tab.unpin();
	    		tab.close();
	    	}
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
			? Data.url('img/icon-'+size+'.png')
			: Data.url('img/icon-g-'+size+'.png');
	},
	
	/*updateAdData : function(field, theAd) { // not used

		var update = { id: theAd.id, field: field, value: theAd[field] };

		if (!this.worker) {
			//require("./logger").Logger.log("updateAdview: No adview open yet!");
			return;
		}

		this.worker && this.worker.port.emit("ad-updated", update);
		this.menu && this.menu.port.emit("ad-updated",  update);
	},*/

	closeMenu : function() {
		
		//console.log("MENU.closeMenu");
		
		this.button.state('window', { checked : false }); // required
		this.menu.port.emit("close-panel");  // -> menu.js		
	},
	
	registerEventHandlers : function() {

		// registering event-handlers here

		this.menu.port.on("clear-ads", function(data) {

  			require("../ff/abpcomp").Component.parser.clearAds();
  			this.closeTab();

        }.bind(this));
        
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

		this.menu.port.on("disable-logs", function(arg) {

			var setting = (arg && arg.value);
			Options.set('disableLogs', setting);

		}.bind(this));

		this.menu.port.on("show-about", function() {

			this.menu.hide();
			this.openInTab(aboutURL);

			// import/export: 
			//require("../ff/abpcomp").Component.parser.exportAds();
			//require("../ff/abpcomp").Component.parser.importAds();

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

	/*processAdData : function(pageUrl) { // remove

		var parser = require("../ff/abpcomp").Component.parser,
			ads = parser.getAds(), ad, unique=0, onpage=[], soFar, hash = {};

		parser.logStats();
		
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

		// all ads, ads-on-page, uniqueCount
		return { ads: ads, uniqueCount: unique, onpage: onpage };
	}*/
});

exports.UIManager = _UIManager();
