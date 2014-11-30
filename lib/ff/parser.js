// Much of this class adapted from Add-Art (https://github.com/slambert/Add-Art)

const File = require("sdk/io/file");
const AdVisitor = require("./visitor").AdVisitor;
const Logger = require("../ffui/logger").Logger;
const Options = require("../ffui/options").Options;
const Cc = require("chrome").Cc, Ci = require("chrome").Ci;
const Data = require("sdk/self").data;

var AdParser =  require('sdk/core/heritage').Class({

	count : 0,
	elemHideMap : {},
	ignoreRE: /^(mailto|resource|javascript|about):/i,
	
	initialize : function(comp) {
		
		// load pre-existing adlookup here (ads stored in hash { page->[ad-objects] })
		this.adlookup = require("sdk/simple-storage").storage.adlookup || {};
	
		var ads = this.getAds();
		
		// start with ids beyond the previous max 
		this.count = Math.max(1,1+(Math.max.apply(Math, ads.map(function(ad) { return ad.id; }))));
		
// TMP: FOR TESTING UPDATES ONLY =============================================
if (require('../config').PARSER_TEST_MODE==='update') {
	
	for (var i=0, j=ads.length; i< j; i++) {
		
		ads[i].visitedTs = 0;
		ads[i].title = '*TEST* (pending)';
		ads[i].resolvedTargetUrl = null;
		
		console.warn('*TEST* resetting ad#'+ads[i].id);
	 }
}
else if (require('../config').PARSER_TEST_MODE) {

	console.warn('*TEST* ignoring stored ads');
	
	this.adlookup = {};
}
// ===========================================================================
 
		this.component = comp;
		this.visitor = AdVisitor(this);
		this.logStats();
	},
	
	logStats : function() {
	
		Logger.log('AdParser: '+
			+ this.getAds().length+' ads ('
			+ this.pendingAds().length+' pending, '
			+ this.failedAds().length+' errors)');
	},
	
	handleHiddenElement : function(url, selector) {
	    
	    if (!this.elemHideMap[url])
	       this.elemHideMap[url] = [];
	    
	    if (this.elemHideMap[url].indexOf(selector) < 0)
            this.elemHideMap[url].push(selector);
        
        //console.log("ElemHide: "+selector, this.elemHideMap);
	},

	/*
     *  Return false if the node SHOULD be blocked (accept=false) 
     *  TODO: Verify that we never return true when ABP would return false
     *  RUN FROM WITHIN ADBLOCK ***
     * 
	 *  TODO: This needs to be completely re-written
	 *  'type'-constants here: https://developer.mozilla.org/en-US/docs/XPCOM_Interface_Reference/nsIContentPolicy
	 */
    handleAd : function(wnd, node, type, loc, collapse, abpResult) {

		var parentUrl = wnd.wrappedJSObject.document.URL;
		
        //console.log('handleAd :'+type+","+loc.spec);
        
		if (type === this.elemHide) {
		    
            this.handleHiddenElement(parentUrl, loc.selector);
            return abpResult;
        }
 
        var rNode = this.findAdNode(node);
        
        if (!rNode || !rNode.parentNode || typeof rNode.wrappedJSObject == 'function')
        	return abpResult;

		var link = 'unknown', tag = rNode.tagName.toLowerCase();
		
		//Logger.log("TRANSFORMED: "+tag+' :: '+loc.spec+' :: '+type+' '+newNode._width+'x'+newNode._height);
	     
        if (tag === 'a') {  // TODO: DEAL WITH OTHER TAGS
        	
        	link = rNode.getAttribute("href");
        	
        	if (!this.ignoreRE.test(link)) {

                var currentTab = require("../ffui/uiman").UIManager.currentPage();
                
                 // DCH: changed parentUrl -> currentTab 11/11/14
	        	var ad = this.createAd(rNode, loc.spec/*image-url*/, currentTab/* page-url*/);
	        	
	        	if (!ad) {
	        	    
	        	    Logger.warn("Parser.createAd() fail: "+rNode+','+loc.spec+','+parentUrl);
	        	    return abpResult;
	        	}

	        	if (!this.adlookup[parentUrl]) // new page
                    this.adlookup[parentUrl] = [];
				
				
				var existing = this.inLookup(ad, parentUrl);
				if (!existing) {
					
					Logger.log("FOUND-AD: #"+ad.id+" "+ad.contentData);
					  //+'\n on '+ad.pageUrl+'\n OR '+currentTab);
					
					require("../ffui/uiman").UIManager.updateOnAdFound(ad);

	        		this.adlookup[parentUrl].push(ad);
				}
				else {
					
					// STATE: ad already exists (perhaps visited or not) in lookup table
					// TODO: Do we restamp it? If so, could be that 'ad.visitedTs' < 'ad.foundTs' 
					existing.foundTs = +new Date();  // TODO: this should be array of timestamps
					
					Logger.log("IGNORE: (ad-exists): "+ad.contentData);
				}
			}
        }
       	else {
       		
       		if (tag !== 'img' && tag !== 'link')
        	   Logger.log('UNHANDLED('+tag.toUpperCase()+"): "+(loc ? loc.spec : 'no url!'));
       	}
       	
        return abpResult; 
	},

	validateLink : function(s) {
		
      return (s==='#') || /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(s);
   	},
    
	createAd : function(rNode, theUrl, pageUrl, newNode) {

		var link = rNode.getAttribute("href"), 
            tries = 0;
		
		while (!this.validateLink(link)) { 
			
			if (!/^http/i.test(link)) {
				
				Logger.log("Relative Ad-target URL! -> "+link, theUrl, pageUrl);
				
				var parts = pageUrl.split('/'),
					absolute = parts[0]+'//'+parts[2],
					rellink = absolute + link;
					
				if (link !== rellink) {
					
					link = rellink;
					
					Logger.log("  ** trying:  "+rellink);
					
                    // don't follow more than 5 relative redirects
					if (++tries >= 5) {
					    
                        Logger.warn("*** (Hit max-tries) Invalid ad target! -> "+link);
                        return null;
                    }
					
					continue; // retry
				}
			}
			
			Logger.warn("Invalid ad target! -> "+link);
			
			return null;
		}
			        
		return { // Ad-Object
			
			id : ++this.count,
			attempts : 0, // new field
			visitedTs : 0,
			title : 'Ad title (pending)',  
			contentType : 'img', 
			contentData : theUrl, // img-src tag in most cases (was targetUrl)
			resolvedTargetUrl : null, 
			pageUrl : pageUrl,
			foundTs : +new Date(),
			targetUrl : link,
			errors : [],   	// any-errors
			path : [],      // redirects
			hidden : false,
			count : 1
		}
	},
	
			
	inLookup : function(theAd, thePage) {
		
		if (theAd) {
			
			var ads = this.adlookup[thePage];
			
			for (var i=0, j=ads.length; ads && i<j; i++) {
				
			  if ((ads[i].targetUrl===theAd.targetUrl && ads[i].contentData===theAd.contentData) && ads[i].visitedTs) // hmmm??
			  	return ads[i];
			}
		}
		
		return null;
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
		
		this.saveAdlookup();
		this.visitor.restart(this.adlookup = {}); 
	},
	
	saveAdlookup : function() {

		Logger.log('AdParser: serializing ad-data ('
		  + this.getAds().length+' ads) at ' + new Date());
		
		require("sdk/simple-storage").storage.adlookup = this.adlookup;
	},
	
	clearAds : function() {
		
		var adl = require("sdk/simple-storage").storage.adlookup,
			keys = Object.keys(adl);
		
		this.adlookup = {};

		// not sure if these deletes are needed
		for (var i = 0, j = keys.length; i < j; i++)
			delete adl[keys[i]];
		delete adl; 
		
		this.saveAdlookup();
		
		Logger.log("Cleared all Ads");
	},
		
	stop : function() {

    	this.visitor && (this.visitor.stop());
		this.saveAdlookup();
    	this.adlookup = { };
    },
   
	pause : function() {
		
		this.visitor && (this.visitor.pause());
    },
    
   	unpause : function() {
   		
		this.visitor && (this.visitor.unpause());
    },
		
	/*
	 * returns a (flattened) array of the ad hash, 
	 * filtered by the filter function if defiend
	 */
	getAds : function(filter) { 
		
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
	
	maxDdId : function(ads) { 
		
		//console.log('AdParser.getAds()');
		for (var k=0; k < ads.length; k++) {
			
			if (!filter || filter(ads[k])) 
				all.push(ads[k]);
		}
		return all;
	},

	pendingAds : function() { return this.getAds(function(ad) { return ad.visitedTs === 0 } )},
	
	visitedAds : function() { return this.getAds(function(ad) { return ad.visitedTs > 0 } )},
	
	failedAds : function() { return this.getAds(function(ad) { return ad.visitedTs < 0 } )},
		
	isAdnWorker : function(win) {

		if (win) cHandler = win.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell)
			.chromeEventHandler;
			
		return (cHandler && cHandler.hasAttribute("ADN"));
	}
});

exports.AdParser = AdParser;
