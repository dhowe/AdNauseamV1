// Main Add-Art JavaScript Component
const Ci = Components.interfaces;
const prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch).QueryInterface(
        Components.interfaces.nsIPrefBranchInternal);

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

dump("\n[AN] Loading ClickerComponent");
/*******************************************************************************
 * class definition
 ******************************************************************************/

// class constructor
function ClickerComponent() {
    this.wrappedJSObject = this;
}

// class definition
ClickerComponent.prototype = {
	
    // properties required for XPCOM registration: 
    classID : Components.ID("{741b4765-dbc0-c44e-9682-a3182f8fa1dd}"),
    contractID : "@eyebeam.org/clicker;1",
    classDescription : "link clicker",

    QueryInterface : XPCOMUtils.generateQI( [ Ci.nsIObserver ]),

    // add to category manager
    _xpcom_categories : [ {
        category : "profile-after-change"
    	}
    ],


    init : function() {
    	
        dump("\n[AN] ClickerComponent.init");
        
        let result = {};
        result.wrappedJSObject = result;
        Services.obs.notifyObservers(result, "adblockplus-require", 'contentPolicy');

        Policy = result.exports.Policy;
        
        // if everything is OK we continue 
        if (!Policy)
            return false;
        
        this.loadImgArray();

        // Installing our hook
        // does Policy.processNode exist?
        if (!Policy.processNode) {
            dump("no processNode");
        }
        
        Policy.oldprocessNode = Policy.processNode;
        Policy.processNode = this.processNodeForAdBlock;

        this.setPref("extensions.adblockplus.fastcollapse",false);

        return true;
    },

    // processNodeForAdBlock : function(wnd, node, contentType, location, collapse) {
        // //this will be run in context of AdBlock Plus
        // return Components.classes['@eyebeam.org/clicker;1'].getService()
        	// .wrappedJSObject.processNodeForAddArt(wnd, node, contentType, location, collapse);
    // },
//     
    // processNodeForAddArt : function(wnd, node, contentType, location, collapse) {
//     	
    
    getPref: function(PrefName) {
        var Type = prefs.getPrefType(PrefName);
        if(Type == prefs.PREF_BOOL)
            return prefs.getBoolPref(PrefName);
        else if (Type==prefs.PREF_STRING)
            return prefs.getCharPref(PrefName);
        else if (Type==prefs.PREF_INT)
            return prefs.getIntPref(PrefName);
    },
    
    setPref: function(PrefName, prefValue) {
        if(this.getPref(PrefName)!==prefValue) {
            var Type = prefs.getPrefType(PrefName);
            if (Type==prefs.PREF_BOOL)
                prefs.setBoolPref(PrefName, prefValue);
            else if (Type==prefs.PREF_STRING)
                prefs.setCharPref(PrefName, prefValue);
            else if (Type==prefs.PREF_INT)
                prefs.setIntPref(PrefName, prefValue);
        }
    },
    
    // nsIObserver interface implementation
    observe : function(aSubject, aTopic, aData) {
        var observerService = Components.classes["@mozilla.org/observer-service;1"]
        	.getService(Components.interfaces.nsIObserverService);
        switch (aTopic) {
        case "profile-after-change":
            // Doing initialization stuff on FireFox start
            this.init();
            break;
        }
    }
};

/**
 * XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4,
 * SeaMonkey 2.1). XPCOMUtils.generateNSGetModule was introduced in Mozilla 1.9
 * (Firefox 3.0).
 */
if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory( [ ClickerComponent ]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule( [ ClickerComponent ]);
