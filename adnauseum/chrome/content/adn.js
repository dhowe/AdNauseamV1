

/** AdNauseum namespace         */
if ("undefined" == typeof(AdNauseum)) {
  if (typeof dump === 'function') 
  	dump('\n[ADN] Initializing Namespace');
  var AdNauseum = {};
};

AdNauseum.UI = {
	
    myVariable: "value",
    mySettingOne: false,
    mySettingTwo: true,

    viewLog: function()
    {
    },
    
    viewSnaps: function()
    {
    },
    
    toggleSnaps: function()
    {
    	this.myAlert('d:toggleSnaps');
    },
    
    toggleEnabled: function()
    {
    },
    
    myAlert: function(param1)
    {
		window.alert("\n[ADN] "+param1);
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
	