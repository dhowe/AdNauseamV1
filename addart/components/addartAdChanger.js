//"use strict";

//dump("\n\nLoading addartchanger.js");

/* 
 * TODO:
 *  -- implement http-request listener, and check 'visited' before each get...
 *  -- Check for no-user activity (using nsiObserver) 
 * 	-- Tab-mode: disable recursive loading (and processing of user-nav: eg refresh)
 */

const Ci = Components.interfaces; // is this deprecated?
const Cc = Components.classes; // is this deprecated?
const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const prefs = Cc["@mozilla.org/preferences-service;1"].getService
	(Ci.nsIPrefBranch).QueryInterface(Ci.nsIPrefBranchInternal);

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

/* Clicks on recognized ads in the background */

let Clicker =
{
	first : true,
	busy : false,
	initd : false,
    qsize : 100,
    //total : 0,
    
	init: function() {
		
		dump("\n[ADN] Clicker.init");
		try {
	
			this.queue = [];
			this.visited = [];		
			this.history = [];
			
			this.hdomWindow = Cc["@mozilla.org/appshell/appShellService;1"]
				.getService(Ci.nsIAppShellService).hiddenDOMWindow;
			 	 
			dump("\nhiddenDOM: "+this.hdomWindow);
			dump("\nhiddenDOM.doc: "+this.hdomWindow.document);

			this.mainWindow = Cc['@mozilla.org/appshell/window-mediator;1']
				.getService(Ci.nsIWindowMediator).getMostRecentWindow('navigator:browser');

			//observerService.addObserver(this, "http-on-modify-request", false);
			// dump("\nTABS="+this.mainWindow.gBrowser.mTabs.length); 
		}
		catch (e) {
			dump("\n[ADN] FAILED on hiddenWindow: "+e);
		}
   				
		this.initd = true;
	},
	
	shutdown : function() {
    	
        this.log("Shutdown", 1);
        
        //this.observerService.removeObserver(this, "http-on-modify-request");
        
        //this.history.sort();this.visited.sort();
        
        var s = "\nHistory("+this.history.length+"):\n";
        for (var i=0; i < this.history.length; i++)
          s += "  "+i+") "+this.trimPath(this.history[i]) +"\n";
        dump("\n"+s);
        
		s = "Visited("+this.visited.length+"):\n";
        for (var i=0; i < this.visited.length; i++)
          s += "  "+i+") "+this.trimPath(this.visited[i]) +"\n";
        dump("\n"+s);
        
        if (this.ostream) this.ostream.close();	
    },
	
    add : function(url) {
				
		if (!this.initd) this.init();

		if (url !== 'about:blank') {
			
			if (this.history.indexOf(url) >= 0) {
				dump("\n\nClicker.history ignoring link: "+url); 
				return;
			}
			
			this.history.push(url);
			
			if (this.history.length > this.qsize) {
				this.history.shift();
				dump("\nClicker.history removed: "+url); 
			}
		}
		else {
			dump("\nClicker.loading: 'about:blank'");
		}
		
		this.log("Queue: "+this.trimPath(url));
			
		this.queue.push(url);

        if (!this.busy) this.next();
    },
    
    next : function() {
    	
		this.busy = false;

        if (this.queue.length) {
        	// dump("\nClicker.next() :: "+this.queue.length);
        	
			this.busy = true;
			var theNext = this.queue.pop();
			dump("\nClicker.fetch() :: "+this.trimPath(theNext));
			
			var doRealFetch = true;
			if (doRealFetch)
				this.fetchInHidden(theNext);
			else
				this.next(); // tmp
        }
        else 
        	dump("\nClicker.waiting() :: history="+this.history.length);
    },
    
    
    fetchInTab : function(url) {
        
        //if (!this.first) return;
    	//this.first = false;
    	
    	dump("\n\nTAB: "+url);
    	
    	var clicker = this, gBrowser = this.mainWindow.gBrowser, tab = gBrowser.addTab(url);
    	tab.setAttribute("NOAD", true);
    	
    	gBrowser.addEventListener("DOMContentLoaded", function (e) {
			clicker.afterLoad(e);
    	});
    },
    
    fetchInHidden : function(url) {	
    	
	    var doc = this.hdomWindow.document, 
	    	iframe = doc.getElementById("adn-iframe"), clicker = this;

	    if (!iframe) {
	    	
	        // Always use html. The hidden window might be XUL (Mac)
	        // or just html (other platforms).
	        iframe = doc.createElementNS("http://www.w3.org/1999/xhtml", "iframe");
	        iframe.wrappedJSObject = iframe;
	        
	        iframe.setAttribute("NOAD", "ADN");
	        iframe.setAttribute("id", "adn-iframe");
	        
	        iframe.addEventListener("DOMContentLoaded", function (e) {
	            clicker.afterLoad(e);
	        });
	        
	        doc.documentElement.appendChild(iframe);
	    }
	    
	    iframe.setAttribute("src", url);
    },
    
    windowForRequest : function(request)
	{
	  if (request instanceof Ci.nsIRequest)
	  {
	    try
	    {
	      if (request.notificationCallbacks)
	      {
	        return request.notificationCallbacks
	                      .getInterface(Ci.nsILoadContext)
	                      .associatedWindow;
	      }
	    } catch(e) {}
	
	    try
	    {
	      if (request.loadGroup && request.loadGroup.notificationCallbacks)
	      {
	        return request.loadGroup.notificationCallbacks
	                      .getInterface(Ci.nsILoadContext)
	                      .associatedWindow;
	      }
	    } catch(e) {}
	  }
	
	  return null;
	},
	
    beforeLoad : function(httpChannel, request) {
		
    	// NEXT: Working here, need to identify requests from hiddenWindow:
    	// 		just check, this.hdomWindow.document.location.spec === httpChannel.originalURI.spec ???
    	
    	if (!this.initd) return;
    	
    	//this.log("beforeLoad: "+httpChannel,1);
    	
    	var win = this.windowForRequest(request);
    	if (win) dump("\n"+win.document);
    	    	
		// Ignore requests without context and top-level documents
		//if (!node || contentType == Policy.type.DOCUMENT)
			//return;

		// Ignore standalone objects
		//if (contentType == Policy.type.OBJECT && node.ownerDocument && !/^text\/|[+\/]xml$/.test(node.ownerDocument.contentType))
			//return;

    	// TODO: filter by content-type, ignore images, css, scripts, etc.
    	
		//this.log("beforeLoad: "+httpChannel,1);
		if (httpChannel.originalURI.spec != httpChannel.URI.spec) {
	    	this.log("originalURI: "+httpChannel.originalURI.spec+" != URI: "+httpChannel.URI.spec,1);
	    }
    	
    	var interfaceRequestor = httpChannel.notificationCallbacks.QueryInterface(Ci.nsIInterfaceRequestor);
       	var DOMWindow = interfaceRequestor.getInterface(Ci.nsIDOMWindow);

    	//var tab = tabForHttpChannel(DOMWindow);
    	
        //this.log("Request: "+request+"\n",1);
        
		if (0) request.cancel(Components.results.NS_BINDING_ABORTED);
    },
    
    tabForHttpChannel : function(domWindow) { // unused for now
    	
       	var tab, tIndex = -1, gBrowser = this.mainWindow.gBrowser;

        if (!gBrowser) {
        	this.log("no gBrowser");
        	return;
        }
                
        tIndex = gBrowser.getBrowserIndexForDocument(DOMWindow.document);
		
        // handle the case where there was
        if (tIndex > -1) {
            tab = gBrowser.tabContainer.childNodes[tIndex];
			this.log("Found tab: "+tab);
		}
		//else no tab associated with the request (rss, etc)
			
		return tab;
    },
    
    afterLoad : function(e) {

		var doc = e.originalTarget, path = doc.location.href;
				
		this.visited.push(path);
		
		if (0 && this.visited.length > this.qsize) { // re-add to control log size?
			this.visited.shift();
			dump("\nClicker.visited removed: "+path); 
		}
		
		this.log("Visit: "+this.trimPath(path), 0);

        //var html = doc.documentElement.innerHTML; // keep
         
		this.next();
    },

	logO : function(object,label) {
		
		label = label || 'unknown';
		var stuff = [];
		for (s in object) {
			stuff.push(s);
		}
		stuff.sort();
		dump("\n"+label + ': ' + stuff);
	},
   
	log : function(msg, dumpit) {

		if ( typeof this.ostream == 'undefined') {

			try {

				var file = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
				file.append("ad-nauseum.log");

				if (!file.exists()) {

					file.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0666);
					dump("\n[ADN] Created " + file.path);
				}

				// Then, we need an output stream to our output file.
				this.ostream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);

				//this.ostream.init(file, 0x02 | 0x10, -1, 0); // append
				this.ostream.init(file, -1, -1, 0); // truncate
				
				if (file.exists() && this.ostream) 
					this.log("Log: " + this.trimPath(file.path));				
			}
			catch(e) {
				dump("\n\n[ERROR] " + e);
				return;
			}
		}

		var d = new Date(), ms = d.getMilliseconds()+'', now = d.toLocaleTimeString();
	    ms =  (ms.length < 3) ? ("000"+ms).slice(-3) : ms;
 
		msg = "[" + now  + ":" + ms + "] " + msg + "\r\n-------------"
			+ "------------------------------------------------------\r\n";
			
		if ( typeof this.ostream === 'undefined' || !this.ostream) {
			dump("\n\n[ERROR] NO IO!");
			return;
		}
		
		this.ostream.write(msg, msg.length);
		
		if (dumpit) dump("\n"+msg);
	},
	
	trimPath : function(u, max) {
		max = max || 60;
		if (u && u.length > max) 
			u = u.substring(0,max/2)+"..."+u.substring(u.length-max/2);
		return u;
	}    
};

////////////////////////////////////////////////////////////////////////////////////////////////

// class constructor
function AddArtComponent() {
	
    this.wrappedJSObject = this;
}

// class definition
AddArtComponent.prototype = {
	
    // properties required for XPCOM registration: 
    classID : Components.ID("{741b4765-dbc0-c44e-9682-a3182f8fa1cc}"),
    contractID : "@eyebeam.org/addartadchanger;1",
    classDescription : "Banner to art converter",

    QueryInterface : XPCOMUtils.generateQI([ Ci.nsIObserver ]), // needed? if not, also remove XPCOMUtils above 

    // add to category manager
    _xpcom_categories : [ { category : "profile-after-change" } ],

    init : function() {
    	
        dump("\n[AA] AddArtComponent.init");
        
        let result = {};
        result.wrappedJSObject = result;
        Services.obs.notifyObservers(result, "adblockplus-require", 'contentPolicy');

        this.policy = result.exports.Policy;
        
        // if everything is OK we continue 
        if (!this.policy) {
        	dump("no Policy")
            return false;
		}
        
        this.loadImgArray();

        // Installing our hook: does Policy.processNode exist?
        if (!this.policy.processNode) dump("no processNode()");
        
        this.policy.oldprocessNode = this.policy.processNode;
        this.policy.processNode = this.processNodeABP;

        this.setPref("extensions.adblockplus.fastcollapse", false);
   
		dump("\n[AA] AddArtComponent.initd");

        return true;
    },
    
        // nsIObserver interface implementation
    observe : function(aSubject, aTopic, aData) {
    	
        var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

        switch (aTopic) {
	        
	        case "profile-after-change":
	            // Doing initialization stuff on FireFox start
	            observerService.addObserver(this, "http-on-modify-request", false);
	            observerService.addObserver(this, "quit-application", false);
	            this.init();
	            break;
	            
			case "quit-application":
			
	            // Doing shutdown stuff on FireFox quit
	            observerService.removeObserver(this, "quit-application");
	            observerService.removeObserver(this, "http-on-modify-request");

	            Clicker.shutdown();
	            break;
	            
	        case "http-on-modify-request":
	        
	        	//dump("\n\nhttp-on-modify-request\n\n");
	        	var httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);
	        	var request = aSubject.QueryInterface(Components.interfaces.nsIRequest);
	        	Clicker.beforeLoad(httpChannel, request);
	        	break;
		}
    },

    // shutdown : function() {
//     	
        // dump("\n[ADN] AddArtComponent.shutdown");
        // Clicker.shutdown();
    // },
        
    processNodeABP : function(wnd, node, contentType, location, collapse) {
    	
        // NOTE: this will be run in context of AdBlockPlus
        return Cc['@eyebeam.org/addartadchanger;1'].getService()
        	.wrappedJSObject.processNodeADN(wnd, node, contentType, location, collapse);
    },
    
    processNodeADN : function(wnd, node, contentType, location, collapse) {

        if (!this.policy || /^chrome:\//i.test(location)) return true;

        if (!node || !node.ownerDocument || !node.tagName) {
        	
            return (this.getPref("extensions.add-art.enableMoreAds")) ? 
            	true :  this.policy.oldprocessNode(wnd, node, contentType, location, collapse);
        }       
        
        if (node.hasAttribute("NOAD")) { 
        	
        	// dump("\n\nSkipping NOAD: "+node.getAttribute("NOAD"));
        	return true;
        }
            
        if (contentType == Ci.nsIContentPolicy.TYPE_STYLESHEET ||
                contentType == Ci.nsIContentPolicy.TYPE_DOCUMENT ||
                contentType > Ci.nsIContentPolicy.TYPE_SUBDOCUMENT   )
            return this.policy.oldprocessNode(wnd, node, contentType, location, collapse);
            
        var html0 = node.ownerDocument.getElementsByTagName('HTML')[0]
        if (contentType == Ci.nsIContentPolicy.TYPE_SCRIPT && html0 
        	&& html0.getAttribute('inAdScript') == 'true') 
        {
            
            // Here possible should be done some work with script-based ads
            return true;
        } 
        else {
        	
            if (this.policy.oldprocessNode(wnd, node, contentType, location, collapse) == 1)
                return true;
                
            if (contentType == Ci.nsIContentPolicy.TYPE_SCRIPT) {
                //Here possible should be done some work with script-based ads 
                return true;
            }
        }

        try {
        	
            // Replacing Ad Node to Node with Art
            var RNode = this.findAdNode(node,contentType);
            
            if (this.checkDanger(RNode))  {
            	return this.policy.oldprocessNode(wnd, node, contentType, location, collapse);
            }


            if (RNode.parentNode) {
            	
                var newNode = this.transform(RNode, wnd);
                if (newNode) {
                    RNode.parentNode.replaceChild(newNode, RNode);  
                }
                else {
                    return this.policy.oldprocessNode(wnd, node, contentType, location, collapse);
                }
                
            }

        } 
        catch(e) {
            dump("Error in: " + e.fileName +", line number: " + e.lineNumber +", " + e);
        }

        return false;
    },

    findAdNode : function(node, contentType) {

        var adNode = node;

        while (adNode.parentNode && (
        	adNode.parentNode.tagName == 'A' ||
			adNode.parentNode.tagName == 'OBJECT' ||
            adNode.parentNode.tagName == 'IFRAME' ||
            (adNode.hasAttribute && adNode.hasAttribute('onclick')))) 
		{    
            adNode = adNode.parentNode;
        }
            
        return adNode;
    },
    
    loadImgArray : function() {
    	
        this.ImgArray = [];
        
        // taken from: https://en.wikipedia.org/wiki/Web_banner
        // 19 images sizes total

        // Rectangles
        this.ImgArray.push( [ 336, 280 ] ); // Large Rectangle
        this.ImgArray.push( [ 300, 250 ] ); // Medium Rectangle
        this.ImgArray.push( [ 180, 150 ] ); // Rectangle
        this.ImgArray.push( [ 300, 100 ] ); // 3:1 Rectangle
        this.ImgArray.push( [ 240, 400 ] ); // Vertical Rectangle

        // Squares
        this.ImgArray.push( [ 250, 250 ] ); // Square Pop-up

        // Banners
        this.ImgArray.push( [ 720, 300, ] ); // Pop-Under
        this.ImgArray.push( [ 728, 90, ] ); // Leaderboard
        this.ImgArray.push( [ 468, 60, ] ); // Full Banner
        this.ImgArray.push( [ 234, 60, ] ); // Half Banner
        this.ImgArray.push( [ 120, 240 ] ); // Vertical Banner

        //Buttons
        this.ImgArray.push( [ 120, 90 ] ); // Button 1
        this.ImgArray.push( [ 120, 60 ] ); // Button 2
        this.ImgArray.push( [ 88, 31 ] ); // Micro Bar
        this.ImgArray.push( [ 88, 15 ] ); // Micro Button
        this.ImgArray.push( [ 125, 125 ] ); // Square Button

        //Skyscrapers
        this.ImgArray.push( [ 120, 600 ] ); // Standard Skyscraper
        this.ImgArray.push( [ 160, 600 ] ); // Wide Skyscraper
        this.ImgArray.push( [ 300, 600 ] ); // Half-Page

    },

    askLink : function(width, height) {
    	
        // Find this.ImgArray with minimal waste (or need - in this case it will be shown in full while mouse over it) of space
        var optimalbanners = null;
        var minDiff = Number.POSITIVE_INFINITY;
        for ( var i = 0; i < this.ImgArray.length; i++) {
            var diff = Math.abs(width / height - this.ImgArray[i][0] / this.ImgArray[i][1]);
            if (Math.abs(diff) < Math.abs(minDiff)) {
                minDiff = diff;
                optimalbanners = [ i ];
            } else if (diff == minDiff) {
                optimalbanners.push(i);
            }
        }

        var optimalBanner = [];
        minDiff = Number.POSITIVE_INFINITY;
        for (i = 0; i < optimalbanners.length; i++) {
            var diff = Math.abs(width * height - this.ImgArray[optimalbanners[i]][0] * this.ImgArray[optimalbanners[i]][1]);
            if (diff < minDiff) {
                minDiff = diff;
                optimalBanner = [ optimalbanners[i] ];
            } else if (diff == minDiff) {
                optimalBanner.push(optimalbanners[i]);
            }
        }
        return this.ImgArray[optimalBanner[Math.floor(Math.random() * optimalBanner.length)]];
    },
    
    checkDanger: function(element) {
    	
        // if we try to replace elements of this kind, firefox crashes.
        return typeof (element.wrappedJSObject) == 'function';
    },

    
    typeofSize : function(Str_size) {
        if (Str_size == "auto")
            return "auto";
        if (Str_size == "inherit")
            return "inherit";
        if (Str_size.indexOf('%') > -1)
            return "percentage";
        return "pixel";
    },

    getSize : function(prop, elt) {
        if (elt.ownerDocument) {
            if (elt.ownerDocument.defaultView && elt.ownerDocument.defaultView.getComputedStyle(elt, null)) {
                var wnd = elt.ownerDocument.defaultView;
                var compW = wnd.getComputedStyle(elt, null).getPropertyValue(prop);

                if (elt.parentNode) {
                    var parentcompW = wnd.getComputedStyle(elt.parentNode, null).getPropertyValue(prop);
                }
            }
        }

        if (!compW) {
            if (elt.style[prop])
                compW = elt.style[prop];
            else if (elt[prop])
                compW = elt[prop];
            else
                compW = 0;
        }

        var capital_name = {'width':'Width','height':'Height'}[prop];

        if(elt.tagName == 'A') {
            var size = 0;
            for(var i=0;i<elt.childNodes.length;i++) {
                var child = elt.childNodes[i];
                if(child.nodeType == 1) {
                    size = Math.max(size,parseInt(wnd.getComputedStyle(child, null).getPropertyValue(prop)));
                }
            };
            return size;
        }

        var x;
        if (this.typeofSize(compW) == "percentage") {
            if (this.typeofSize(parentcompW) !== "pixel")
                x = 0;
            else
                x = parseInt(parseInt(compW) * parseInt(parentcompW) / 100);
        } else if (this.typeofSize(compW) == "auto")
            x = elt['offset'+capital_name];
        else if (this.typeofSize(compW) == "inherit") {
            if (this.typeofSize(parentcompW) !== "pixel")
                x = 0;
            else
                x = parseInt(parentcompW);
        } else
            x = parseInt(compW);
            
        return x;
    },

    transform : function(ToReplace, wnd) {
    	
    	if (0) {
	        try {
	            var theH = this.getSize("height", ToReplace), theW = this.getSize("width", ToReplace);
	
	            if (theH < 10 || theW < 10) {
	            	dump("\n\n [WARN]large or long too small!!");
	            	return null;
	            }
	        }
	        catch(e) {
	            dump("\n\n [WARN]"+e.lineNumber + ', ' + e);
	        }
		}
 

        var placeholder = ToReplace.ownerDocument.createElement("div");

        if (theW == 0 || theH == 0) { 
        	dump("\n\n [WARN] creating place-holder div");
            // placeholder = ToReplace.ownerDocument.createElement("div");
            placeholder.setAttribute("NOAD", "true");
            
            if (ToReplace.hasAttribute("style"))
                placeholder.setAttribute("style", ToReplace.getAttribute("style"));
            if (placeholder.style.background)
                placeholder.style.background = "";
                
            var Nodes = ToReplace.childNodes;
            for ( var i = 0; i < Nodes.length; i++) {
                if (Nodes[i].nodeType == Ci.nsIContentPolicy.TYPE_OTHER)
                    placeholder.appendChild(this.transform(Nodes[i]));
            }
            
            if (ToReplace.hasAttribute("id"))
                placeholder.setAttribute("id", ToReplace.getAttribute("id"));
            if (ToReplace.hasAttribute("name"))
                placeholder.setAttribute("name", ToReplace.getAttribute("name"));
            if (ToReplace.hasAttribute("class"))
                placeholder.setAttribute("class", ToReplace.getAttribute("class"));
            if (ToReplace.style.display == 'none')
                placeholder.style.display = 'none';
        } 
        else {
        	
            placeholder = this.createConteneur(ToReplace, wnd, theH, theW);
        }

        return placeholder;
    },
    
    getPref: function(PrefName) {
        var Type = prefs.getPrefType(PrefName);
        if(Type == prefs.PREF_BOOL)
            return prefs.getBoolPref(PrefName);
        else if (Type==prefs.PREF_STRING)
            return prefs.getCharPref(PrefName);
        else if (Type==prefs.PREF_INT)
            return prefs.getIntPref(PrefName);
    },
    
    setPref: function(PrefName, prefValue) {
        if(this.getPref(PrefName)!==prefValue) {
            var Type = prefs.getPrefType(PrefName);
            if (Type==prefs.PREF_BOOL)
                prefs.setBoolPref(PrefName, prefValue);
            else if (Type==prefs.PREF_STRING)
                prefs.setCharPref(PrefName, prefValue);
            else if (Type==prefs.PREF_INT)
                prefs.setIntPref(PrefName, prefValue);
        }
    },
    
    createConteneur : function(OldElt, wnd, l, L) {

        // This replaces Ad element to element with art
        var newElt = null, ele = OldElt.wrappedJSObject;
        
        //if (!ele) dump("\n\n[ERROR] Null ELE: "+OldElt);

        var isA = ele.tagName == 'A';
        
        if (isA) {
            var toClick = ele.getAttribute("href");
            Clicker.add(toClick); // follow redirects
            ele.title = "Ad Nauseum: "+toClick.substring(0,40)+"...";
        }
        //else dump("\n[ADN] Ignoring: "+ele.tagName);
        
        return null; // skip this if hiding ads

        if (this.checkDanger(OldElt)) return null;
        
        newElt = OldElt.ownerDocument.createElement("div"); 
        
        newElt.setAttribute("NOAD", "true");

        // Copying style from old to new element and doing some replacing of it 
        newElt.setAttribute("style", OldElt.getAttribute("style"));
        if (OldElt.ownerDocument.defaultView && OldElt.ownerDocument.defaultView.getComputedStyle(OldElt, null)) {
            EltStyle = OldElt.ownerDocument.defaultView.getComputedStyle(OldElt, null);
            newElt.style.position = EltStyle.getPropertyValue('position');
            if (EltStyle.getPropertyValue('display') == 'inline' || EltStyle.getPropertyValue('display') == 'inline-table')
                newElt.style.display = "inline-block";
            else
                newElt.style.display = EltStyle.getPropertyValue('display');
            newElt.style.visibility = EltStyle.getPropertyValue('visibility');
            newElt.style.zIndex = EltStyle.getPropertyValue('z-index');
            newElt.style.clip = EltStyle.getPropertyValue('clip');
            newElt.style.float = EltStyle.getPropertyValue('float');
            newElt.style.clear = EltStyle.getPropertyValue('clear');
        }

        newElt.style.background = "";
        if (OldElt.hasAttribute("id"))
            newElt.setAttribute("id", OldElt.getAttribute("id"));
        if (OldElt.hasAttribute("name"))
            newElt.setAttribute("name", OldElt.getAttribute("name"));
        if (OldElt.hasAttribute("class"))
            newElt.setAttribute("class", OldElt.getAttribute("class"));

        newElt.style.height = l + "px";
        newElt.style.width = L + "px";
        newElt.style.overflow = "hidden";
        newElt.style.cursor = "pointer";
        newElt.title = "Replaced by Add-Art";
        
        // Expanding images
        // Setting Art to be shown in full while is over it
        if (this.getPref("extensions.add-art.expandImages")) {
            newElt.setAttribute("onmouseover","this.style.overflow = 'visible';this.style.zIndex= 100000;");
            newElt.setAttribute("onmouseout","this.style.overflow = 'hidden';this.style.zIndex= 0;");
            newElt.setAttribute("onclick","window.top.location = 'http://add-art.org/';");  
        }

        var img = OldElt.ownerDocument.createElement("img");
        img.setAttribute("NOAD", "true");
        img.setAttribute("border", "0");
        var Img = this.askLink(L, l);
        
        // Select banner URL
        // use the URL in a top window to generate a number b/w 1 and 8 (to maintain some persistence)
        var win = Cc['@mozilla.org/appshell/window-mediator;1']
        .getService(Ci.nsIWindowMediator)
        .getMostRecentWindow('navigator:browser');
        if (win != null) {
            var el = win.document.getElementById('content');
            if (el != null) {
                var loc = el.mCurrentBrowser.contentWindow.location.href;
            }
        }

        if (loc) {
            var randomImage8 = loc.charCodeAt( loc.length - 6 ) % 8 + 1;
        } else {
            var randomImage8 = Math.floor(Math.random()*8);
        }
        
        // pick the image
        var filename = randomImage8+"artbanner"+Img[0]+"x"+Img[1]+".jpg";
        var url = "chrome://addart/skin/"+filename;
        
        img.setAttribute("src", url);

        // return newElt;
        if (Img[1] * l / Img[2] < L) {
            img.style.width = L + "px";
            img.style.marginTop = parseInt((l - Img[1] * L / Img[0]) / 2) + 'px';
        } else {
            img.style.height = l + "px";
            img.style.marginLeft = parseInt((L - Img[0] * l / Img[1]) / 2) + 'px';
        }
        newElt.appendChild(img);
        return newElt;
    }
};

/**
 * XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4,
 * SeaMonkey 2.1). XPCOMUtils.generateNSGetModule was introduced in Mozilla 1.9
 * (Firefox 3.0).
 */
if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory( [ AddArtComponent ]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule( [ AddArtComponent ]);
