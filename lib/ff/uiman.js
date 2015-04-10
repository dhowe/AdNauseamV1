const AboutURL = "https://github.com/dhowe/AdNauseam/wiki/FAQ";
const VaultMan = require("./vaultman").VaultManager;
const Options = require("./options").Options;
const Timers = require("sdk/timers");
const Data = require("sdk/self").data;

const { Cc, Ci, Cu } = require("chrome"); //.Cc, Ci = require("chrome").Ci, Cu = require("chrome").Cu;
const { OS } = Cu.import("resource://gre/modules/osfile.jsm", {});

var UIManager = require('sdk/core/heritage').Class({

        cfx: null,
        menu: null,
        button: null,
        worker: null,
        firstRun: false,

        initialize: function() {

            this.cfx = require('sdk/system/environment').env.ADN_DEV;

            if (this.cfx) {

                require("sdk/preferences/service")
                    .set("javascript.options.strict", false);
            } else {
                //require('../config').TEST_MODE = false;
                //Options.PARSER_TEST_MODE = false;
            }

            this.button = require('sdk/ui/button/toggle').ToggleButton({

                    id: "adnauseam-button",
                    label: "AdNauseam",
                    icon: this.buttonIconSet(false),
                    onChange: this.handleChange.bind(this)
                });

            this.menu = require("sdk/panel").Panel({

                    contentURL: Data.url("menu.html"),

                    contentScriptFile: [
                        Data.url("lib/jquery-1.11.2.min.js"),
                        Data.url("../lib/ff/adnutil.js"),
                        Data.url('shared.js'),
                        Data.url("menu.js")
                    ],

                    // contentScriptOptions:{}, // available as self.options

                    onHide: this.closeMenu.bind(this),
                    onShow: this.openMenu.bind(this)
                });

            this.registerEventHandlers();
            this.animateIcon(1); // hack to preload animation
        },

        updateOnAdAttempt: function(ad) {

            //console.log('UIMan.updateOnAdAttempt('+ad.id+')');

            this.menuIsOpen() && this.menu.port.emit("set-current", {
                    current: ad
                });
            VaultMan.onAdAttempt(ad);
        },

        updateOnAdVisit: function(update) {

            //console.log('UIMan.updateOnAdVisit('+update+')');

            require("./abpcomp").Component.parser.needsWrite = true;
            this.animateIcon(500);
            this.updateMenu(update);
            VaultMan.onAdVisit(update);
        },

        updateOnAdFound: function() {

            //console.log('UIMan.updateOnAdFound()');

            // just reset the full view here
            require("./abpcomp").Component.parser.needsWrite = true;
            this.animateIcon(500);
            this.updateMenu();

            VaultMan.onAdFound();
        },

        animateIcon: function(ms) {

            this.button.icon = this.buttonIconSet(true);
            Timers.setTimeout(function() {

                    this.button.icon = this.buttonIconSet(false);

                }.bind(this), ms);
        },

        updateMenu: function(update) {

            //console.log('UIMAN::updateMenu: '+update);

            if (this.menuIsOpen()) {

                var parser = require("./abpcomp").Component.parser,
                    current = parser.visitor.currentAd,
                    pageUrl = this.currentPage(),
                    menuAds = this.getMenuAds(parser, pageUrl);

                //console.log('uiman::updateMenu().current: '+(current ? current.id : -1));

                if (update) {

                    if (update.pageUrl != pageUrl) require("./logger").Logger.warn("Illegal-state: mismatched-pageUrl: ad.pageUrl=" + update.pageUrl + " pageUrl=" + pageUrl);

                    this.menu.port.emit("update-ad", {

                            update: update,
                            page: pageUrl,

                            // no longer being attempted
                            current: null

                        }); // -> from menu.js
                } else {

                    //console.log('emit("layout-ads") :: '+menuAds.ads.length, menuAds.count);

                    this.menu.port.emit("layout-ads", {

                            page: pageUrl,
                            current: current,
                            data: menuAds.ads,
                            pageCount: menuAds.count,
                            totalCount: parser.adlist.length

                        }); // -> from menu.js
                }
            }
        },

        getMenuAds: function(parser, pageUrl) {

            var byField = require('./adnutil').AdnUtil.byField,
                pageMap = parser.pageMapLookup(pageUrl),
                ads = (pageMap && pageMap.ads),
                count = 0;

            if (ads && ads.length) {

                ads.sort(byField('-foundTs')); // sort by found-time
                count = ads.length;
            } else {

                ads = this.recentAds(parser, byField);
            }

            return {
                ads: ads,
                count: count
            };
        },

        recentAds: function(parser, byField) {

            var recent = [],
                ads = parser.adlist,
                num = 5;

            ads.sort(byField('-foundTs'));

            for (var i = 0; recent.length < num && i < ads.length; i++)
                recent.push(ads[i]); // put pending ads first

            if (parser.visitor.currentAd && parser.visitor.currentAd.visitedTs === 0) {
                ads.unshift(parser.visitor.currentAd);
                ads.pop();
            }

            return recent;
        },

        openLog: function() {

            //require('sdk/tabs').open(Data.url('log.html'));// for later
            require('sdk/tabs').open(Data.url("file://" + require("./logger").Logger.logFile.path));
        },

        menuIsOpen: function() {

            return (this.menu && this.menu.isShowing);
        },

        currentPage: function() {

            var tab = require('sdk/tabs').activeTab,
                pageUrl = tab.url;

            var tm = require('../config').PARSER_TEST_MODE;
            if (tm) {
                if (tm == 'insert' || tm == 'update') {
                    pageUrl = require('../config').PARSER_TEST_PAGE;
                    require("./adnutil").AdnUtil.log("*TEST*: Using test.pageUrl: " + pageUrl);
                }
            }

            return pageUrl;
        },

        openMenu: function() {

            this.updateMenu();
        },

        cleanupTabs: function() {

            var dataDir = new RegExp('^' + Data.url());
            for (var tab of require("sdk/tabs")) {

                if (dataDir.test(tab.url)) {
                    tab.unpin();
                    tab.close();
                }
            }
        },

        tabsContain: function(match) {

            for (var tab of require("sdk/tabs")) {

                if (tab.url === match)
                    return true;
            }
            return false;
        },

        refreshMenu: function() {

            this.menu.port.emit("refresh-panel", Options.toJSON());
            this.button.icon = this.buttonIconSet();
        },

        handleChange: function(state) {

            if (state.checked) {

                this.menu.show({

                        position: this.button,
                        width: 387,
                        height: 500,
                    });
            }

            this.refreshMenu();
        },

        openFirstRun: function(state) {

            require("./logger").Logger.log('UIManager.openFirstRun');

            var panel = require("sdk/panel").Panel({

                    width: 387,
                    height: 500,
                    position: this.button,
                    contentURL: require("sdk/self").data.url("firstrun.html"),

                    contentScriptFile: [

                        Data.url("lib/jquery-1.11.2.min.js"),
                        Data.url("firstrun.js")
                    ],

                    contentScriptOptions: {

                        version: require("sdk/self").version
                    }
                });

            panel.port.on('close-firstrun', function() {

                    panel.hide();
                    panel.destroy();
                    panel = null;
                });

            // TODO: verify ads in storage here??

            panel.show();
        },

        buttonIconSet: function(pressed) {

            return {

                "16": this.buttonIcon(16, pressed),
                "32": this.buttonIcon(32, pressed),
                "64": this.buttonIcon(64, pressed)
            };
        },

        buttonIcon: function(size, pressed) {

            return Options.get('enabled') ? 
                (pressed ? Data.url('img/icon-v-' + size + '.png')
                : Data.url('img/icon-' + size + '.png'))
                : Data.url('img/icon-g-' + size + '.png');
        },

        closeMenu: function() {

            this.button.state('window', {
                    checked: false
                }); // required
            this.menu.port.emit("close-panel"); // -> menu.js		
        },

        registerEventHandlers: function() {
          
            // registering menu event-handlers here
            this.menu.port.on("clear-ads", function(data) {

                    require("./logger").Logger.log('UI->clear-ads');
                    require("./abpcomp").Component.parser.clearAds();
                    VaultMan.closeVault();

                }.bind(this));

            this.menu.port.on("import-ads", function(data) {

                    require("./logger").Logger.log('UI->import-ads');
                    this.importAds();

                }.bind(this));

            this.menu.port.on("export-ads", function(data) {

                    require("./logger").Logger.log('UI->export-ads');
                    this.exportAds();

                }.bind(this));

            this.menu.port.on("show-vault", function() {

                    require("./logger").Logger.log('UI->show-vault');
                    this.menu.hide();
                    VaultMan.openVault();

                }.bind(this));

            this.menu.port.on("toggle-enabled", function() {

                    require("./logger").Logger.log('UI->toggle-enabled');
                    Options.toggle('enabled');

                }.bind(this));

            this.menu.port.on("disable", function() {

                    require("./logger").Logger.log('UI->toggle-disabled');
                    Options.toggle('enabled');

                }.bind(this));

            this.menu.port.on("disable-logs", function(arg) {

                    require("./logger").Logger.log('UI->disable-logs');
                    Options.set('disableLogs', (arg && arg.value));

                }.bind(this));

            this.menu.port.on("disable-referer", function(arg) {

                    require("./logger").Logger.log('UI->disable-referer');
                    Options.set('disableOutgoingReferer', (arg && arg.value));

                }.bind(this));

            this.menu.port.on("show-about", function() {

                    require("./logger").Logger.log('UI->show-about');

                    this.menu.hide();

                    require('sdk/tabs').open(AboutURL);

                }.bind(this));

            this.menu.port.on("show-log", function() {

                    this.menu.hide();

                    var Logger = require("./logger").Logger;
                    
                    if (Options.get('disableLogs') || !Logger.ostream) {

                        Logger.notify("No log available (AdNauseam is disabled or" +
                            " the 'disable-logs' preference is checked)"); // TODO: localize
                    } 
                    else {
                    
                        Logger.log('UI->show-log');
                        this.openLog();
                    }

                }.bind(this));
        },

        importAds: function(theFile) {

            var picker,
                //, inputFile, inputStream, fileStream, tmp,
                parser = require("./abpcomp").Component.parser;

            if (!theFile) { // open a prompt

                picker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
                picker.init(require("sdk/window/utils").getMostRecentBrowserWindow(),
                    "Import Ads", Ci.nsIFilePicker.modeOpen);

                picker.appendFilters(Ci.nsIFilePicker.filterAll);

                if (picker.show() == Ci.nsIFilePicker.returnOK)
                    theFile = picker.file;
            }

            if (theFile) {
                require("./logger").Logger.log("Ad-import from: " + theFile.path);

                /*inputFile = Cc["@mozilla.org/network/file-input-stream;1"]
                .createInstance(Ci.nsIFileInputStream); 
                
            inputStream = Cc["@mozilla.org/scriptableinputstream;1"]
                .createInstance(Ci.nsIScriptableInputStream); 
                
            inputFile.init(theFile, 0x01, 444, tmp); 
            inputStream.init(inputFile); 
            fileStream = inputStream.read(-1); // contents in fileStream 
            
            inputFile.close(); 
            inputStream.close(); */

                var promise = OS.File.read(theFile.path, {
                        encoding: "utf-8"
                    });
                promise = promise.then(function onSuccess(data) {

                        parser.doImport(JSON.parse(data));
                        parser.logStats();
                    });
            }
        },

        exportAds: function() {

            var rv, version = require("sdk/self").version,
                parser = require("./abpcomp").Component.parser,
                data = JSON.stringify(parser.adlist, null, '  '),
                picker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);

            picker.defaultString = 'adnauseam-v' + version + '-exported-ads.json';
            picker.init(require("sdk/window/utils").getMostRecentBrowserWindow(),
                "Export Ads", Ci.nsIFilePicker.modeSave);

            picker.appendFilter("JavaScript Object Notation (JSON)", "*.json");

            rv = picker.show();
            if (rv == Ci.nsIFilePicker.returnOK || rv == Ci.nsIFilePicker.returnReplace) {

                require("./logger").Logger.log("Ad-export to: " + picker.file.path);

                /*writer = require("sdk/io/file").open(picker.file.path, 'w');
            writer.write(data);
            writer.close();*/

                OS.File.writeAtomic(picker.file.path, data, {
                        encoding: "utf-8",
                        tmpPath: "export.tmp"
                    });
            }
        }
    });

exports.UIManager = UIManager();