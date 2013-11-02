
// AdNauseam Namespace         

if ("undefined" == typeof (AdNauseam)) {
	
	if ( typeof dump === 'function')
		dump('\n[UI] Initializing Namespace');
		
	var AdNauseam = {}; 
};

AdNauseam.UI = {
	
	prefs : null,
	initd : false,
	snapdir : 'adsnaps',
	logfile : 'adnauseam.log',
	skin : 'chrome://adnauseam/skin',
    website : 'http://rednoise.org/adnauseam', // label
    gallery : "chrome://adnauseam/content/display/index.html",
    captures : [],

    
	init : function() {
		
		if (this.initd) return; 
		
		dump('\n[UI] AdNauseam.UI.init (6)');

		 // Register to receive notifications of preference changes
     
     	this.prefs = Cc["@mozilla.org/preferences-service;1"]
        	.getService(Ci.nsIPrefService).getBranch("extensions.adnauseam.");
 		this.prefs.QueryInterface(Ci.nsIPrefBranch2);
 		this.prefs.addObserver("", this, false);
		
		try {
 			var adncomp = Cc['@rednoise.org/adnauseam;1'].getService();
			this.component = adncomp.wrappedJSObject;
			this.component.visitor.init();
			this.gBrowser = this.component.getGBrowser(); 
 		}
 		catch(e) {
 			dump(e);
 		}

     	if (!this.prefs.getBoolPref("firstrundone")) {
     		
			dump('\n[UI] FirstRun: Installing menu-button');
    		this.prefs.setBoolPref("firstrundone", true);
		    this.installButton("nav-bar", "adnauseam-button");	
		    this.installButton("addon-bar", "adnauseam-button");
  		}
  		
     	this.refresh();
     	
     	//this.viewSnaps();
	},
	
	///////////////////////////////////////////////////////////////	

	/* New Checkboxes:
		-- add to refresh() 
		-- add to oncheckChange()
		-- need a setter/getter above
		-- and an entry in defaults.js
	*/


	
	refresh : function() { 

		var e = this.enabled(), c = this.capturing(), h = this.highlighting();
		
		document.getElementById("adnauseam-enabled-checkbox").setAttribute("checked", e);
			
		document.getElementById("adnauseam-savecaptures-checkbox").setAttribute("checked", c);
			
		document.getElementById("adnauseam-highlightads-checkbox").setAttribute("checked", h);
			
		document.getElementById("adnauseam-button").style.listStyleImage = 
				'url('+this.skin+(e ? "/adn.png" : "/adng.png");  // dont touch
	},
	
	onCheckChange : function(e) // new checkboxes go here
	{
		this.capturing(document.getElementById
			("adnauseam-savecaptures-checkbox").hasAttribute("checked"));
			
		this.enabled(document.getElementById
			("adnauseam-enabled-checkbox").hasAttribute("checked"));	
			
		this.highlighting(document.getElementById
			("adnauseam-highlightads-checkbox").hasAttribute("checked"));
			
		e && (e.stopPropagation());		
	}, 
	
	/////////////////////////////////////////////////////////////////////////////////

	enabled : function(v) {
		
		if (arguments.length) {
			this.prefs.setBoolPref("enabled",v);
			return this;	
		}
		return this.prefs.getBoolPref("enabled");	
	},
	
	capturing : function(v) {
		if (arguments.length) {
			this.prefs.setBoolPref("savecaptures",v);
			return this;	
		}
		return this.prefs.getBoolPref("savecaptures");	
	},
	
	highlighting : function(v) {
		if (arguments.length) {
			this.prefs.setBoolPref("highlightads",v);
			return this;	
		}
		return this.prefs.getBoolPref("highlightads");	
	},
	
	viewCaptures : function(e)
	{
		this.viewSnaps(e);
	},
	
	clearHistory : function(e)
	{
		this.component.clearLog();

		this.closeTab(/adnauseam\.log$/); // use 'this.logfile' instead
		this.viewLog();
		
		var file = this.getProfDir();
		file.append(this.snapdir);
		file.exists() && (file.remove(true));
		
		this.component.log('History [logs/captures] cleared');
	},
	
	viewLog : function(e)
	{
		var file = this.getProfDir();
		file.append(this.logfile);
		this.openInReusableTab("adn-log", file.path);
		e && (e.stopPropagation());
	}, 
	
	viewHelp : function(e)
	{
		this.openInReusableTab("adn-help", this.website+'/help.html');
		e && (e.stopPropagation());
	}, 
	
	
	viewHome : function(e)
	{
		this.openInReusableTab("adn-home",this.website);
		e && (e.stopPropagation());
	},

	
	/////////////////////////////////////////////////////////////////////////////////
	
	shutdown : function() {
		
		dump('\n[UI] AdNauseam.UI.shutdown()');
	},
	
	observe: function(subject, topic, data) {

		if (topic != "nsPref:changed") return;

		//dump("\n[UI] Pref-change: " + data + "="+this.prefs.getBoolPref(data));
		
		this.component.observe(subject, topic, data);
		
		this.refresh();
		
		//dump("\n[UI] Pref-change-complete: " +this.prefs.getBoolPref(data)+"\n");
	},

	closeTab : function(urlRegex) {
		
		//dump('\n[UI] closeTab('+urlRegex+');');

		var gBrowser =this.getBrowser(), tabs = gBrowser.tabs;
		for (var i = 0; i < tabs.length; i++)
		{
		  var tab = tabs[i];
		  var browser = gBrowser.getBrowserForTab(tab);
		  if (browser.currentURI && urlRegex.test(browser.currentURI.spec))
		    gBrowser.removeTab(tab);
		}
	},
	
	
	findTab : function(attrName, focus) {

		var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

		for (var found = false, index = 0, tabbrowser = wm.getEnumerator('navigator:browser')
			.getNext().gBrowser; index < tabbrowser.tabContainer.childNodes.length && !found; index++) 
		{
			// Get the next tab
			var currentTab = tabbrowser.tabContainer.childNodes[index];

			// Does this tab contain our custom attribute?
			if (currentTab && currentTab.hasAttribute(attrName)) {

				if (focus) {

					// Yes--select and focus it.
					tabbrowser.selectedTab = currentTab;

					// Focus *this* browser window in case another one has focus
					tabbrowser.ownerDocument.defaultView.focus();
				}

				return currentTab;
			}
		}

		return null;
	},
	
	

	openInReusableTab : function(attrName, url) {

		//dump('\n[UI] openInReusableTab('+url+');');

		var tab = this.findTab(attrName, true);
		
		if (!tab) {
			
			//dump('\n[UI] New tab: '+url);
			
			var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
			
			// Our tab isn't open. Open it now.
			var browserEnumerator = wm.getEnumerator("navigator:browser");
			var tabbrowser = browserEnumerator.getNext().gBrowser;
	
			// Create tab
			tab = tabbrowser.addTab(url);
			tab.setAttribute(attrName, true);
	
			// Focus tab
			tabbrowser.selectedTab = tab;
	
			// Focus *this* browser window in case another one is currently focused
			tabbrowser.ownerDocument.defaultView.focus();
		}
		
		return tab;
	},
	
	viewSnaps : function(e)
	{		
		var file = this.getProfDir();
		file.append(this.snapdir);
		if (!file.exists()) {
			dump("\n[UI] file.create("+file.path+")");
			file.create(file.DIRECTORY_TYPE, 0775);
		}
		//file.QueryInterface(Ci.nsILocalFile);
		
		//dump("\n[UI] viewSnaps("+file.path+")");
		
		var children = null;
		try {
			children = file.directoryEntries;
		}
		catch(e) {
			dump("\nERROR: "+e)
		}
				
		var child, leaf;
		
		while (children.hasMoreElements()) {
		  
		  child = children.getNext().QueryInterface(Ci.nsILocalFile);
		  
		  leaf = child.leafName;// + (child.isDirectory() ? ' [DIR]' : ''));
		  
		  if (leaf && /\.png$/.test(leaf))
		  	this.captures.push(child.path);
		}

		var tab = this.openInReusableTab("adn-gallery", this.gallery); // label
		//var newTabBrowser = this.gBrowser.getBrowserForTab(tab);
		//dump("\n[UI] viewSnaps4("+newTabBrowser.tagName+")");
	},
	
	openInTab : function(url)
	{
		var tb = this.getBrowser();
		var newTab = tB.addTab(url);
		tB.selectedTab = newTab;
		return newTab;
	},
	
	getChromeWindow : function() {

		var chromeWindow = window.QueryInterface(Ci.nsIInterfaceRequestor)
                         .getInterface(Ci.nsIWebNavigation)
                         .QueryInterface(Ci.nsIDocShellTreeItem)
                         .rootTreeItem
                         .QueryInterface(Ci.nsIInterfaceRequestor)
                         .getInterface(Ci.nsIDOMWindow);
                         
		dump("\nchromeWindow: "+chromeWindow);
		
		chromeWindow.addEventListener("load", function(e)   { alert("chromeWindow.LOADED"); }, false);

		return chromeWindow;
	},

	getProfDir : function() {
		
		return Cc["@mozilla.org/file/directory_service;1"].getService
			(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
	},
	
	
	getBrowser : function() {

		return (top && top.document) ? top.document.getElementById('content') : 0;
	},

	/*toggleEnabled : function() {
		
		// untested
		
		//this.prefs.setBoolPref("enabled",!this.prefs.getBoolPref("enabled",v));
		 
		// OR
		var cb = document.getElementById("adnauseam-enabled-checkbox");
		cb.setAttribute("checked", !cb.hasAttribute("checked"));
		this.onCheckChange();
	},*/

	installButton : function(toolbarId, id, afterId) {
		
	    if (!document.getElementById(id)) {
	        var toolbar = document.getElementById(toolbarId);
	
	        // If no afterId is given, then append the item to the toolbar
	        var before = null;
	        
	        if (afterId) {
	            let elem = document.getElementById(afterId);
	            if (elem && elem.parentNode == toolbar)
	                before = elem.nextElementSibling;
	        }
	
	        toolbar.insertItem(id, before);
	        toolbar.setAttribute("currentset", toolbar.currentSet);
	        document.persist(toolbar.id, "currentset");
	
	        if (toolbarId == "addon-bar")
	            toolbar.collapsed = false;
	    }
	},

	DOMload : function(event) {
		return;
		dump("\n[UI] DOMload: " + event.originalTarget);
		if (event.originalTarget instanceof HTMLDocument) {

			var doc = event.originalTarget;
			var url = doc.location.href;

			dump("\n[UI] Url: " + url);

			if (url !== AdNauseam.UI.gallery)
				return;
			
			var div = doc.getElementById("adn-container");
			var dc = div.children;
			
			dump("\n[UI] Children: " + dc.length);
			for (var i = 0, j = dc.length; i < j; i++) {
				dump("\n"+i+": "+dc[i]);
				dump("\n id="+dc[i].getAttribute("id"));
			}
		}
	},
	
	loadComplete : function(event) {

		//dump("\n[UI] loadComplete: " + event.originalTarget);

		if (event.originalTarget instanceof HTMLDocument) {

			var doc = event.originalTarget;
			var url = doc.location.href;

			//dump("\n[UI] Url: " + url);

			if (url !== AdNauseam.UI.gallery) return;

			var div = doc.getElementById("adn-container");

			var caps = AdNauseam.UI.captures;
			for (var i = 0, j = caps.length; i < j; i++) {
			
				var pdiv = doc.createElementNS("http://www.w3.org/1999/xhtml", "div");
				pdiv.setAttribute("class", "photo");
				var img = doc.createElementNS("http://www.w3.org/1999/xhtml", "img");
				img.setAttribute("src", "file://"+caps[i]);
				pdiv.appendChild(img);
				div.appendChild(pdiv);
			}
			
			//dump("\n[UI] GALLERY-DONE");

			return;

		}
	}

};

window.addEventListener("load", function(e)   {
	//gBrowser.addEventListener("DOMContentLoaded", AdNauseam.UI.DOMload, true); 
	gBrowser.addEventListener("load", AdNauseam.UI.loadComplete, true); 
	AdNauseam.UI.init(); 
}, false);
	
window.addEventListener("unload", function(e) { 
	gBrowser.removeEventListener("load", AdNauseam.UI.loadComplete, true); 
	//gBrowser.removeEventListener("DOMContentLoaded", AdNauseam.UI.DOMload, true); 
	AdNauseam.UI.shutdown();
 }, false);

