// Update Add-Art JavaScript Component
const Ci = Components.interfaces;
const prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch).QueryInterface(Components.interfaces.nsIPrefBranchInternal);

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/AddonManager.jsm");

// class constructor
function ArtUpdateComponent() {
	this.wrappedJSObject = this;
}

// class definition
ArtUpdateComponent.prototype = {
	// properties required for XPCOM registration: 
	classID : Components.ID("{e1a0d171-9869-497e-8b15-be6e55697648}"),
	contractID : "@eyebeam.org/artupdate;1",
	classDescription : "Updates art feeds",

	QueryInterface : XPCOMUtils.generateQI( [ Ci.nsIObserver ]),

	// add to category manager
	_xpcom_categories : [ { category : "profile-after-change" } ],
	
	prefs : null,
	
	timer : null,
	
	switcher : null,
	
	// This will help to write debug messages to console
	myDump : function(aMessage) {
		var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
		consoleService.logStringMessage("add-art: " + aMessage);
	},

	init : function() {
		
		dump("\n[AN] ArtUpdateComponent.init");

		// Register to receive notifications of preference changes  
	       
	    this.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.add-art.");  
	    this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);  
	    this.prefs.addObserver("", this, false);  
	    
	    this.timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);  
	    this.timer.init(this, /*3600000*/5*60*1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);  
	    
		return true;
	},

	getPref: function(PrefName) {
		var Type = prefs.getPrefType(PrefName);
		if(Type == prefs.PREF_BOOL)
			return prefs.getBoolPref(PrefName);
		else if (Type==prefs.PREF_STRING)
			return prefs.getCharPref(PrefName);
		else if (Type==prefs.PREF_INT)
			return prefs.getIntPref(PrefName);
		else
			return null;
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
	
	CheckForUpdates : function() {
		var that=this;
		// This code checks for a new set of images in a .jar file on the server and 
		// downloads it when available.  This is how new art images get to the user.
		function CheckForImagesUpdate(aaExtensionPath) {
			// Constants
			const DIR_SERVICE = new Components.Constructor("@mozilla.org/file/directory_service;1","nsIProperties");
			const aaPreferences = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
			
			var myDump = function (aMessage) {
				var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
				consoleService.logStringMessage("add-art: " + aMessage);
			};
			
			// File-scope variables that we'd like to define a little early
			var date = new Date();
			var aaFileSep = null;
			var aaNextSet = null;
			var aaNextExpiration = null;
			
			// Checks to see if we have the most up-to-date set 
			var getImageSetInfo = function()
			{
				myDump("getImageSetInfo()");
				var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
				request.open("GET", urlCheckXML, true);
				request.addEventListener("load", function(aEvt)
				{
					myDump("getImageSetInfo(): response rcvd");
					var imageData = request.responseXML.getElementsByTagName("images");  

					if(!aaPreferences.prefHasUserValue("extensions.add-art.currentImageSet") // if we don't have info about the current local image set, go ahead and download images
						|| imageData[0].getAttribute("set") > aaPreferences.getIntPref("extensions.add-art.currentImageSet"))
					{	
						myDump("updating images");
						aaNextSet = imageData[0].getAttribute("set");
						aaNextExpiration = imageData[0].getAttribute("expires");	
						downloadNewImages(imageData[0].getAttribute("url"));	
					} else {
						myDump("not updating: "+ imageData[0].getAttribute("url") + ", " + aaPreferences.getIntPref("extensions.add-art.currentImageSet"));
					}
						
				});

				request.overrideMimeType('text/xml');
				request.send(null); 

			};

			// Downloads new images and stores locally
			var downloadNewImages = function(url)
			{
				var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
				req.open('GET', url, true);

				req.addEventListener("load", function(aEvt)
				{
					var outputfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
					outputfile.initWithPath(aaExtensionPath + aaFileSep + "chrome" + aaFileSep + "~images.jar");

					// file is nsIFile, data is a string
					var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);

					// use 0x02 | 0x10 to open file for appending.
					foStream.init(outputfile, 0x02 | 0x08 | 0x20, 0666, 0); 
					// write, create, truncate


					var bytes = req.responseText;
					foStream.write(bytes, bytes.length);
					foStream.close();

					aaPreferences.setIntPref("extensions.add-art.currentImageSet", aaNextSet);
					aaPreferences.setCharPref("extensions.add-art.expiration", aaNextExpiration);

					myDump("Add-Art has downloaded new images");
					that.showUpdateAlert();
				});
			 	req.overrideMimeType('text/plain; charset=x-user-defined');
				req.send(null); 	  
			};
			
			// Figure out what is the correct file separator (to handle both PCs and Macs) 
			var aaFileLoc=(new DIR_SERVICE()).get("ProfD", Components.interfaces.nsIFile).path; 
			// determine the file-separator
			if (aaFileLoc.search(/\\/) != -1) 
			{
				aaFileSep = "\\";
			} 
			else 
			{
				aaFileSep = "/";
			}	

			var urlCheckXML = aaPreferences.getCharPref("extensions.add-art.imageSetXmlUrl");
			if (urlCheckXML != null) {
				urlCheckXML = urlCheckXML+"?"+date.getTime();
			} else {
				urlCheckXML = "http://add-art.org/extension/image_set.xml?"+date.getTime();
			}
			

			that.CheckIfNewImagesReady();

			// check and see if our check-for-new-images date has elapsed
			if(aaPreferences.prefHasUserValue("extensions.add-art.expiration"))
			{	
				if(date.getTime() > aaPreferences.getCharPref("extensions.add-art.expiration"))  // need to store as string because the number is too large for an int
				{		
					getImageSetInfo(); // time to check for new images
				};
			} else
			{
				// if the preferences doesn't contain a "next download" timestamp, 
				//  then go ahead and download info about the current image set
				getImageSetInfo();
			}

			// showUpdateAlert turns on and off the alert telling users about new art.
			// Currently it can only be changed in about:config
			// If the user doesn't have the showUpdateAlert pref already, set it to true
			if(!aaPreferences.prefHasUserValue("extensions.add-art.showUpdateAlert")) {
				aaPreferences.setBoolPref("extensions.add-art.showUpdateAlert", true);
			}
		};

	// this.withExtensionPath(CheckForImagesUpdate);
	 	   	AddonManager.getAddonByID("development@add-art.org", function(aAddon) {
	 	   		var aaExtensionPath = aAddon.getResourceURI("").QueryInterface(Components.interfaces.nsIFileURL).file.path;
	 	   		CheckForImagesUpdate(aaExtensionPath);
	 	   	});
	},
	
	showUpdateAlert: function() {
		Components.classes["@mozilla.org/observer-service;1"]
          .getService(Components.interfaces.nsIObserverService)
          .notifyObservers(null, "addart-new-art", "");
	},

	withExtensionPath: function(cb) {
		const DIR_SERVICE = new Components.Constructor("@mozilla.org/file/directory_service;1","nsIProperties");
		var aaFileLoc=(new DIR_SERVICE()).get("ProfD", Components.interfaces.nsIFile).path; 
		// determine the file-separator
		if (aaFileLoc.search(/\\/) != -1) 
		{
			aaFileSep = "\\";
		} 
		else 
		{
			aaFileSep = "/";
		}

		AddonManager.getAddonByID("development@add-art.org", function(aAddon) {
			var aaExtensionPath = aAddon.getResourceURI("").QueryInterface(Components.interfaces.nsIFileURL).file.path;
			cb(aaExtensionPath);
		});
	},

	CheckForSubscriptionsUpdate : function() {
		//Here Should be some stuff for updating subscriptions.xml
	},
	
	CheckIfNewImagesReady: function() {
		// check and see if we have a new set of art (it would have been downloaded during the last
		// firefox session)
		this.withExtensionPath(
			function(aaExtensionPath) {
				var downloadedfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
				downloadedfile.initWithPath(aaExtensionPath + aaFileSep + "chrome" + aaFileSep + "~images.jar");
				if(downloadedfile.exists())
				{
					downloadedfile.moveTo(null, "images.jar");	
				}
		});

	},
	// nsIObserver interface implementation
	observe : function(aSubject, aTopic, aData) {
		Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		switch (aTopic) {
		case "profile-after-change":
			// Doing initialization stuff on FireFox start
			this.init();
			this.CheckIfNewImagesReady();
			break;
			
		case "timer-callback":
			this.CheckForUpdates();
			/*
			if (this.switcher) {
				this.switcher = false;
				this.CheckForUpdates();
			} else {
				this.switcher = true;
				this.CheckForSubscriptionsUpdate()
			};
			*/
			break;
			
		case "nsPref:changed":
			this.myDump("Pref changed: "+aData);
			switch(aData)  
		     {  
		       case "checkedSubscription":
		    	   this.myDump("Pref changed!");
		    	   this.CheckForUpdates();
		    	   break;  
		     }
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
	var NSGetFactory = XPCOMUtils.generateNSGetFactory( [ ArtUpdateComponent ]);
else
	var NSGetModule = XPCOMUtils.generateNSGetModule( [ ArtUpdateComponent ]);