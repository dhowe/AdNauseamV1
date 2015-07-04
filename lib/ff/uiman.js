const AboutURL = "https://github.com/dhowe/AdNauseam/wiki/FAQ";
const VaultMan = require("./vaultman").VaultManager;
const Options = require("./options").Options;
const Util = require('./adnutil').AdnUtil;
const Timers = require("sdk/timers");
const Data = require("sdk/self").data;
const Tabs = require("sdk/tabs");

const { Cc, Ci, Cu } = require("chrome");
const OS = Cu.import("resource://gre/modules/osfile.jsm", {}).OS;

var UIManager = require('sdk/core/heritage').Class({

        cfx: null,
        menu: null,
        //auto: null,
        button: null,
        worker: null,
        firstRun: false,

        initialize: function() {

            //Util.log('UIManager()');

            this.cfx = !! require('sdk/system/environment').env.ADN_DEV || false;

            if (this.cfx) {

                require("sdk/preferences/service")
                    .set("javascript.options.strict", false);
            }

            this.button = require('sdk/ui/button/toggle').ToggleButton({

                    id: "adnauseam-button",
                    label: "AdNauseam",
                    icon: this.buttonIconSet(false),
                    onChange: this.handleChange.bind(this),
                });

            this.menu = require("sdk/panel").Panel({

                    contentURL: Data.url("menu.html"),

                    contentScriptFile: [
                        Data.url("lib/jquery-2.1.4.min.js"),
                        Data.url("../lib/ff/adnutil.js"),
                        Data.url('shared.js'),
                        Data.url("menu.js")
                    ],

                    // contentScriptOptions:{}, // available as self.options

                    onHide: this.closeMenu.bind(this),
                    onShow: this.openMenu.bind(this)
                });

            this.registerEventHandlers();
            //this.animateIcon(1); // hack to preload animation
        },

        updateOnAdAttempt: function(ad) {

            //Util.log('UIMan.updateOnAdAttempt('+ad.id+')');

            this.menuIsOpen() && this.menu.port.emit("set-current", {
                    current: ad
                });

            VaultMan.onAdAttempt(ad);
        },

        updateOnAdVisit: function(update) {

            //Util.log('UIMan.updateOnAdVisit('+update+')');

            require("./adncomp").Component.parser.needsWrite = true;
            this.animateIcon(500);
            this.updateMenu(update);

            VaultMan.onAdVisit(update);
        },

        updateOnAdFound: function() {

            //Util.log('UIMan.updateOnAdFound()');

            require("./adncomp").Component.parser.needsWrite = true;

            // just reset the full view here
            this.updateMenu();
            this.animateIcon(500);

            VaultMan.onAdFound();
        },

        animateIcon: function(ms) {

            this.button.icon = this.buttonIconSet(true);
            Timers.setTimeout(function() {

                    this.button.icon = this.buttonIconSet(false);

                }.bind(this), ms);
        },

        startCountInserter: function() {

            var me = this;

            this.workers = [];

            require("sdk/page-mod").PageMod({

                    include: "*",

                    attachTo: 'top', // no iframes here

                    contentScriptFile: ['./lib/jquery-2.1.4.min.js', './count-inserter.js'],

                    contentScriptWhen: "start",

                    onAttach: function(worker) {

                        me.workers.push(worker); // keep track of the workers

                        worker.on('detach', function() {
                                me.detachWorker(this, me.workers);
                            });
                    }
                });
        },

        detachWorker: function(worker, workerArray) {

            var index = workerArray.indexOf(worker);
            if (index != -1) workerArray.splice(index, 1);
        },

        injectCountOnPage: function(workers) { // count and color

            var count,
                mapEntry,
                pageUrl = this.currentPage(),
                parser = require("./adncomp").Component.parser;

            mapEntry = parser.pageMapLookup(pageUrl);
            count = (mapEntry && mapEntry.ads.length) ? mapEntry.ads.length : 0;

            if (!workers) this.startCountInserter();

            if (count && workers) {

                for (var i = 0, len = workers.length; i < len; i++) {
                    if (workers[i].url === pageUrl && workers[i].port) {
                        workers[i].port.emit('insert-count', {
                                'count': count
                            }); //, automated: auto });
                    }
                }
            }
        },

        updateBadge: function() { // count and color

            // this pref is set by the selenium harness for testing
            if (require('sdk/simple-prefs').prefs["automated"])
                this.injectCountOnPage(this.workers);

            if (Options.get('hideBadge') || !Options.get('enabled')) {

                this.button.badge = null;
                return;
            }

            var mapEntry, parser = require("./adncomp").Component.parser;

            if (parser.checkVersion("36")) {

                mapEntry = parser.pageMapLookup(this.currentPage());

                if (mapEntry && mapEntry.ads.length) {

                    this.button.badge = mapEntry.ads.length;
                    this.button.badgeColor = this.badgeColor(mapEntry.ads);

                } else {

                    this.button.badge = null;
                }
            }
        },

        badgeColor: function(ads) {

            function failedCount(ads) {

                return ads.filter(function(d) { return d.visitedTs < 0; }).length;
            }

            function visitedCount(ads) {

                return ads.filter(function(d) { return d.visitedTs > 0; }).length;
            }

            if (visitedCount(ads)) return '#BD10E0';
            return (failedCount(ads)) ? '#B80606' : '#0076FF';
        },

        updateMenu: function(update) {

            if (this.menuIsOpen()) {

                var parser = require("./adncomp").Component.parser,
                    current = parser.visitor.currentAd,
                    pageUrl = this.currentPage(), json,
                    menuAds = this.getMenuAds(parser, pageUrl);

                //Util.log('uiman::updateMenu().current: '+(current ? current.id : -1));

                if (update) {

                    this.menu.port.emit("update-ad", {

                            update: update,
                            page: pageUrl,
                            current: null // no longer being attempted

                        }); // -> from menu.js

                } else {

                    if (Options.get('enabled')) {

                        var locale = require("sdk/l10n").get,
                            msgNoAds = locale("adn.menu.alert.noAds"),
                            win = require("sdk/window/utils").getMostRecentBrowserWindow();

                        if (require("sdk/private-browsing").isPrivate(win))
                            msgNoAds = locale("adn.menu.alert.private");
                        else if (!menuAds.count && parser.adlist.length) {

                            // no page-ads, only recent
                            msgNoAds += ' ' + locale("adn.menu.alert.recent");
                        }

                        json = {

                            page: pageUrl,
                            current: current,
                            totalCount: parser.adlist.length,
                            data: menuAds.ads,  // either actual or 'recent' ads
                            pageCount: menuAds.count, // actual-ads length
                            emptyMessage: msgNoAds // localized msg
                        };
                    }

                    //Util.log('Enabled='+Options.get('enabled')+'->emit("layout-ads") :: '+(json ? json.pageCount : 0));

                    this.menu.port.emit("layout-ads", json); // -> from menu.js
                }
            }

            this.updateBadge();
        },

        getMenuAds: function(parser, pageUrl) {

            var byField = require('./adnutil').AdnUtil.byField,
                pmEntry = parser.pageMapLookup(pageUrl),
                ads = (pmEntry && pmEntry.ads),
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
        
        menuIsOpen: function() {

            return (this.menu && this.menu.isShowing);
        },

        currentPage: function() {

            var pageUrl = Tabs.activeTab.url;

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

            var inDataDir = new RegExp('^' + Data.url());

            for (var tab of Tabs) {

                if ( inDataDir.test(tab.url) || tab.url.contains(require("./logger").Logger.fileName) || tab.url.contains("log.html") ) {

                    // handle issue #333 here, checking if last tab
                    if (Tabs.length == 1)
                        tab.url = "about:blank";
                    else
                        tab.close();
                }
            }
        },

        tabsContain: function(match) {

            for (var tab of Tabs) {

                if (tab.url === match)
                    return true;
            }
            return false;
        },

        refreshMenu: function() {

            var opts = Options.toJSON(),
                locale = require("sdk/l10n").get;

            opts.startLabel = locale("adn.menu.start");
            opts.pauseLabel = locale("adn.menu.pause");

            this.menu.port.emit("refresh-panel", opts);
            this.button.icon = this.buttonIconSet();
            this.updateBadge();
        },

        handleChange: function(state) {

            if (state.checked) { // button is clicked

                if (this.menuIsOpen()) {
                  AdnUtil.log("MENU ALREADY OPEN!!!");
                }
                this.menu.show({

                        position: this.button,
                        width: 387,
                        height: 500,
                    });
            }

            this.updateMenu();
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

                        Data.url("lib/jquery-2.1.4.min.js"),
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
            (pressed ? Data.url('img/icon-v-' + size + '.png') :
                Data.url('img/icon-' + size + '.png')) :
                Data.url('img/icon-g-' + size + '.png');
        },

        closeMenu: function() {

            this.button.state('window', {
                    checked: false
                }); // required

            this.menu.port.emit("close-panel");
        },

        registerEventHandlers: function() {

            // registering menu event-handlers here
            this.menu.port.on("clear-ads", function(data) {

                    require("./logger").Logger.log('UI->clear-ads');
                    require("./adncomp").Component.parser.clearAds();
                    VaultMan.closeVault();
                    this.updateBadge();

                }.bind(this));

            this.menu.port.on("import-ads", function(data) {

                    require("./logger").Logger.log('UI->import-ads');
                    this.importAds();
                    VaultMan.openVault();

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
                    this.updateMenu();

                }.bind(this));

            this.menu.port.on("disable-logs", function(arg) {

                    require("./logger").Logger.log('UI->disable-logs: ' + arg);
                    Options.set('disableLogs', (arg && arg.value));

                }.bind(this));

            this.menu.port.on("disable-referer", function(arg) {

                    require("./logger").Logger.log('UI->disable-referer: ' + arg);
                    Options.set('disableOutgoingReferer', (arg && arg.value));

                }.bind(this));


            this.menu.port.on("clear-ads-with-history", function(arg) {

                    require("./logger").Logger.log('UI->clear-ads-with-history: ' + arg);
                    Options.set('clearAdsWithHistory', (arg && arg.value));

                }.bind(this));

            this.menu.port.on("hide-badge", function(arg) {

                    require("./logger").Logger.log('UI->hide-badge: ' + arg);
                    Options.set('hideBadge', (arg && arg.value));
                    this.updateBadge();

                }.bind(this));

            this.menu.port.on("show-about", function() {

                    require("./logger").Logger.log('UI->show-about');

                    this.menu.hide();

                    Tabs.open(AboutURL);

                }.bind(this));

            this.menu.port.on("show-log", function() {

                    this.menu.hide();

                    var Logger = require("./logger").Logger;

                    if (Options.get('disableLogs') || !Logger.ostream) {

                        var locale = require("sdk/l10n").get;
                        Logger.notify(locale("adn.notification.noLog"));
                    } else {

                        Logger.log('UI->show-log');
                        Logger.openLog();
                    }

                }.bind(this));
        },

        importAds: function(theFile) {

            var picker, parser = require("./adncomp").Component.parser;

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
                parser = require("./adncomp").Component.parser,
                data = JSON.stringify(parser.adlist, null, '  '),
                picker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);

            picker.defaultString = 'adnauseam-v' + version + '-exported-ads.json';
            picker.init(require("sdk/window/utils").getMostRecentBrowserWindow(),
                "Export Ads", Ci.nsIFilePicker.modeSave);

            picker.appendFilter("JavaScript Object Notation (JSON)", "*.json");

            rv = picker.show();

            if (rv == Ci.nsIFilePicker.returnOK || rv == Ci.nsIFilePicker.returnReplace) {

                require("./logger").Logger.log("Ad-export to: " + picker.file.path);

                var writePath = picker.file.path;
                var promise = OS.File.writeAtomic(writePath, data, { tmpPath: writePath + '.tmp' });
                promise.then(
                    function(aVal) {
                        require("./logger").Logger.log('Successfully saved to disk');
                    },
                    function(aReason) {
                        require("./logger").Logger.log('writeAtomic failed for reason:', aReason);
                    }
                );
            }
        }
    });

exports.UIManager = UIManager();
