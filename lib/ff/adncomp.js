/*global Services:0, AddonManager:0 */

const { Cc, Ci, Cu } = require("chrome");
const contractId = '@rednoise.org/adncomp';
const addonId = "adnauseam@rednoise.org";

Cu.import("resource://gre/modules/Services.jsm", this);

var AdParser = require("./parser").AdParser;
var Options = require("./options").Options;
var Logger = require("./logger").Logger;

var AbpComponent = require('sdk/core/heritage').Class({

    initd: false,
    noPolicy: false,
    extends: require('sdk/platform/xpcom').Unknown,

    initialize: function(message) {

        //console.log('AbpComponent()');

        try {

            if (this.initd) return true;

            this.parser = AdParser(this);

            this.acquireFunctions();

            require("sdk/preferences/service").set("extensions.adblockplus.fastcollapse", false);

            Logger.log("AdNauseam initialized");

            this.initd = true;
        }
        catch (e) {

            Logger.err(e);
        }
        
        //console.log('AbpComponent() done');
    },

    // RUN FROM WITHIN ADBLOCK (DONT-TOUCH) ***
    processNode: function(wnd, node, type, loc, collapse) {

        var parentUrl = wnd.wrappedJSObject.document.URL, abpResult,
            parser = Cc[contractId].getService(Ci.nsISupports).wrappedJSObject.parser,
            isScript = (type === Ci.nsIContentPolicy.TYPE_SCRIPT),
            isHidden = (type === parser.elemHide),
            Util = require("./adnutil").AdnUtil;

        if (0) Util.log(parser.typeStr(type) + '/' + type + 
            (loc.spec || loc.selector || loc));

        // ignore scripts && pages loaded by visitor or in vault/menu
        if (isScript || parser.isAdnWorker(wnd) || parser.urlIgnoresRE.test(parentUrl))
            return Ci.nsIContentPolicy.ACCEPT;

        // this is the result adblock would return (NOTE: this has side-effects!)
        abpResult = parser.processNodeABP(wnd, node, type, loc, collapse);

        // don't do anything in private browsing mode
        if (require("sdk/private-browsing").isPrivate(wnd))
            return abpResult;

        /*if (isScript) {

            if (!abpResult) 
                Util.log('Allowing ABP-blocked SCRIPT: ' + loc.spec);
            
            var allowDomain, allowScriptDomain, domain = wnd.top.document.domain;

            // check if the page domain is whitelisted (allow all scripts from this domain)
            allowDomain = (parser.whitelistedPageDomains.some(function(re) {
                  
                return (typeof re == 'object') ? re.test(domain) : re === domain;
            }));
            
            // check if the script itself has a whitelisted domain 
            allowScriptDomain = (parser.whitelistedScriptDomains.some(function(re) {
                  
                return (typeof re == 'object') ? re.test(loc.host) : re === loc.host;
            }));

            //  Allow scripts from whitelisted domains (either for scripts or page-domains)
                 as they may generate ads we need to handle  //    
            
            if (allowDomain) {

                if (!abpResult) Util.log("*** Allowing ABP-blocked script (by page-domain): " + loc.spec);

                return Ci.nsIContentPolicy.ACCEPT;
            }
            else if (allowScriptDomain) {

                if (!abpResult) Util.log("*** Allowing ABP-blocked script (by script-domain): " + loc.spec);

                return Ci.nsIContentPolicy.ACCEPT;
            }
            else  {
            
                if (!abpResult) Util.log("*** Blocking script: " + loc.spec + " ("+domain+", "+loc.host+")");
                    
                return abpResult;
            }
        }*/

        // hack to force/allow top-level document here, but not elem-hides
        if (!node.ownerDocument && !abpResult && !isHidden) {

            if (type != Ci.nsIContentPolicy.TYPE_IMAGE) 
                Util.log('OVERRIDE/ALLOW ABP-blocked' + parser.typeStr(type) + 
                    ', selector=' + loc.selector + '\n\t\t\t' + loc.spec);

            return Ci.nsIContentPolicy.ACCEPT;
        }

        // if we're blocking or hiding (abpResult=false), pass to parser
        return (abpResult || !Options.get('enabled')) ? abpResult :
            parser.handleAd(wnd, node, type, loc, collapse, abpResult);
    },

    acquireFunctions: function() {

        this.retrievePolicy();

        if (typeof this.Policy != 'undefined' && this.Policy) {

            this.parser.elemHide = this.Policy.type.ELEMHIDE; // store elemHide const
            this.parser.processNodeABP = this.Policy.processNode; // save the old
            this.Policy.processNode = this.processNode; // reassign our new one
        }
    },

    retrievePolicy: function() {

        // redirect ABP.processNode() calls to our own parser function
 
        var modules = ["adblockplus", "adblockedge"],
            result;

        for (var i = 0; i < modules.length; i++) {

            result = {};
            result.wrappedJSObject = result;

            //console.log("Trying "+modules[i]);
            Services.obs.notifyObservers(result, modules[i] + '-require', 'contentPolicy');

            if (result.exports) {
                //console.log('OK');
                break;
            }
            // else console.log('FAIL');       
        }

        if (!result.exports || !result.exports.Policy)
            return this.disable('No Adblock-Plus! AdNauseam will be installed,' +
                ' but remain disabled until you install Adblock-Plus or Adblock-Edge');

        if (!result.exports.Policy.processNode)
            return this.disable('AdNauseam is incompatible with this Adblocker!');

        this.Policy = result.exports.Policy; // save for cleanup	
    },

    restoreFunctions: function() {

        // restore processNode calls back to adblock

        if (this.noPolicy) return; // already disabled b/c ABP is missing

        if (typeof this.Policy == 'undefined' || !this.Policy) 
            this.retrievePolicy();

        if (!(this.Policy && this.parser && this.parser.processNodeABP)) {

            Logger.warn('Unable to restore Policy to ABP!\n' +
                this.Policy + ' ' + this.parser + ' ' +
                typeof this.parser.processNodeABP + ')');

            return;
        }

        Logger.log('AdNauseam: restoring ABP functions');

        this.Policy.processNode = this.parser.processNodeABP;
    },

    disable: function(alertMsg) {

        if (alertMsg) Logger.alert(alertMsg);

        this.noPolicy = true;

        Options.set('enabled', false);

        require("chrome").Cu.import("resource://gre/modules/AddonManager.jsm");

        AddonManager.getAddonByID(addonId, function(addon) {

                addon.userDisabled = true;
                Logger.log("AddonManager->userDisabled = " + addon.userDisabled);
            });

        return false;
    },

    enabled: function(val) {

        if (val) {

            this.unpause();
        } else {

            this.pause();
        }
    },

    restart: function() {

        Logger.log('AdNauseam[comp] restart');

        try {

            if (!this.parser)
                throw Error('no parser!');

            this.parser.restart();

        } catch (e) {

            Logger.err(e);
        }
    },

    stop: function(reason) {

        try {

            var sanitizeOnShutdown = require("sdk/preferences/service")
                .get("privacy.sanitize.sanitizeOnShutdown");

            var clearHistoryOnExit = 

            this.restoreFunctions();

            require("./vaultman").VaultManager.closeVault();

            this.parser && (this.parser.stop());

            if (sanitizeOnShutdown &&  // only if selected in options
                require("./options").Options.get("clearAdsWithHistory")) 
            {
        
                Logger.log('UI->clear-ads-with-history-exit');
                require("./adncomp").Component.parser.clearAds();
                Logger.log('Clear logs...');
                Logger.dispose(true);
            }
            else {
            
                Logger.log('Shutdown complete');
            }
        } 
        catch (e) { // ignore

            //console.error(e) // throw e;
        }
    },

    pause: function() {

        require("./uiman").UIManager.closeTab();

        this.parser && (this.parser.pause());

        Logger.log('AdNauseam[comp] paused (Options.enabled=false)');
    },

    unpause: function() {

        Logger.log('AdNauseam[comp] unpaused (Options.enabled=true)');

        this.parser && (this.parser.unpause());
    },

    get wrappedJSObject() this
});

exports.Component = AbpComponent();