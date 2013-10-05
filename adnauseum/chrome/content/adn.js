
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
		this.openInTab(this.website);
		e && (e.stopPropagation());
	},
	 
	viewHelp : function(e)
	{
		this.openInTab(this.website+'/help.html');
		e && (e.stopPropagation());
	}, 
	
	viewLog : function(e)
	{
		var file = this.getProfDir();
		file.append('adnauseum.log');
		this.openInTab(file.path);
		e && (e.stopPropagation());
		
	}, 
	
	clearHistory : function(e)
	{
		this.component.clearLog();
		
		dump('\n[UI] Log cleared');

		// TODO: refresh tab if open!!
		
		var file = this.getProfDir();
		file.append('adsnaps');
		file.exists() && (file.remove(true));
		dump('\n[UI] Captured cleared: '+file);
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
		
		this.openInTab(gallery); // label
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
	
	openInTab : function(url)
	{
		var tB = (top && top.document) ? top.document.getElementById('content') : 0;
		if (!tB) {
			dump('Error: No tBrowser!!');
			return;
		}
		tB.selectedTab = tB.addTab(url);
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

	