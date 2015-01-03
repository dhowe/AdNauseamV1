const Cc = require("chrome").Cc, Ci = require("chrome").Ci;
const aboutURL = "https://github.com/dhowe/AdNauseam/wiki/FAQ";
//const AdSet = require("../ff/adset").AdSet;
const Options = require("./options").Options;
const Timers = require("sdk/timers");
const Data = require("sdk/self").data;

var UIManager = require('sdk/core/heritage').Class({

    cfx : null,
	menu : null,
	button : null,
	worker : null,
	//inspectorDataId : -1, // remove? or CHANGE-TO-LIGHTBOX-ID?

	initialize : function() {

        this.cfx = require('sdk/system/environment').env.ADN_DEV;
       
        if (this.cfx) {

            require("sdk/preferences/service")
                .set("javascript.options.strict", false);
        }
        else {

            require('../config').TEST_MODE = false;
            require('../config').PARSER_TEST_MODE = false;
        }

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
	    
	updateOnAdVisit : function(update) {

        console.log('UIMan.updateOnAdVisit('+update+')');

		this.animateIcon(500);
		this.updateMenu(update);
		require("../ffui/vaultman").VaultManager.updateVault(update);
	},
	
	updateOnAdFound: function(newad) {

        console.log('UIMan.updateOnAdFound()');
        
		// just reset the full view here
		this.animateIcon(500);		
		this.updateMenu();
		require("../ffui/vaultman").VaultManager.updateVault();
	},

	animateIcon : function(ms) {
                
        this.button.icon = this.buttonIconSet(true);
        Timers.setTimeout(function() {
            
            this.button.icon = this.buttonIconSet(false);
            
        }.bind(this), ms);
    },

    updateMenu : function(update) { 

        //console.log('UIMAN::updateMenu: '+update);

        if (this.menuIsOpen()) {
                
            var pageUrl = this.currentPage(), // ok
                parser = require("../ff/abpcomp").Component.parser,
                current = parser.visitor.currentAd,
                ads = this.toAdArray(parser.adlookup);

            if (update) {
                
                this.menu.port.emit("update-ads", { 
                    
                    data: ads, 
                    currentAd: current,
                    update: update, 
                    page: pageUrl
                     
                }); // -> from menu.js
            }
            else {

                this.menu.port.emit("layout-ads", { 
                    
                    currentAd: current,
                    page: pageUrl,
                    data: ads,  
                    
                }); // -> from menu.js
            }
        }
    },

    openLog : function() {

        //require('sdk/tabs').open(Data.url('log.html'));// for later
        require('sdk/tabs').open(Data.url
                ("file://" + require("./logger").Logger.logFile.path));
    },
    
    openAbout : function() {

        require('sdk/tabs').open(aboutURL);
    },
    
    openVault: function() {
        
        require("../ffui/vaultman").VaultManager.openVault();
    },
    
    menuIsOpen : function() {
        
        return (this.menu && this.menu.isShowing);
    }, 
    
    currentPageTitle : function() {
        
        return require('sdk/tabs').activeTab.title || 'unknown';

    },
        
    currentPage : function() {
        
        var tab = require('sdk/tabs').activeTab, pageUrl = tab.url;

var tm = require('../config').PARSER_TEST_MODE;
if (tm) {
    if (tm == 'insert' || tm == 'update') {
        pageUrl = require('../config').PARSER_TEST_PAGE;
        console.log("*TEST*: Using test.pageUrl: " + pageUrl);
    }
}
        
        return pageUrl;
    }, 
	
	openMenu : function() {

		this.updateMenu();
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
        
        var Logger = require("./logger").Logger;
        
        Logger.log('UIManager.openFirstRun');
        
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

            //console.log('UIManager.close-firstrun');

            panel.hide();
            panel.destroy();
            panel = null;
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
            require("../ffui/vaultman").VaultManager.closeVault();

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

        this.menu.port.on("disable-referer", function(arg) {

            var setting = (arg && arg.value);
            Options.set('disableOutgoingReferer', setting);

        }.bind(this));
        
		this.menu.port.on("show-about", function() {

			this.menu.hide();
			this.openAbout();
			//this.openInTab(aboutURL);

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

    importAds : function(theFile) {

        var picker, inputFile, inputStream, fileStream, tmp, theFile,
            parser = require("../ff/abpcomp").Component.parser;

        if (!theFile) { // open a prompt
            
            picker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
            picker.init(require("sdk/window/utils").getMostRecentBrowserWindow(),
                "Import Ads", Ci.nsIFilePicker.modeOpen);
                
            picker.appendFilters(Ci.nsIFilePicker.filterAll);
            
            if (picker.show() == Ci.nsIFilePicker.returnOK)
                 theFile = picker.file;
        }

        require("../ffui/logger").Logger.log("Ad-import from: "+theFile.path);

        inputFile = Cc["@mozilla.org/network/file-input-stream;1"]
            .createInstance(Ci.nsIFileInputStream); 
            
        inputStream = Cc["@mozilla.org/scriptableinputstream;1"]
            .createInstance(Ci.nsIScriptableInputStream); 
            
        inputFile.init(theFile, 0x01, 444, tmp); 
        inputStream.init(inputFile); 
        fileStream = inputStream.read(-1); // contents in fileStream 
        
        inputFile.close(); 
        inputStream.close(); 
        
        parser.adlookup = JSON.parse(fileStream);
        parser.logStats();
    },
    
    exportAds : function() {
        
        var rv, writer, version = require("sdk/self").version,
            parser = require("../ff/abpcomp").Component.parser,
            data = JSON.stringify(parser.adlookup, null, '  '),
            picker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
        
        picker.defaultString = 'adnauseam-v'+version+'-exported-ads.json';
        picker.init(require("sdk/window/utils").getMostRecentBrowserWindow(),
            "Export Ads", Ci.nsIFilePicker.modeSave);
            
        picker.appendFilter("JavaScript Object Notation (JSON)", "*.json");

        rv = picker.show();
        if (rv == Ci.nsIFilePicker.returnOK || rv == Ci.nsIFilePicker.returnReplace) {
            
            require("../ffui/logger").Logger.log("Ad-export to: "+picker.file.path);
            
            writer = File.open(picker.file.path, 'w');
            writer.write(data);
            writer.close();
        }
    },
    
    toAdArray : function(adhash, filter) {  // dup in shared.js
    
        var all = [], keys = Object.keys(adhash);
        for (var i = 0, j = keys.length; i < j; i++) {
    
            var ads = adhash[keys[i]];
            for (var k=0; k < ads.length; k++) {
    
                if (!filter || filter(ads[k]))
                    all.push(ads[k]);
            }
        }
    
        return all;
    }
});

exports.UIManager = UIManager();