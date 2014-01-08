// Much of this class adapted from Add-Art ()

const { Class } = require('sdk/core/heritage');
const { Unknown } = require('sdk/platform/xpcom');
const { AdVisitor } = require("./adnvisitor");
const { Logger } = require("./adnlogger");
const { data } = require("sdk/self");
const tabs = require("sdk/tabs");

let AdParser = Class({

	extends: Unknown,
	
	initialize : function(comp) {
		
		this.adlookup = {};
		this.component = comp;
		this.visitor = AdVisitor(this);
		//Logger.log("Created AdParser::"+comp);
	},
	
    handleAd : function(wnd, node, type, loc, abpResult) {
		
		var parentUrl = wnd.wrappedJSObject.document.URL;
		
        try {
        	
            var rNode = this.findAdNode(node);
            
            if (!rNode || !rNode.parentNode || typeof rNode.wrappedJSObject == 'function')
            	return abpResult;
            
            //Logger.log("HIT: "+rNode.tagName);

            var newNode = this.transform(rNode, wnd);
            if (newNode) {

				//Logger.log(rNode.tagName+" :: "+loc.spec);
			
				var link = 'unknown', tag = rNode.tagName.toLowerCase();
				
		        if (tag === 'a') {  // DEAL WITH OTHER TAGS
		        	
		        	link = rNode.getAttribute("href");
		        	
		        	var ad = this.createAd(rNode, loc.spec, parentUrl);
		        	
		        	if (!this.adlookup[parentUrl]) {
						Logger.log("NEW-PAGE :: adlookup["+parentUrl+"]");
						this.adlookup[parentUrl] = [];
					}
					
					if (!this.inLookup(ad, parentUrl)) {
						
						Logger.log("NEW-AD :: "+ad.url + " / "+ad.target);
		        		
		        		this.adlookup[parentUrl].push(ad);
					}
					else {
						Logger.log("IGNORE :: (ad-exists) "+ad.url);
					}
                }
                else { // IFRAME OR IMAGE OR ...
                	
                	// NEED TO DRILL DOWN TO ANCHOR TAG HERE !!!
                	Logger.log("QUESTION :: "+rNode.tagName+" / "+type+" -> "+loc.spec);
                }
                
                rNode.parentNode.replaceChild(newNode, rNode); // if not hiding

                return true; 
            }	
		}
		catch(e) {
			
            Logger.err("*** Error in: "+e.fileName +
            	", line number: "+e.lineNumber +", "+e);
        }
        
		return abpResult; // default
	},
	
	createAd : function(rNode, theUrl, pageUrl) {
		
		var tag = rNode.tagName.toLowerCase(), link = rNode.getAttribute("href");
			 
		return { 		// Ad-Object
			
    		type : tag,
        	url : theUrl,
        	target : link,
        	page: pageUrl,
        	capture : null, // image grab ?
        	visited : null, // time stamp
			path : [],      // redirects
        	equals : function(o) {
        		return (this.target===o.target && this.url===o.url);
        	},
        	toString : function(o) {
        		return this.target;
        	}
    	};
	},
			
	inLookup : function(theAd, thePage) {
		
		var ads = this.adlookup[thePage];
		
		for (var i=0, j=ads.length; ads && i<j; i++) {
			
		  if (ads[i].equals(theAd) && ads[i].visited) // hmmm??
		  	return true;
		}
		
		return false;
	},
	
	transform : function(toReplace, wnd) {
    	
    	// Ignore small ads...
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
        newElt.title = "Replaced by Adn";

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
						
						console.error("*** Error (adnparser), line: "+e.lineNumber);
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
					size = Math.max(size, parseInt(wnd.getComputedStyle(child, null).getPropertyValue(prop)));
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
	
    trimPath : function(u, max) {
		max = max || 60;
		if (u && u.length > max) 
			u = u.substring(0,max/2)+"..."+u.substring(u.length-max/2);
		return u;
	},
	
	restart : function() {
		this.adlookup = {};
		this.visitor.restart(this.adlookup);
	},
	
	stop : function() {
		this.adlookup = null;
    	this.visitor.stop();
    }

});

exports.AdParser = AdParser;
