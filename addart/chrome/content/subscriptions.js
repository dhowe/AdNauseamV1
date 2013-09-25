/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */
Components.utils.import("resource://gre/modules/Services.jsm");

const aaPreferences = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
const nsIFilePicker = Components.interfaces.nsIFilePicker;

/**
 * Initialization function, called when the window is loaded.
 */
function onLoad()
{
	FillSubscriptionList("chrome://addart/content/subscriptions.xml");
	
	E("enableMoreAdToHide").setChecked(getMoreAds());
	E("expandImages").setChecked(getExpandImages());
}

function getUserSubscriptions() {
	if (aaPreferences.prefHasUserValue("extensions.add-art.imageSetXmlUrlUser")) {
		return aaPreferences.getCharPref("extensions.add-art.imageSetXmlUrlUser").split('|');
	}
}

function chainedRequest(urls) {
	if(!urls.length) {
		return;
	}

	request = new XMLHttpRequest();
	request.open("GET", urls.pop(0));
	request.addEventListener("readystatechange", function() {
		if(request.readyState == 4) {
			FillSubscriptionListFromXML(request.responseXML);
			makeCheckOnSubscriptions();
			chainedRequest(urls);
		}
	}, false);
	request.send();
}

function FillSubscriptionList(subscruptionUrlMain) {
	var request = new XMLHttpRequest();
	request.open("GET", subscruptionUrlMain);
	request.addEventListener("load", function()
	{	
		FillSubscriptionListFromXML(request.responseXML);
		makeCheckOnSubscriptions();

		var subscriptions = getUserSubscriptions();
		if(subscriptions) {
			chainedRequest(subscriptions);
		}

	}, false);
	request.send();	
}

function FillSubscriptionListFromXML(subsXML) {
	var subs = subsXML.getElementsByTagName("subscription");
	for (var i = 0; i<subs.length; i++) {
		var subscr = {
				title: subs[i].getAttribute("title"),
				description: subs[i].getAttribute("description"),
				url: subs[i].getAttribute("url"),
				homepage: subs[i].getAttribute("homepage"),
				author: subs[i].getAttribute("author"),
				};
		var data = {
				__proto__:null,
				subscription: subscr,
				isExternal: false,
				downloading: false,
				disabledFilters: null,
				};
		var node = Templater.process(E("subscriptionTemplate"), data);
		E("subscriptions").appendChild(node);
	};
}

function makeCheckOnSubscriptions() {
	if ( aaPreferences.prefHasUserValue("extensions.add-art.checkedSubscription") ) {
		checkedSubscription = aaPreferences.getIntPref("extensions.add-art.checkedSubscription");
		if ( checkedSubscription >= E("subscriptions").childElementCount )
			checkedSubscription = 0;
	} else {
		checkedSubscription = 0;
	}
	var radios = E("subscriptions").getElementsByTagName("radio");

	onCheck(E("subscriptions").getElementsByTagName("radio")[checkedSubscription]);
}

function onClose() {
	let i = 0;
	let checkboxes = E("subscriptions").getElementsByTagName("radio");
	do {
		if (checkboxes[i].selected) {
			if ( !aaPreferences.prefHasUserValue("extensions.add-art.checkedSubscription") || (aaPreferences.getIntPref("extensions.add-art.checkedSubscription")!=i) ) {
				aaPreferences.setIntPref("extensions.add-art.checkedSubscription", i);
				//Update is needed
				aaPreferences.setCharPref("extensions.add-art.imageSetXmlUrl", E("subscriptions").getItemAtIndex(i)._data.subscription.url);
				aaPreferences.setIntPref("extensions.add-art.currentImageSet", 0);
			}
		}
		i++;
	} while ( ( i < checkboxes.length) && !checkboxes[i-1].selected);
	
	aaPreferences.setBoolPref("extensions.add-art.enableMoreAds", E("enableMoreAdToHide").checked);
	aaPreferences.setBoolPref("extensions.add-art.expandImages", E("expandImages").checked);

	this.close();
}

function setMoreAds(enabled) {
	aaPreferences.setBoolPref("extensions.add-art.enableMoreAds", enabled);
}

function getMoreAds() {
	if (aaPreferences.prefHasUserValue("extensions.add-art.enableMoreAds")) 
		return aaPreferences.getBoolPref("extensions.add-art.enableMoreAds");
	else
		return false;
}

function setExpandImages(enabled) {
	aaPreferences.setBoolPref("extensions.add-art.expandImages", enabled);
}

function getExpandImages() {
	if (aaPreferences.prefHasUserValue("extensions.add-art.expandImages"))
		return aaPreferences.getBoolPref("extensions.add-art.expandImages");
	else
		return false;
}

function loadInBrowser(url) {
	var win = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow('navigator:browser');
	win.openUILinkIn(url, 'tab');
}

function addSubscription() {
	var url = prompt('Please enter the URL of the new subscription:');
	if(url) {
		addUserSubscription(url);
		updateSubscriptionList();
	}
}

function addUserSubscription(url) {
	var current = getUserSubscriptions();
	if(!current) {
		aaPreferences.setCharPref("extensions.add-art.imageSetXmlUrlUser",url);
	}
	else {
		current.push(url);
		aaPreferences.setCharPref("extensions.add-art.imageSetXmlUrlUser",current.join('|'));
	}
}

function updateSubscriptionList() {
	while (E("subscriptions").firstChild != null) {
		E("subscriptions").removeChild(E("subscriptions").firstChild);
	}
	
	FillSubscriptionList("chrome://addart/content/subscriptions.xml", (aaPreferences.prefHasUserValue("extensions.add-art.imageSetXmlUrlUser"))?aaPreferences.getCharPref("extensions.add-art.imageSetXmlUrlUser"):null);
}

function onCheck(checkbox) {
	let checkboxes = E("subscriptions").getElementsByTagName("radio");
	for ( let i = 0; i < checkboxes.length; i++) {
		if (checkboxes[i] != checkbox) {
			checkboxes[i].parentNode.selectedIndex = -1;
		} else {
			checkboxes[i].parentNode.selectedIndex = 0;
		}
	}
}
/**
 * Template processing functions.
 * 
 * @class
 */
var Templater =
{
	/**
	 * Processes a template node using given data object.
	 */
	process: function(/** Node */ template, /** Object */ data) /** Node */
	{
		// Use a sandbox to resolve attributes (for convenience, not security)
		let sandbox = Cu.Sandbox(window);
		for (let key in data)
			sandbox[key] = data[key];
		
		sandbox.formatTime = formatTime;

		// Clone template but remove id/hidden attributes from it
		let result = template.cloneNode(true);
		result.removeAttribute("id");
		result.removeAttribute("hidden");
		result._data = data;

		// Resolve any attributes of the for attr="{obj.foo}"
		let conditionals = [];
		let nodeIterator = document.createNodeIterator(result, NodeFilter.SHOW_ELEMENT, null, false);
		for (let node = nodeIterator.nextNode(); node; node = nodeIterator.nextNode())
		{
			if (node.localName == "if")
				conditionals.push(node);
			for (let i = 0; i < node.attributes.length; i++)
			{
				let attribute = node.attributes[i];
				let len = attribute.value.length;
				if (len >= 2 && attribute.value[0] == "{" && attribute.value[len - 1] == "}")
					attribute.value = Cu.evalInSandbox(attribute.value.substr(1, len - 2), sandbox);
			}
		}

		// Process <if> tags - remove if condition is false, replace by their
		// children
		// if it is true
		for each (let node in conditionals)
		{
			let fragment = document.createDocumentFragment();
			let condition = node.getAttribute("condition");
			if (condition == "false")
				condition = false;
			for (let i = 0; i < node.childNodes.length; i++)
			{
				let child = node.childNodes[i];
				if (child.localName == "elif" || child.localName == "else")
				{
					if (condition)
						break;
					condition = (child.localName == "elif" ? child.getAttribute("condition") : true);
					if (condition == "false")
						condition = false;
				}
				else if (condition)
					fragment.appendChild(node.childNodes[i--]);
			}
			node.parentNode.replaceChild(fragment, node);
		}

		return result;
	},

	/**
	 * Updates first child of a processed template if the underlying data
	 * changed.
	 */
	update: function(/** Node */ template, /** Node */ node)
	{
		if (!("_data" in node))
			return;
		let newChild = Templater.process(template.firstChild, node._data);
		delete newChild._data;
		node.replaceChild(newChild, node.firstChild);
	},

	/**
	 * Walks up the parent chain for a node until the node corresponding with a
	 * template is found.
	 */
	getDataNode: function(/** Node */ node) /** Node */
	{
		while (node)
		{
			if ("_data" in node)
				return node;
			node = node.parentNode;
		}
		return null;
	},

	/**
	 * Returns the data used to generate the node from a template.
	 */
	getDataForNode: function(/** Node */ node) /** Object */
	{
		node = Templater.getDataNode(node);
		if (node)
			return node._data;
		else
			return null;
	},

	/**
	 * Returns a node that has been generated from a template using a particular
	 * data object.
	 */
	getNodeForData: function(/** Node */ parent, /** String */ property, /** Object */ data) /** Node */
	{
		for (let child = parent.firstChild; child; child = child.nextSibling)
			if ("_data" in child && property in child._data && child._data[property] == data)
				return child;
		return null;
	}
};
