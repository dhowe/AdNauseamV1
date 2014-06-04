const { Logger } = require("./adnlogger");

function WidgetXUL(options) {

	var delegate = {
		
		button : null,
		menuEnabled : null,
		menuViewLog : null,
		menuViewAds : null,
		menuViewHelp : null,
	
		onTrack : function(window) {
	
			if (window.location != "chrome://browser/content/browser.xul") {
				// console.log("=> win location false");
				Logger.log("NO window tracked!!");
				return;
			}
	
			Logger.log("window tracked");
	
			var doc = window.document;
	
			var btn = doc.createElement('toolbarbutton');
			btn.setAttribute('id', 'adn-button');
			btn.setAttribute('type', 'menu-button');
			btn.setAttribute('class', 'toolbarbutton-1');
			btn.setAttribute('image', buttonIcon());
			//http://www.facebook.com/favicon.ico');
			btn.setAttribute("class", "toolbarbutton-1 chromeclass-toolbar-additional");
			btn.setAttribute("label", "options.label");
			btn.setAttribute('tooltiptext', "AdNauseam");
	
			btn.addEventListener('command', function() {
				//console.log("this=" + this.id);
				// your callback code here
	
			}, false);
	
			var menupopup = doc.createElement('menupopup');
			menupopup.setAttribute('id', 'menupopup');
			menupopup.addEventListener('command', function(event) {
				// TODO your callback
			}, false);
			btn.appendChild(menupopup);
	
			//menu items
			var menuitem = doc.createElement('menuitem');
			menuitem.setAttribute('id', 'adn-enabled');
			menuitem.setAttribute('label', 'Disabled');
			menuitem.addEventListener('command', function(event) {
				//Logger.log('Disabled');
				toggleEnabled();
			}, false);
	
			menupopup.appendChild(this.menuEnabled = menuitem);
	
			menuitem = doc.createElement('menuitem');
			menuitem.setAttribute('id', 'adn-viewAds');
			menuitem.setAttribute('label', 'View Ads');
			menuitem.setAttribute('key', 'A');
			menuitem.setAttribute("acceltext", "⌘⇧A");
			menuitem.setAttribute('modifiers', 'shift,command');
			menuitem.addEventListener('command', function(event) {
				showAdView();
				// CODE
			}, false);
	
			menupopup.appendChild(this.menuViewAds = menuitem);
	
			menuitem = doc.createElement('menuitem');
			menuitem.setAttribute('id', 'adn-viewLog');
			menuitem.setAttribute('label', 'View Log');
			menuitem.setAttribute('key', 'L');
			menuitem.setAttribute("acceltext", "⌘⇧L");
			menuitem.setAttribute('modifiers', 'shift,command');
			menuitem.addEventListener('command', function(event) {
				Logger.log('View Log');
	
			}, false);
	
			menupopup.appendChild(this.menuViewLog = menuitem);
	
			menuitem = doc.createElement('menuitem');
			menuitem.setAttribute('id', 'adn-viewHelp');
			menuitem.setAttribute('label', 'Help');
			menuitem.setAttribute('modifiers', 'shift,command');
			menuitem.setAttribute('key', 'H');
			menuitem.setAttribute("acceltext", "⌘⇧H");
			menuitem.addEventListener('command', function(event) {
				Logger.log('Help');
			}, false);
	
			menupopup.appendChild(this.menuViewHelp = menuitem);
	
			doc.getElementById('nav-bar').appendChild(btn);
			this.button = btn;
		},
	
		onUntrack : function(window) {// need?
	
			Logger.log("window untracked");
	
			if ("chrome://browser/content/browser.xul" != window.location)
				return;
	
			var navBar = window.document.getElementById("nav-bar");
			navBar && navBar.removeChild(this.button);
		}
	}
	
	require("sdk/deprecated/window-utils").WindowTracker(delegate);

	return {
		
		update : function() {
			
		}
	};
}

exports.Widget = WidgetXUL;
