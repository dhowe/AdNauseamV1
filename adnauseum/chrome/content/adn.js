


// AdNauseum Namespace         

if ("undefined" == typeof (AdNauseum)) {
	
	if ( typeof dump === 'function')
		dump('\n[UI] Initializing Namespace');
		
	var AdNauseum = {};
};

AdNauseum.UI = {
	
    website: 'http://rednoise.org/adnauseum', // label
    mySettingOne: false,
    mySettingTwo: true,

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
	
	toggleSnaps : function()
	{
		this.myAlert("toggleSnaps");
	}, 
	
	toggleEnabled : function()
	{
		this.myAlert("toggleEnabled");
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
   
	/**
	 * Installs the toolbar button with the given ID into the given
	 * toolbar, if it is not already present in the document.
	 *
	 * @param {string} toolbarId The ID of the toolbar to install to.
	 * @param {string} id The ID of the button to install.
	 * @param {string} afterId The ID of the element to insert after. @optional

	 installButton : function(toolbarId, id, afterId) {
	 	
		setTimeout(function(){window.alert("[ADN] installButton();")},3000);
		
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

if (firstRun) {
    // installButton("nav-bar", "my-extension-navbar-button");
    // The "addon-bar" is available since Firefox 4
    AdNauseum.UI.installButton("addon-bar", "adnauseum-button");
}   */ 
	