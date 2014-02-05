       	
function xlog(m) {
	console.log(m);
	wnd.wrappedJSObject.console.log(m);
}


const mediator = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
var windows = require("sdk/windows").browserWindows;
windows.on('open', function(window) {
    addToolbarButton();
});

function addToolbarButton() {
	console.log('addToolbarButton');
    var document = mediator.getMostRecentWindow("navigator:browser").document;      
    var navBar = document.getElementById("nav-bar");
    if (!navBar) {
        return;
    }
    var btn = document.createElement("toolbarbutton");  

    btn.setAttribute('type', 'button');
    btn.setAttribute('class', 'toolbarbutton-1');
    btn.setAttribute('image', require("self").data.url('img/adn.png')); // path is relative to data folder
    btn.setAttribute('orient', 'vertical');
    btn.setAttribute('label', 'AdNauseam');
    
    btn.addEventListener('click', function() {
        // use tabs.activeTab.attach() to execute scripts in the context of the browser tab
        console.log('clicked');
    }, false)
    
    navBar.appendChild(btn);
}