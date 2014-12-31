// Much of this class adapted from Add-Art (https://github.com/slambert/Add-Art)

const Cc = require("chrome").Cc, Ci = require("chrome").Ci;
const File = require("sdk/io/file");

const AdVisitor = require("./visitor").AdVisitor;
const Logger = require("../ffui/logger").Logger;
const Options = require("../ffui/options").Options;
const Data = require("sdk/self").data;

const ISLINK_RE = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
    
var AdParser =  require('sdk/core/heritage').Class({

	count : 0,
	tabWorker : null,
	elemHideMap : {},
	handleTextAds : true, 
    ignoreRE :  /^(mailto|resource|javascript|about):/i, 

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
	            
	    if (this.handleTextAds) {
	     
    	    if (!this.elemHideMap[url]) { // first hidden element for page
    	        
console.log("ATTACH-TAB-WORKER: "+url);
    	        
    	        var me = this, activeTab = require('sdk/tabs').activeTab;
    	        
    	        tabWorker = activeTab.attach({
    	            
                    contentScriptFile: [ Data.url("lib/jquery-1.10.2.min.js"), Data.url("elemhide.js") ]
                });
                
                tabWorker.port.on("parsed-text-ad", function(ad) {

                        var adObj = me.createTextAd(ad, activeTab);
                        me.processAd(adObj, adObj.pageUrl);

                });
                
                this.elemHideMap[url] = [];
            }
    	    
    	    if (this.elemHideMap && this.elemHideMap[url].indexOf(selector) < 0) {
    	        
                console.log("ElemHide: "+selector);
                
                this.elemHideMap[url].push(selector);
            }
        }
	},

	/*
     *  RUN FROM WITHIN ADBLOCK ***
     *  Return false if the node SHOULD be blocked (accept=false) 
	 *  'type'-constants here: https://developer.mozilla.org/en-US/docs/XPCOM_Interface_Reference/nsIContentPolicy
	 */
    handleAd : function(wnd, node, type, loc, collapse, abpResult) {

        var parentUrl = wnd.wrappedJSObject.document.URL, 
            uiMan = require("../ffui/uiman").UIManager,
            currentTitle = uiMan.currentPageTitle(), // BUG: quick tab switch breaks this 
            currentUrl = uiMan.currentPage(); // BUG: quick tab switch breaks this
            
        if (parentUrl !== currentUrl)  // only on iframes?
            console.log('IFRAME: "'+parentUrl+ "\n\tON "+currentUrl);

		if (type === this.elemHide) {
		    
            this.handleHiddenElement(currentUrl, loc.selector);
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
                
                 // DCH: changed parentUrl -> currentUrl 11/11/14
	        	var ad = this.createAd(rNode, loc.spec/*image-url*/, currentUrl/* page-url*/, currentTitle);
	        	
	        	if (!ad) { 
	        	    
	        	    Logger.warn("Parser.createAd() fail: "+rNode+','+loc.spec+','+parentUrl);
	        	    return abpResult;
	        	}

                this.processAd(ad, parentUrl /* TODO: Question: use parentUrl or currentUrl here ?*/ );
			}
        }
       	else {
       		
       		if (tag !== 'img' && tag !== 'link')
        	   Logger.log('UNHANDLED('+tag.toUpperCase()+"): "+(loc ? loc.spec : 'no url!'));
       	}
       	
        return abpResult; 
	},
    
    processAd : function(ad, pageUrl) {

        if (!this.adlookup[pageUrl]) // new page
            this.adlookup[pageUrl] = [];
        
        var existing = this.inLookup(ad, pageUrl);
        if (!existing) {
            
            if (ad.contentType === 'text')
                Logger.log("TEXT-AD: #"+ad.id+" "+ad.hashKey);
            else
                Logger.log("FOUND-AD: #"+ad.id+" "+ad.contentData.src);
              //+'\n on '+ad.pageUrl+'\n OR '+currentUrl);
            
            require("../ffui/uiman").UIManager.updateOnAdFound(ad);

            this.adlookup[pageUrl].push(ad);
        }
        else {
            
            // STATE: ad already exists (perhaps visited or not) in lookup table
            // TODO: Do we restamp it? If so, could be that 'ad.visitedTs' < 'ad.foundTs' 
            existing.foundTs = +new Date();  // TODO: this should be array of timestamps
            
            Logger.log("IGNORE: (ad-exists): "+ad.contentData);
        }
    },
            
	validateLink : function(s) {
		
      return (s === '#') || ISLINK_RE.test(s);
   	},
    
	createAd : function(rNode, theUrl, pageUrl, pageTitle) {

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
					    
                        Logger.warn("*** (Hit max-redirects-tries) Invalid target! -> "+link);
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
			contentData : { src: theUrl },
			resolvedTargetUrl : null, 
			hashKey : pageUrl + '/' + theUrl, // 'unique' key
			pageUrl : pageUrl,
			pageTitle : pageTitle,
			foundTs : +new Date(),
			targetUrl : link,
			errors : [],   	// any-errors
			path : [],      // redirects
			hidden : false,
			count : 1
		}
	},
	
    createTextAd : function(ad, tab) {
        
        //console.log('createTextAd1',ad, ad.site+"/"+ad.text);
        
        var pageUrl = tab.url, pageTitle = tab.title, adObj = { // Ad-Object
            
            id : ++this.count,
            attempts : 0, // new field
            visitedTs : 0,
            title : ad.title,  
            contentType : 'text',     // 'unique' key
            hashKey : pageUrl + '/' + ad.title + '/' + ad.site + '/' + ad.text,
            contentData : { text: ad.text, site: ad.site, network: ad.network },  
            resolvedTargetUrl : null, 
            pageUrl : pageUrl,
            pageTitle : pageTitle,
            foundTs : +new Date(),
            targetUrl : ad.targetUrl,
            errors : [],    // any-errors
            path : [],      // redirects
            hidden : false,
            count : 1
        };
        
       return adObj;
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
		this.elemHideMap = { };
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
