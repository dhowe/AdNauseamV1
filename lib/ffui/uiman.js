var aboutURL = "https://github.com/dhowe/AdNauseam/wiki/Help";
var Options = require("./options").Options;
var Data = require("sdk/self").data;

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
			
			contentURL : Data.url("menu.html"),
			contentScriptFile : [
				Data.url("lib/jquery-1.10.2.min.js"),
				Data.url("lib/jquery-1.11.2-ui.js"),
				Data.url("menu.js")
			],
			onHide : this.closePanel.bind(this),
			onShow :this.openPanel.bind(this)
		});
		
		this.registerEventHandlers();
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

	updateOnAdVisit: function(a) {

		this.updateAdData('visitedTs', a);
	},

	updateAdData : function(field, theAd) {

		var update = { id: theAd.id, field: field, value: theAd[field] };

		if (!this.worker) {
			//require("./logger").Logger.log("updateAdview: No adview open yet!");
			return;
		}

		this.worker && this.worker.port.emit("ad-updated", update);
		this.menu && this.menu.port.emit("ad-updated",  update);
	},

  	refreshLogView: function(tab) {
		this.worker = tab.attach({
			//contentScriptFile : [ Data.url('log-injector.js') ],
		});
		this.worker.port.emit("refresh-log", { "path": require("./logger").Logger.logFile.path } );
  	},

  	refreshAdVault: function(tab) {

		var parser = require("../ff/abpcomp").Component.parser;

		this.worker = tab.attach({
			contentScriptFile : [ Data.url('adinjector.js') ],
		});

		this.worker.port.on("clear-ads", function(data) {

  			parser.clearAds();
  			this.closeTab();

        }.bind(this));

		this.worker.port.emit("refresh-ads", { "ads": parser.getAds() } );
  	},
	
	openAdVault: function() {

		this.openInTab(Data.url('advault.html'));
	},
	
	openInTab : function(pageUrl) {

		if (!this.tab) {

			function refreshView(tab) {

				if (/advault.html$/.test(tab.url))
					this.refreshAdVault(tab);
					
				if (/log.html$/.test(tab.url))
					this.refreshLogView(tab);
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

			this.tab.url = pageUrl;
  			this.tab.activate();
		}
	},

	getWorker : function() {

		return this.worker;
	},

	refreshMenu : function() {

console.log('UIMAN::refreshMenu');
		
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

	closePanel : function() {

		this.button.state('window', { checked : false });
		this.menu.port.emit("close-panel"); // -> menu.js
	},

	openPanel : function() {

		//console.log("MENU.openPanel");
		//var rawAds = require('../test/test-ad-data').ads; // tmp-remove

		var pageUrl = require('sdk/tabs').activeTab.url;		
		
		//this.menu.contentURL = Data.url("menu.html");

		this.menu.port.emit("refresh-ads", this.processAdData(pageUrl)); // -> menu.js
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
