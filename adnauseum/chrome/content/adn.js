if (alert) alert("Running adn.js");

if (dump) dump("Running adn.js");

if (console) console.log("Running adn.js");

var adnUI = {
	
    myVariable: "value",
    mySettingOne: false,
    mySettingTwo: true,

    someFunction: function(param1, param2)
    {
        // Do something clever here
    },
    
    anotherFunction: function()
    {
        // More clever stuff
    }
};



/**
 * Installs the toolbar button with the given ID into the given
 * toolbar, if it is not already present in the document.
 *
 * @param {string} toolbarId The ID of the toolbar to install to.
 * @param {string} id The ID of the button to install.
 * @param {string} afterId The ID of the element to insert after. @optional
 */
function installButton(toolbarId, id, afterId) {
	
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
    installButton("addon-bar", "adnauseum-button");
}    
	