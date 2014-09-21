// Much of this class adapted from Add-Art (https://github.com/slambert/Add-Art)

const { Cc, Ci, Cu } = require("chrome");
const { Class } = require('sdk/core/heritage');
const { Unknown } = require('sdk/platform/xpcom');
const { AdVisitor } = require("./adnvisitor");
const { Logger } = require("./adnlogger");
const { Options } = require("./adnoptions");
const { data } = require("sdk/self");
const tabs = require("sdk/tabs");

let AdParser = Class({

	count : 0,
	extends: Unknown,
	ignoreRE: /^(mailto|resource|javascript|about):/i,
	
	initialize : function(comp) {
		
		// load pre-existing adlookup here
		var ss = require("sdk/simple-storage");
		this.adlookup = ss.storage.adlookup || {};

// TMP: testing ==========================================
if (0) {
	var ads = this.getAds();
	for (var i=0, j=ads.length; i< j; i++) 
		ads[i].visited = 0;
}
//========================================================
			
		this.component = comp;
		this.visitor = AdVisitor(this);
		
		Logger.log('AdParser: '+this.getAds().length+' ads ('+this.pendingAds().length+' pending, '+this.erroredAds().length+' errors)');
	},

	// 'type'-constants here: https://developer.mozilla.org/en-US/docs/XPCOM_Interface_Reference/nsIContentPolicy
    handleAd : function(wnd, node, type, loc, collapse, abpResult) {
    	
		if (!Options.enabled) return;
		
		if (type === Ci.nsIContentPolicy.TYPE_SUBDOCUMENT)
			;//Logger.log("HANDLING TYPE_SUBDOCUMENT: "+loc.spec);
		
		var parentUrl = wnd.wrappedJSObject.document.URL;
		
        try {
        	
            var rNode = this.findAdNode(node);
            
            if (!rNode || !rNode.parentNode || typeof rNode.wrappedJSObject=='function')
            	return abpResult;
            
            //Logger.log('HIT: '+rNode.tagName);

            var newNode = this.transform(rNode, wnd);
            if (newNode) {
				
				//if (type==3)Logger.log(rNode.tagName+' :: '+loc.spec+' :: '+type+' '+newNode._width+'x'+newNode._height);
			
				var link = 'unknown', tag = rNode.tagName.toLowerCase();
				
		        if (tag === 'a') {  // DEAL WITH OTHER TAGS
		        	
		        	link = rNode.getAttribute("href");
		        	
		        	if (!this.ignoreRE.test(link)) {

			        	var ad = this.createAd(rNode, loc.spec/*image-url*/, parentUrl, newNode);
			        	
			        	if (!ad) return false;
	
			        	if (!this.adlookup[parentUrl]) {
			        		
							//Logger.log("NEWPAGE :: adlookup["+parentUrl+"]");
							this.adlookup[parentUrl] = [];
						}
						
						var existing = this.inLookup(ad, parentUrl);
						if (!existing) {
							
							Logger.log("FOUND-AD: "+ad.url);
							
							if (Options.verboseNotify)
								Logger.notify(ad.url, "Ad-Detected", ad.url, 1);
			        		
			        		this.adlookup[parentUrl].push(ad);
			        		
			        		// TODO: set the tab title to show # of ads (found/visited)
			        		// trim previous number (x/y) and show new 
			        		// or store the original title somewhere
			        		// tabs.activeTab.title =  ? 
						}
						else {
							
							// STATE: ad already exists (perhaps visited or not) in lookup table
							// TODO: Do we restamp it? If so, could be that 'ad.visited' < 'ad.found' 
							existing.found = +new Date();  // TODO: this should be array of timestamps
							
							Logger.log("IGNORE: (ad-exists): "+ad.url);
						}
					}
                }
               	else {
               		this.handleOther(tag, rNode, wnd, node, type, loc, abpResult);
               	}
                
                if (Options.outlineAds) {
                	
                	rNode.parentNode.replaceChild(newNode, rNode); // only if not hiding
                }

                return true; 
            }	
		}
		catch(e) {
			
            Logger.err("*** Error (AdParser), line# "+e.lineNumber +": "+e);
        }
        
		return abpResult; // default
	},

	validateLink : function(s) {
		
      return /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(s);
   	},
    
	createAd : function(rNode, theUrl, pageUrl, newNode) {
		
		var tag = rNode.tagName.toLowerCase(), link = rNode.getAttribute("href");
		
		while (!this.validateLink(link)) {
			
			if (!/^http/i.test(link)) {
				
				Logger.log("Relative Ad-target URL! -> "+link, theUrl, pageUrl);
				
				var parts = pageUrl.split('/'),
					absolute = parts[0]+'//'+parts[2],
					rellink = absolute + link;
					
				if (link !== rellink) {
					
					link = rellink;
					
					Logger.log("  ** trying:  "+rellink);
					continue; // retry
				}
			}
			
			Logger.warn("Invalid ad target! -> "+link);
			return null;
		}
			 
		return { // Ad-Object (TODO: make into proper class?)
			
			id : ++this.count, // unique-id
    		type : tag,
        	url : theUrl,
        	count : 1,
        	target : link,
        	page : pageUrl,
        	found : +new Date(),// timestamp 
        	visited : 0, 		// timestamp
        	errors : [],   		// any-errors
			path : [],      	// redirects
		    width : newNode._width, // for packing (are these used?)
		    height : newNode._height,// for packing (are these used?)

        	toString : function(o) {
        		return this.target;
        	}
    	};
	},
			
	inLookup : function(theAd, thePage) {
		
		if (theAd) {
			
			var ads = this.adlookup[thePage];
			
			for (var i=0, j=ads.length; ads && i<j; i++) {
				
			  if ((ads[i].target===theAd.target && ads[i].url===theAd.url) && ads[i].visited) // hmmm??
			  	return ads[i];
			}
		}
		
		return null;
	},
	
	transform : function(toReplace, wnd) {
    	
    	// Ignore very small ads...
        try {
            var theH = this.getSize("height", toReplace), theW = this.getSize("width", toReplace);

            if (theH < 10 || theW < 10) {
            	
				var toClick='unknown', ele = toReplace.wrappedJSObject;
		        if (ele && ele.tagName === 'A') 
		        	toClick = ele.getAttribute("href");
            	
            	//Logger.log("Ignore-small :: "+toClick);
            	
            	return null;
            }

	        var placeholder = toReplace.ownerDocument.createElement("div");
	
	        if (theW == 0 || theH == 0) {  // WHAT IS THIS DOING?
	        	
	        	console.warn('Creating place-holder div');
	        	
	            placeholder = toReplace.ownerDocument.createElement('div');
	            placeholder.setAttribute('NOAD', 'true');
	            
	            if (toReplace.hasAttribute('style'))
	                placeholder.setAttribute('style', toReplace.getAttribute('style'));
	            if (placeholder.style.background)
	                placeholder.style.background = '';
	                
	            var Nodes = toReplace.childNodes;
	            for ( var i = 0; i < Nodes.length; i++) {
	                if (Nodes[i].nodeType == Ci.nsIContentPolicy.TYPE_OTHER)
	                    placeholder.appendChild(this.transform(Nodes[i]));
	            }
	            
	            if (toReplace.hasAttribute('id'))
	                placeholder.setAttribute('id', toReplace.getAttribute('id'));
	            if (toReplace.hasAttribute('name'))
	                placeholder.setAttribute('name', toReplace.getAttribute('name'));
	            if (toReplace.hasAttribute('class'))
	                placeholder.setAttribute('class', toReplace.getAttribute('class'));
	            if (toReplace.style.display == 'none')
	                placeholder.style.display = 'none';
	        } 
	        else {
	        	
	        	// normal case
	            placeholder = this.createDiv(toReplace, theW, theH);
	        }
        
        }
        catch(e) {
        	
            console.error(e.lineNumber + ', ' + e);
		}

        return placeholder;
    },
    
    createDiv : function(oldElt, W, H) {
    	    	
        if (!oldElt || typeof oldElt.wrappedJSObject == 'function') 
            return null;
        
        var newElt = oldElt.ownerDocument.createElement("div"); 
        newElt.setAttribute("NOAD", "true");

        // Copying style from old to new element and doing some mods 
        
        newElt.setAttribute("style", oldElt.getAttribute("style"));
        if (oldElt.ownerDocument.defaultView && oldElt.ownerDocument.defaultView.getComputedStyle(oldElt, null)) {
        	
            eltStyle = oldElt.ownerDocument.defaultView.getComputedStyle(oldElt, null);
            newElt.style.position = eltStyle.getPropertyValue('position');
            
            if (eltStyle.getPropertyValue('display') == 'inline' || eltStyle.getPropertyValue('display') == 'inline-table')
                newElt.style.display = "inline-block";
            else
                newElt.style.display = eltStyle.getPropertyValue('display');
                
            newElt.style.visibility = eltStyle.getPropertyValue('visibility');
            newElt.style.zIndex = eltStyle.getPropertyValue('z-index');
            newElt.style.clip = eltStyle.getPropertyValue('clip');
            newElt.style.float = eltStyle.getPropertyValue('float');
            newElt.style.clear = eltStyle.getPropertyValue('clear');
        }
        
        newElt.style.outline = '#D824B7 double medium';
        newElt.style.background = "";
        
        if (oldElt.hasAttribute("id"))
            newElt.setAttribute("id", oldElt.getAttribute("id"));
        if (oldElt.hasAttribute("name"))
            newElt.setAttribute("name", oldElt.getAttribute("name"));
        if (oldElt.hasAttribute("class"))
            newElt.setAttribute("class", oldElt.getAttribute("class"));

        newElt.style.height = H + "px";
        newElt.style.width = W + "px";
        newElt.style.overflow = "hidden";
        newElt.style.cursor = "pointer";
        newElt.title = "Replaced by AdNauseam";
        
        newElt._height = H;
        newElt._width = W;

    	return newElt;
    },
    
    getSize : function(prop, elt) {
    	
		var x, wnd, compW, parentcompW, capital_name = {'width':'Width', 'height':'Height'}[prop];

		if (elt.ownerDocument) {
			
			if (elt.ownerDocument.defaultView && elt.ownerDocument.defaultView.getComputedStyle(elt, null)) {
				
				wnd = elt.ownerDocument.defaultView;
				compW = wnd.getComputedStyle(elt, null).getPropertyValue(prop);

				if (elt.parentNode) {
					
					// TODO: SEEMS TO BE BUG HERE -- TEST: http://www.theguardian.com/uk (what is elt.parentNode?)
					
					/*
					 *   225, [Exception... "Could not convert JavaScript argument arg 0 [nsIDOMWindow.getComputedStyle]"
					 *		nsresult: "0x80570009 (NS_ERROR_XPC_BAD_CONVERT_JS)"  location: "JS frame :: resource://gre/modules/XPIProvider.jsm 
					 * 		-> jar:file:///Users/dhowe/code/testprof/extensions/jid1-o1ImasAUIN9GKg@jetpack.xpi!/bootstrap.js 
					 * 		-> resource://gre/modules/commonjs/toolkit/loader.js 
					 * 		-> resource://jid1-o1imasauin9gkg-at-jetpack/adnauseam_addonsdk/lib/adnparser.js 
					 * 			:: AdParser<.getSize :: line 225"  data: no]
					 */
					try {
						var cstyle = wnd.getComputedStyle(elt.parentNode, null);
						parentcompW = cstyle.getPropertyValue(prop);
					}
					catch (e) {
						
						console.error("*** Error (Parser), [GUARDIAN?] line: "+e.lineNumber);
					}
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


		if (wnd && elt.tagName == 'A') {
			var size = 0;
			for (var i = 0; i < elt.childNodes.length; i++) {
				var child = elt.childNodes[i];
				if (child.nodeType == 1) {
					size = Math.max(size, parseInt
						(wnd.getComputedStyle(child, null).getPropertyValue(prop)));
				}
			};
			
			return size;
		}

		if (this.typeofSize(compW) == "percentage") {
			if (this.typeofSize(parentcompW) !== "pixel")
				x = 0;
			else
				x = parseInt(parseInt(compW) * parseInt(parentcompW) / 100);
		} else if (this.typeofSize(compW) == "auto") {
			
			x = elt['offset' + capital_name];
		}
		else if (this.typeofSize(compW) == "inherit") {
			if (this.typeofSize(parentcompW) !== "pixel") 
				x = 0;
			else
				x = parseInt(parentcompW);
		} else {
			x = parseInt(compW);
		}

		return x;
    },
    
    typeofSize : function(Str_size) {
        
        if (Str_size === "auto")
            return "auto";
            
        if (Str_size === "inherit")
            return "inherit";
            
        if (Str_size.indexOf && Str_size.indexOf('%') > -1)
            return "percentage";
            
        return "pixel";
    },
    
	findAdNode : function(node) {

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
	
	restart : function() {
		
		this.saveAdLookup();
		this.visitor.restart(this.adlookup = {}); 
	},
	
	saveAdLookup : function() {

		Logger.log('AdParser: serializing adlookup');

		var ss = require("sdk/simple-storage");
    	ss.storage.adlookup = this.adlookup;
	},
	
	clearAds : function() {
		
		var adl = require("sdk/simple-storage").storage.adlookup,
			keys = Object.keys(adl);
		
		this.adlookup = { };

		// not sure if these deletes are needed
		for (var i = 0, j = keys.length; i < j; i++)
			delete adl[keys[i]];
		delete adl; 
		
		this.saveAdLookup();
		
		Logger.log("Cleared all Ads");
	},
		
	stop : function() {
		
    	this.visitor && (this.visitor.stop());
		this.saveAdLookup();
    	this.adlookup = { };
    },
   
	pause : function() {
		
		this.visitor && (this.visitor.pause());
    },
    
   	unpause : function() {
   		
		this.visitor && (this.visitor.unpause());
    },
		
	getAds : function(filter) {
		
		//console.log('AdParser.getAds()');
		
		if (typeof this.adlookup == 'undefined' || !this.adlookup)
			return [];
		
		var all = [], keys = Object.keys(this.adlookup);

		for (var i = 0, j = keys.length; i < j; i++) {

			var ads = this.adlookup[keys[i]];
			for (var k=0; k < ads.length; k++) {
				
				if (!filter || filter(ads[k])) 
					all.push(ads[k]);
			}
		}

		return all;
	},

	pendingAds : function() { return this.getAds(function(ad){ return ad.visited === 0 })},
	
	visitedAds : function() { return this.getAds(function(ad){ return ad.visited > 0 })},
	
	erroredAds : function() { return this.getAds(function(ad){ return ad.visited < 0 })},
		
	isAdnWorker : function(win) {

		if (win) cHandler = win.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell)
			.chromeEventHandler;
			
		return (cHandler && cHandler.hasAttribute("ADN"));
	},
	
	handleOther : function(tag, rNode, wnd, node, type, loc, abpResult) { 
		
		var dbugIframes = 0;
		
		if (type !== Ci.nsIContentPolicy.TYPE_SUBDOCUMENT)
			return true;
			
		//console.log('handleOther: TYPE_SUBDOCUMENT='+(type === Ci.nsIContentPolicy.TYPE_SUBDOCUMENT));
		
	 	if (tag === 'img') {
					
			Logger.log("IMAGE: "+loc.spec);
        }
        else if (tag === 'iframe') {
        	
			Logger.log("IFRAME: "+loc.spec);
			var isrc = rNode.getAttribute('src');
			if(dbugIframes) Logger.log("IFRAME-SRC: "+isrc);
			var iid = rNode.getAttribute('id');
			if(dbugIframes) Logger.log("IFRAME-ID: "+iid);
			//Cu.import('resource://gre/modules/Services.jsm');
			if(dbugIframes) logIframeHtml(rNode, 0);
		    // Logger.log("Calling DOMComb: "+(rNode.contentDocument.wrappedJSObject)+"/"+rNode.tagName+"/"+rNode.hasChildNodes()+"/"+(rNode.childNodes.length)+" ========================================================");
			// var htmlDoc = rNode.contentDocument.wrappedJSObject;
			
			/*console.log("a0: "+rNode.contentDocument.querySelectorAll("div").length);
			console.log("a1: "+rNode.contentDocument.documentElement.innerHTML);
			console.log("a2: "+rNode.contentDocument.documentElement.querySelector('body').innerHTML);
			
			console.log("b0: "+rNode.contentWindow.innerHTML);
			console.log("b1: "+rNode.contentWindow.document.querySelectorAll("div").length);
			console.log("b2: "+rNode.contentWindow.document.innerHTML);
			console.log("b3: "+rNode.contentWindow.document.body.innerHTML);  SAVE */
			
			//if (docEle)DOMComb(docEle);
			// console.log('docEle: '+docEle.getAttribute('id'));
			// console.log('docEle2: '+docEle.childNodes[1].getAttribute('id'));
			// console.log('docEle3: '+docEle.querySelectorAll("body").length);
			// console.log('docEle4: '+docEle.querySelectorAll("a").length);
			// var iframeInnerHtml = rNode.contentDocument.documentElement.innerHTML;
			// console.log('iframeInnerHtml: '+iframeInnerHtml);
			// var anodes = htmlDoc.childNodes[0].getElementsByTagName("a");
			// var html = htmlDoc.childNodes[0];
			// var hits = html.querySelectorAll('a');
			// Logger.log("body: "+docEle.childNodes[1].childNodes.length);
			// if (hits)Logger.log("hits: "+hits.length);
			// Logger.log("htmlDoc.location: "+htmlDoc.childNodes.length);
			// Logger.log("htmlDoc.child: "+htmlDoc.childNodes[0].tagName);
			
			// //Logger.log("loc1: "+loc.spec);
			// //DOMComb(rNode, function(n) { n && console.log("TAG: "+n.tagName); });
			// //Logger.log("DOMComb Done: ========================================================");
			// //this.handleAd(wnd, htmlDoc.body, Ci.nsIContentPolicy.TYPE_SUBDOCUMENT, htmlDoc.location, abpResult);
			// //return true;
        }
        else { // IFRAME OR IMAGE OR ...
        	
        	// TODO: NEED TO DRILL DOWN TO ANCHOR TAG HERE! 
        	// See: https://github.com/dhowe/AdNauseam/issues/23
        	Logger.log("?????: "+rNode.tagName+" / "+type+" -> "+loc.spec);
        }
	}
});

function logIframeHtml(iframe, i) {

	console.log('logIframeHtml: '+i);
    iframe.removeEventListener('DOMContentLoaded', logIframeHtml, true); //this line removes the event listneer if it had one

    var iframeDoc = iframe.contentDocument;
    if (!iframeDoc) {
        console.log('iframe ' + i + ' is not fully loaded yet as it its contentDocument does not exist');
        iframe.addEventListener('DOMContentLoaded', logIframeHtml, true);
    } else {
        var iframeInnerHtml = iframeDoc.documentElement.innerHTML;
        console.log('iframe ' + i + ' innerHTML = ' + iframeInnerHtml);
    }
}
function logn(n){ console.log("TAG: "+n.tagName) }
function DOMComb (oParent, oCallback) {
  if (!oParent) { 
  	console.log('node == null');
  	return;
  }
  oCallback = oCallback || logn;
  if (oParent.childNodes) {
  	for (var i = 0; i < oParent.childNodes.length; i++) {
      DOMComb(oParent.childNodes[i], oCallback);
    }
  }
  oCallback(oParent);
}

exports.AdParser = AdParser;
