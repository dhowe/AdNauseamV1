const aboutURL = "https://github.com/dhowe/AdNauseam/wiki/Help";
const Options = require("./options").Options;
const Timers = require("sdk/timers");
const Data = require("sdk/self").data;

var UIManager = require('sdk/core/heritage').Class({

	tab : null,
	menu : null,
	button : null,
	worker : null,

	initialize : function() {

		this.button = require('sdk/ui/button/toggle').ToggleButton({

			id : "adnauseam-button",
			label : "AdNauseam",
			icon : this.buttonIconSet(false),
			onChange : this.handleChange.bind(this)
		});
		
		this.menu = require("sdk/panel").Panel({
			
			contentURL : Data.url("menu.html"),
			contentScriptFile : [
				Data.url("lib/jquery-1.10.2.min.js"),
				Data.url("lib/jquery-1.11.2-ui.js"),
                Data.url('shared.js'),
				Data.url("menu.js")
			],
			onHide : this.closeMenu.bind(this),
			onShow : this.openMenu.bind(this)
		});
		
		this.registerEventHandlers();
        this.animateIcon(1); // hack to preload animation
	},
	
	updateOnAdVisit : function(updates) {
		
		this.animateIcon(500);
		this.updateMenu(updates);
		this.updateVault(updates);
	},
	
	updateOnAdFound: function(ad) {
		
		// just reset the full view here
		this.animateIcon(500);		
		this.updateMenu();
		this.updateVault();
	},
	
	animateIcon : function(ms) {
        
        //console.log(this.buttonIconSet(true)['16']);
        this.button.icon = this.buttonIconSet(true);
        Timers.setTimeout(function() {
            
            this.button.icon = this.buttonIconSet(false);
            
        }.bind(this), ms);
    },
	
	openVault : function() {

		this.openInTab(Data.url('vault.html'));
	},
	
	updateVault : function(updates) {

		if (!this.tabsContain(Data.url('vault.html'))) { // or only this.tab?
			
			console.log("Vault closed, ignore updates...");
			return;
		}

		this.worker = this.tab.attach({
			
			contentScriptFile : [
				Data.url('lib/jquery-1.10.2.min.js'),
				Data.url('lib/d3.min.js'),
				Data.url('lib/packery.min.js'),
				Data.url('shared.js'),
				Data.url('vault-ui.js'),   
				Data.url('vault.js') 
			],
		});
		
		// handle inspector updates
        this.worker.port.on("update-inspector", function(data) { // from vault.js
            
            this.inspectorData = data;

        }.bind(this));

		var pageUrl = require('sdk/tabs').activeTab.url,
		  adhash = require("../ff/abpcomp").Component.parser.adlookup;

		if (updates) { 
			
			console.log("UIMan.updateVault->update-ads: "+updates.length);
			
			this.worker.port.emit("update-ads", { data: adhash,   // -> vault.js
			    inspectorData: this.inspectorData, updates: updates, page: pageUrl });
		}
		else {
			
			// TODO: test this case when vault is open and new ads are found (also, when first ad is found while open)
			
			// 1) Clear ads, then visit page, then open vault (initial ads should appear)
			// 2) with existing ads, visit new page, with open vault (new ads should appear, layout-recreated[save zoom??])  
			
			console.log("UIMan.updateVault->layout-ads: "+this.worker);
			
			this.worker.port.emit("layout-ads", { data: adhash, // -> vault.js
			     inspectorData: this.inspectorData, page: pageUrl }); 

		}
  	},

    menuOpen : function() {
        
        return (this.menu && this.menu.isShowing);
    }, 
    
    currentPage : function() {
        
        var pageUrl = require('sdk/tabs').activeTab.url;
        
        if (require('../config').PARSER_TEST_MODE) {

            pageUrl = require('../config').PARSER_TEST_PAGE;
            console.log("*TEST*: Using test.pageUrl: " + pageUrl);
        }
        
        return pageUrl;
    }, 

	updateMenu : function(updates) { 

		if (this.menuOpen()) {
				
			var pageUrl = this.currentPage();
			
			var adhash = require("../ff/abpcomp").Component.parser.adlookup;

			if (updates) {
				
				//console.log(updates.length, updates);
				this.menu.port.emit("update-ads", { data: adhash, updates: updates, page: pageUrl }); // -> menu.js
			}
			else {
				
				this.menu.port.emit("layout-ads", { data: adhash, page: pageUrl }); // -> menu.js
			}
		}
		else 
            console.log("Menu closed, ignore updates...");
		
	},
	
	openMenu : function(file) {

console.log('openMenu');
		//var rawAds = require('../test/test-ad-data').ads; // tmp-remove
		// if (file & this.menu) {
        // 		    
		// }
		this.updateMenu();
	},
	
	closeTab : function() {

		if (this.tab) {

			this.tab.unpin();
			this.tab.close();
		}
	},

	openLog : function() {

		this.openInTab(Data.url(//'log.html')); // for later
			"file://" + require("./logger").Logger.logFile.path));
	},
	
  	refreshLogView : function(tab) {
  		
		this.worker = tab.attach({
			//contentScriptFile : [ Data.url('log-injector.js') ],
		});
		//this.worker.port.emit("refresh-log", { "path": require("./logger").Logger.logFile.path } );
  	},
	
	openInTab : function(pageUrl) {

		if (!this.tab) {

			function refreshView() {
				
				if (this.tab.url === Data.url('vault.html')) 
					this.updateVault.apply(this);
					
				if (this.tab.url === Data.url('log.html'))
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
 
 			this.tab.url = pageUrl;
  			this.tab.activate();
		}
	},
	
	cleanupTabs : function() {
	
        var dataDir = new RegExp('^'+Data.url());
	  	for (var tab of require("sdk/tabs")) {
	
	  		if (dataDir.test(tab.url))
	        {
	    		tab.unpin();
	    		tab.close();
	    	}
		}
	},
	
	tabsContain : function(match) {
	
	  	for (var tab of require("sdk/tabs")) {
	  		
			if (tab.url === match)
	    		return true;
		}
		return false;
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
	
    openFirstRun : function(state) {

        var panel = require("sdk/panel").Panel({
            
            width : 387,
            height : 500,
            position : this.button,
            contentScriptFile : [
                Data.url("lib/jquery-1.10.2.min.js"),
                Data.url("firstrun.js")
            ],
            contentURL: require("sdk/self").data.url("firstrun.html"),
        });
        
        panel.port.on('close-firstrun',  function() {
            
            panel.hide();
            panel.destroy();
        });
        
        panel.show();
    },
    
	buttonIconSet : function(pressed) {

		return {

			"16" : this.buttonIcon(16, pressed),
			"32" : this.buttonIcon(32, pressed),
			"64" : this.buttonIcon(64, pressed)
		};
	},

	buttonIcon : function(size, pressed) {

		return Options.get('enabled')
			? (pressed ? Data.url('img/icon-v-'+size+'.png')
			     : Data.url('img/icon-'+size+'.png'))
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

		// registering menu event-handlers here
		this.menu.port.on("clear-ads", function(data) {

  			require("../ff/abpcomp").Component.parser.clearAds();
  			this.closeTab();

        }.bind(this));
        
		this.menu.port.on("show-vault", function() {

			this.menu.hide();
			this.openVault();

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

});

exports.UIManager = UIManager();