/*global Services */

var prefs = require('sdk/simple-prefs').prefs;
var data = require("sdk/self").data;

// Note: Loaded before we have a logger

require("chrome").Cu.import("resource://gre/modules/Services.jsm");

var Options = require('sdk/core/heritage').Class({

        tab: null,
        worker: null,

        initialize: function() {

            //console.log('Options()');

            require('sdk/simple-prefs').on('', function(pname) { // any pref change

                    require("./logger").Logger.log("Options." + pname + "=" + prefs[pname]);

                    if (pname === 'enabled') {

                        if (prefs[pname]) 
                            require("./adncomp").Component.parser.visitor.pollQueue();
                        
                        require("./uiman").UIManager.refreshMenu();
                        
                    } else if (pname === 'disableLogs' && prefs['disableLogs']) {

                        require("./logger").Logger.reset();
                    }
                });                
        },

        get: function(pname) {

            if (typeof prefs[pname] === 'undefined') {

                require("./logger").Logger.warn("No pref for: " + pname + "! returning null");
                return;
            }

            return prefs[pname];
        },

        set: function(pname, val) {

            prefs[pname] = val;
        },

        toggle: function(pname) {

            if (typeof prefs[pname] == 'undefined')
                throw Error("No pref for: " + pname);

            prefs[pname] = !prefs[pname];
        },

        toJSON: function() {

            var options = {};

            options.enabled = prefs['enabled'];
            options.hideBadge = prefs['hideBadge'];
            options.disableLogs = prefs['disableLogs'];
            options.clearAdsWithHistory = prefs['clearAdsWithHistory'];
            options.disableOutgoingReferer = prefs['disableOutgoingReferer'];
            options.disableOutgoingCookies = prefs['disableOutgoingCookies'];
            options.disableIncomingCookies = prefs['disableIncomingCookies'];
            options.platformVersion = Services.appinfo.platformVersion;
            options.production = !require("./uiman").UIManager.cfx;
            options.version = require("sdk/self").version;

            return options;
        },

        dump: function(logger) {

            if (!logger) throw Error("no logger!");

            var s = '[Options]',
                opts = this.toJSON(),
                count = 0;

            for (var pref in opts) {

                if (opts.hasOwnProperty(pref))
                    s += '\n\t\t\t' + pref + '=' + opts[pref];
            }

            logger.log(s);
        },

    });

exports.Options = Options();