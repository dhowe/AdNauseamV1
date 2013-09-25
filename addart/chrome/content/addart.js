var addart = {
	prefManager : null,

	timer : null,

	observe : function(aSubject, aTopic, aData) {
		switch (aTopic) {
		case "timer-callback":
			break;
		case "em-action-requested":
			if (aData == "item-uninstalled") {
				aSubject.QueryInterface(Components.interfaces.nsIUpdateItem);
				if (aSubject.id == "development@add-art.org") {
					//Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch).deleteBranch("extensions.addart");
				}
			}
			break;
		case "addart-new-art":
			this.showUpdateAlert();
			break;
		}
	},

	restartNow: function() {
		let canceled = Cc["@mozilla.org/supports-PRBool;1"]
			.createInstance(Ci.nsISupportsPRBool);

		Services.obs.notifyObservers(canceled, "quit-application-requested", "restart");
		if (canceled.data) return false; // somebody canceled our quit request

		// restart
		Cc['@mozilla.org/toolkit/app-startup;1'].getService(Ci.nsIAppStartup)
			.quit(Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart);
	},

	showUpdateAlert: function() {
		var gBrowser = getTopWin().gBrowser;
		var message = 'Add-Art has downloaded new images, please restart Firefox to see them.';
		var nb = gBrowser.getNotificationBox();
		var n = nb.getNotificationWithValue('addart-alert');
		if(n) {
		    n.label = message;
		} else {
			that = this;
			var restart = function() {
				that.restartNow();
			};

		    var buttons = [{
		        label: 'Restart Now',
		        callback: restart,
		    }];
		 	
		    const priority = nb.PRIORITY_WARNING_MEDIUM;
		    nb.appendNotification(message, 'addart-alert',
		                         'chrome://browser/skin/Info.png',
		                          priority, buttons);
		}
	},

	onLoad : function() {
		// initialization code
		this.initialized = true;
		this.prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

		// Setting up prefferences. (Gecko 1.8: Firefox 1.5 / Thunderbird 1.5 / SeaMonkey 1.0)
		var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		this.prefBranch = prefService.getBranch("extensions.add-art.");

		// Setting up a listener on unisntalling addon (Gecko 2.0: Firefox 4 / Thunderbird 3.3 / SeaMonkey 2.1)
		var listener = {
			onUninstalling : function(addon) {
				if (addon.id == "development@add-art.org") {
					Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch).deleteBranch("extensions.add-art");
				}
			}
		};
		try {
			Components.utils.import("resource://gre/modules/AddonManager.jsm");
			AddonManager.addAddonListener(listener);
		} catch (e) {
		}

		try {
			var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
			observerService.addObserver(this, "em-action-requested", false);
			observerService.addObserver(this, "addart-new-art", false);
		} catch (e) {
		}

		//Checking for first Run after add-on installation
		if (!this.prefBranch.prefHasUserValue("firstRunDone") || !this.prefBranch.getBoolPref("firstRunDone")) {
			this.prefBranch.setBoolPref("firstRunDone", true);
			this.installButton("nav-bar", "addart-toolbar-button", "urlbar-container");
		}
		if (!this.prefBranch.prefHasUserValue("enableMoreAds")) {
			this.prefBranch.setBoolPref("enableMoreAds", true);
		};
		if (!this.prefBranch.prefHasUserValue("expandImages")) {
			this.prefBranch.setBoolPref("expandImages", true);
		}
		if (!this.prefBranch.prefHasUserValue("imageSetXmlUrl")) {
			var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
			request.open("GET", "chrome://addart/content/subscriptions.xml");
			var d = this;
			request.addEventListener("load", function()
			{
				var subs = request.responseXML.getElementsByTagName("subscription");
				d.prefBranch.setCharPref("imageSetXmlUrl", subs[0].getAttribute('url'));
				d.prefBranch.setIntPref("checkedSubscription", 0);
			}, false);
			request.send();
		}		

	},

	onMenuItemCommand : function(e) {

	},

	onToolbarButtonCommand : function(e) {
		this.onMenuItemCommand(e);
	},

	/**
	 * Installs the toolbar button with the given ID into the given
	 * toolbar, if it is not already present in the document.
	 *
	 * @param {string} toolbarId The ID of the toolbar to install to.
	 * @param {string} id The ID of the button to install.
	 * @param {string} afterId The ID of the element to insert after. @optional
	 */
	installButton : function(toolbarId, id, afterId) {
		//if (!document.getElementById(id)) {
		var toolbar = document.getElementById(toolbarId);
		var afterElem = document.getElementById(afterId);
		if (afterElem) {
			var navBar = afterElem.parentNode;
			if (document.getElementById(id) == null) {
				// waiting for firefox bug 403959 to be solved
				//navBar.insertItem(id,afterElem.nextSibling);
				navBar.insertItem(id, afterElem);
				navBar.setAttribute("currentset", navBar.currentSet);
				document.persist("nav-bar", "currentset");
			}
		}

		if (toolbarId == "addon-bar")
			toolbar.collapsed = false;
		//}
	},

	showOptions : function() {
		window.openDialog("chrome://addart/content/subscriptions.xul", "Add-Art Options", "chrome,titlebar,toolbar,centerscreen,resizable");
	}
};

window.addEventListener("load", function() {
	addart.onLoad();
}, false);
