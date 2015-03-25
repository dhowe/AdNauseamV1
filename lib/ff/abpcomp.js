/*global Services:0, AddonManager:0 */

const Cc = require("chrome").Cc, Ci = require("chrome").Ci;
const contractId = '@rednoise.org/abpcomp';
const addonId = "adnauseam@rednoise.org";

require("chrome").Cu.import("resource://gre/modules/Services.jsm", this);

var AdParser = require("./parser").AdParser;
var Options = require("./options").Options;
var Logger = require("./logger").Logger;

var AbpComponent = require('sdk/core/heritage').Class({

    initd: false,
    noPolicy: false,
    extends: require('sdk/platform/xpcom').Unknown,

    initialize: function(message) {

        try {

            if (this.initd) return true;

            this.parser = AdParser(this);

            this.acquireFunctions();

            require("sdk/preferences/service").set("extensions.adblockplus.fastcollapse", false);

            Logger.log("AdNauseam initialized");

            this.initd = true;
        } catch (e) {

            Logger.err(e);
        }
    },

    // RUN FROM WITHIN ADBLOCK (DONT-TOUCH) ***
    processNode: function(wnd, node, type, loc, collapse) {

        var parentUrl = wnd.wrappedJSObject.document.URL,
            parser = Cc[contractId].getService(Ci.nsISupports).wrappedJSObject.parser,
            isScript = (type === Ci.nsIContentPolicy.TYPE_SCRIPT),
            isHidden = (type === parser.elemHide);

        if (0) require("./adnutil").AdnUtil.log(parser.typeStr(type) + (loc.spec || loc.selector || loc));

        // ignore pages loaded by visitor or in vault/menu
        if (parser.isAdnWorker(wnd) || parser.urlIgnoresRE.test(parentUrl))
            return Ci.nsIContentPolicy.ACCEPT;

        // this is the result adblock would return (NOTE: this has side-effects!)
        var abpResult = parser.processNodeABP(wnd, node, type, loc, collapse);

        // don't do anything in private browsing mode
        if (require("sdk/private-browsing").isPrivate(wnd))
            return abpResult;

        if (isScript) {

            //console.log("domain: "+wnd.top.document.domain);

            var allowDomain = (parser.allowScriptDomains.some(function(re) {
                  
                return re.test(wnd.top.document.domain);
            }));

            // Allow whitelisted scripts as they may generate ads we need to handle? (see issue 245)    
            
            if (allowDomain) {

                if (!abpResult) require("./adnutil").AdnUtil.warn("*** Allowing ABP-blocked script: " + loc.spec);

                return Ci.nsIContentPolicy.ACCEPT;
            }
            else  {
            
                if (!abpResult) require("./adnutil").AdnUtil.warn("*** Blocking script: " + loc.spec);
                    
                return abpResult;
            }
        }

        // hack to force/allow top-level document here, but not elem-hides
        if (!node.ownerDocument && !abpResult && !isHidden) {

            if (type != Ci.nsIContentPolicy.TYPE_IMAGE) Logger.log('OVERRIDE/ALLOW' +
                    ' -> type=' + type + ', selector=' + loc.selector + '\n\t\t\t' + loc.spec);

            return Ci.nsIContentPolicy.ACCEPT;
        }

        // if we're blocking or hiding (abpResult=false), pass to parser
        return (abpResult || !Options.get('enabled')) ? abpResult :
            parser.handleAd(wnd, node, type, loc, collapse, abpResult);
    },

    acquireFunctions: function() {

        this.retrievePolicy();

        if (this.Policy) {

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
            return this.disable('AdNauseam is incompatible with this version of Adblock!');

        this.Policy = result.exports.Policy; // save for cleanup	
    },

    restoreFunctions: function() {

        // restore processNode calls back to adblock

        if (this.noPolicy) return; // already disabled b/c ABP is missing

        if (!this.Policy) this.retrievePolicy();

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

            this.restoreFunctions();

            require("./vaultman").VaultManager.closeVault();

            this.parser && (this.parser.stop());

            Logger.log('Shutdown complete');
        } catch (e) {

            //Logger.err(e);
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