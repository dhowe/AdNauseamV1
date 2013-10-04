
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
 		
 		//this.component = Cc['@rednoise.org/adnauseum;1'].getService().wrappedJSObject;	
     	
     	this.refresh();
	},
	
	/*toggleEnabled : function() {
		
		// untested
		
		//this.prefs.setBoolPref("enabled",!this.prefs.getBoolPref("enabled",v));
		 
		// OR
		var cb = document.getElementById("adnauseum-enabled-checkbox");
		cb.setAttribute("checked", !cb.hasAttribute("checked"));
		this.onCheckChange();
	},*/
	
	enabled : function(v) {
		if (arguments.length) {
			this.prefs.setBoolPref("enabled",v);
			//this.refresh();
			return this;	
		}
		return this.prefs.getBoolPref("enabled");	
	},
	
	capturing : function(v) {
		if (arguments.length) {
			this.prefs.setBoolPref("savecaptures",v);
			//this.refresh();
			return this;	
		}
		return this.prefs.getBoolPref("savecaptures");	
	},
	
	refresh : function() {

		var e = this.enabled(), c = this.capturing();
		
		document.getElementById("adnauseum-enabled-checkbox").setAttribute("checked", e);
			
		document.getElementById("adnauseum-savecaptures-checkbox").setAttribute("checked", c);
			
		//dump("button: "+
		document.getElementById("adnauseum-button").style.listStyleImage = 
			'url('+this.skin+(e ? "/adn.png" : "/adng.png"); 
			
		//dump("\nRefreshed :: enabled="+this.enabled()+" snaps="+this.capturing());	
	},
	
	onCheckChange : function()
	{
		this.capturing(document.getElementById
			("adnauseum-savecaptures-checkbox").hasAttribute("checked"));
			
		this.enabled(document.getElementById
			("adnauseum-enabled-checkbox").hasAttribute("checked"));			
	}, 
	
	shutdown : function() {
		
		dump('\n[UI] AdNauseum.UI.shutdown()');
	},
	
	observe: function(subject, topic, data) {

		if (topic != "nsPref:changed")
			return;

		dump("\n[UI] Pref-change: " + data + "="+this.prefs.getBoolPref(data));
		this.refresh();
		//this.prefs.getBoolPref(data);
	},

	viewHome : function()
	{
		this.openInTab(this.website);
	},
	 
	viewHelp : function()
	{
		this.openInTab(this.website+'/help.html');
	}, 
	
	viewLog : function()
	{
		var file = this.getProfDir();
		file.append('adnauseum.log');
		this.openInTab(file.path);
	}, 
	
	viewSnaps : function()
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
			this.myAlert('No tBrowser!!');
			return;
		}
		tB.selectedTab = tB.addTab(url);
	},
	 
	myAlert : function(param1) {
		window.alert('\n[ADN] ' + param1);
	}

};

window.addEventListener("load", function(e)   { AdNauseum.UI.init() }, false);
window.addEventListener("unload", function(e) { AdNauseum.UI.shutdown(); }, false);

	