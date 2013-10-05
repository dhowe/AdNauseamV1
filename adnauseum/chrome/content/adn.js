
// AdNauseum Namespace         

if ("undefined" == typeof (AdNauseum)) {
	
	if ( typeof dump === 'function')
		dump('\n[UI] Initializing Namespace');
		
	var AdNauseum = {}; 
};

AdNauseum.UI = {
	
	prefs : null,
	initd : false,
	skin : 'chrome://adnauseum/skin',
    website : 'http://rednoise.org/adnauseum', // label
    
	init : function() {
		
		if (this.initd) return; 
		
		dump('\n[UI] AdNauseum.UI.init()');

		 // Register to receive notifications of preference changes
     
     	this.prefs = Cc["@mozilla.org/preferences-service;1"]
        	.getService(Ci.nsIPrefService).getBranch("extensions.adnauseum.");
 		this.prefs.QueryInterface(Ci.nsIPrefBranch2);
 		this.prefs.addObserver("", this, false);
 		
 		this.component = Cc['@rednoise.org/adnauseum;1'].getService().wrappedJSObject;
 		this.component.visitor.init();
 		
 		// dump('\n[UI] this.component.visitor.init()');

     	if (!this.prefs.getBoolPref("firstrundone")) {
     		
			dump('\n[UI] FirstRun: Installing menu-button');
    		this.prefs.setBoolPref("firstrundone", true);
		    this.installButton("nav-bar", "adnauseum-button");	
		    this.installButton("addon-bar", "adnauseum-button");
  		}
  		
     	this.refresh();
	},
	
	///////////////////////////////////////////////////////////////	

	/* New Checkboxes:
		-- add to refresh() 
		-- add to oncheckChange()
		-- need a setter/getter above
		-- and an entry in defaults.js
	*/

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
	
	refresh : function() { 

		var e = this.enabled(), c = this.capturing(), h = this.highlighting();
		
		document.getElementById("adnauseum-enabled-checkbox").setAttribute("checked", e);
			
		document.getElementById("adnauseum-savecaptures-checkbox").setAttribute("checked", c);
			
		document.getElementById("adnauseum-highlightads-checkbox").setAttribute("checked", h);
			
		document.getElementById("adnauseum-button").style.listStyleImage = 
				'url('+this.skin+(e ? "/adn.png" : "/adng.png");  // dont touch
	},
	
	onCheckChange : function(e) // new checkboxes go here
	{
		this.capturing(document.getElementById
			("adnauseum-savecaptures-checkbox").hasAttribute("checked"));
			
		this.enabled(document.getElementById
			("adnauseum-enabled-checkbox").hasAttribute("checked"));	
			
		this.highlighting(document.getElementById
			("adnauseum-highlightads-checkbox").hasAttribute("checked"));
			
		e && (e.stopPropagation());		
	}, 
	
	/////////////////////////////////////////////////////////////////////////////////
	
	shutdown : function() {
		
		dump('\n[UI] AdNauseum.UI.shutdown()');
	},
	
	observe: function(subject, topic, data) {

		if (topic != "nsPref:changed") return;

		dump("\n[UI] Pref-change: " + data + "="+this.prefs.getBoolPref(data));
		
		this.refresh();
		
		// this.component.observer(subject, topic, data); // ???
	},

	viewHome : function(e)
	{
		this.openInReusableTab("adn-home",this.website);
		e && (e.stopPropagation());
	},
	 
	viewHelp : function(e)
	{
		this.openInReusableTab("adn-help", this.website+'/help.html');
		e && (e.stopPropagation());
	}, 
	
	viewLog : function(e)
	{
		var file = this.getProfDir();
		file.append('adnauseum.log');
		this.openInReusableTab("adn-log", file.path);
		e && (e.stopPropagation());
	}, 
	
	clearHistory : function(e)
	{
		this.component.clearLog();
		
		dump('\n[UI] Logs cleared');

		this.closeTab(/adnauseum\.log$/);
		this.viewLog();
		
		var file = this.getProfDir();
		file.append('adsnaps');
		file.exists() && (file.remove(true));
		
		dump('\n[UI] Captures cleared');
	},
	
	closeTab : function(urlRegex) {
		
		dump('\n[UI] closeTab('+urlRegex+');');

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

		dump('\n[UI] openInReusableTab('+url+');');


		var tab = this.findTab(attrName, true);
		
		dump('\n[UI] tab='+tab);
		
		if (!tab) {
			
			dump('\n[UI] Creating new tab');
			
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
	},

	openInTab : function(url)
	{
		var tb = this.getBrowser();
		var newTab = tB.selectedTab = tB.addTab(url);
		return newTab;
	},
	
	viewSnaps : function(e)
	{
		var gallery = "chrome://adnauseum/content/display/index.html";
		
		var file = this.getProfDir();
		file.append('adsnaps');
		
		if (0) {
			var children = file.directoryEntries;
			var child, leaf, list = [];
			while (children.hasMoreElements()) {
			  child = children.getNext().QueryInterface(Ci.nsILocalFile);
			  leaf = child.leafName// + (child.isDirectory() ? ' [DIR]' : ''));
			  if (leaf && /\.png$/.test(leaf))
			  	list.push(child.leafName);
			}
		}
		
		// TODO: write out the divs to 'gallery' (after open or before?)
		
		var tab = this.openInTab(gallery); // label
		
		
		e && (e.stopPropagation());
	},
	
	viewSnapsOld : function()
	{
		var file = this.getProfDir();
		file.append('adsnaps');
		
		var children = file.directoryEntries;
		var child, leaf, list = [];
		while (children.hasMoreElements()) {
		  child = children.getNext().QueryInterface(Ci.nsILocalFile);
		  leaf = child.leafName// + (child.isDirectory() ? ' [DIR]' : ''));
		  if (leaf && /\.png$/.test(leaf))
		  	list.push(child.leafName);
		}
		
		alert(list.join('\n'));
		//this.openInTab(file.path);
		//file.reveal();
	}, 

	getProfDir : function() {
		
		return Cc["@mozilla.org/file/directory_service;1"].getService
			(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
	},

	getBrowser : function(url) {

		return (top && top.document) ? top.document.getElementById('content') : 0;
	},

	/*toggleEnabled : function() {
		
		// untested
		
		//this.prefs.setBoolPref("enabled",!this.prefs.getBoolPref("enabled",v));
		 
		// OR
		var cb = document.getElementById("adnauseum-enabled-checkbox");
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
	}
};

window.addEventListener("load", function(e)   { AdNauseum.UI.init() }, false);
window.addEventListener("unload", function(e) { AdNauseum.UI.shutdown(); }, false);

	