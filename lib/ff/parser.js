// Much of this class adapted from Add-Art (https://github.com/slambert/Add-Art)

const Cc = require("chrome").Cc, Ci = require("chrome").Ci;
const File = require("sdk/io/file");

const AdVisitor = require("./visitor").AdVisitor;
const Logger = require("./logger").Logger;
const Options = require("./options").Options;
const Data = require("sdk/self").data;

const LinkCheckRE = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
    
var AdParser =  require('sdk/core/heritage').Class({

	count : 0,
    visitor : null,
	adlookup : null,
	tabWorker : null,
    component : null,
	elemHideMap : {},
	 
    ignoreRE :  /^(mailto|resource|javascript|about):/i, 

	initialize : function(comp) {
		
		// load pre-existing adlookup here (ads stored in hash { page->[ad-objects] })
		this.adlookup = require("sdk/simple-storage").storage.adlookup || {};
	
		var ads = this.getAds();
		
		// start with ids beyond the previous max 
		this.count = Math.max(1,1+(Math.max.apply
            (Math, ads.map(function(ad) { return ad.id; }))));
		
		handleTestOptions();
		
		this.component = comp;
		this.visitor = AdVisitor(this);
		this.logStats();
	},
    
    // TODO: problem when reloading a page doesn't find any ads (all ads for the site are gone)
    //  options: a) leave as is
    //  options: b) use time-out adlookup[page], only clear when time X has passed 
    //  options: c) stores lastDeleted[page] for such cases
    onAttach : function(tab) { 
        
        var page = tab.url, title = tab.title;
        
        // always reset the page here to avoid duplicates?
        this.adlookup[page] = { page: page, title: title, ads: [] };

        console.log('RESET(parser): adlookup['+page+']');
    },
    
	logStats : function() {
	
		Logger.log('AdParser: '+
			+ this.getAds().length+' ads ('
			+ this.pendingAds().length+' pending, '
			+ this.failedAds().length+' errors)');
	},
	
	handleHiddenElement : function(url, selector) {
	            	     
	    if (!this.elemHideMap[url]) { // first hidden element for page
	        
	        var me = this, tab = require("./adnutil").AdnUtil.findTab(url);
	        
	        if (!tab) {
	           throw new Error("parser.handleHiddenElement: no tab "
	               + " for selector:   "+selector+"\nt\t\tON "+url);
            }
	           
	        tabWorker = tab.attach({
	            
                contentScriptFile: [ 
                    Data.url("lib/jquery-1.10.2.min.js"), 
                    Data.url("elemhide.js")
                ]
            });
            
            tabWorker.port.on("parsed-text-ad", function(ad) {

                me.makeAd(++me.count, me.getTitle(url), url, ad.targetUrl, 
                    { text: ad.text, site: ad.site, network: ad.network }, ad.title);                        
            });
            
            this.elemHideMap[url] = [];
        }
	    
	    if (this.elemHideMap[url].indexOf(selector) < 0) { // if (array-contains)
	        
            console.log("ElemHide: "+selector);
            
            this.elemHideMap[url].push(selector);
        }
	},

	/*
     *  RUN FROM WITHIN ADBLOCK ***
     *  Return false if the node SHOULD be blocked (accept=false) 
	 *  'type'-constants here: https://developer.mozilla.org/en-US/docs/XPCOM_Interface_Reference/nsIContentPolicy
	 */
    handleAd : function(wnd, node, type, loc, collapse, abpResult) {

        var parentUrl = wnd.wrappedJSObject.document.URL, 
            uiMan = require("./uiman").UIManager,
            currentTitle =  wnd.wrappedJSObject.document.title;

        if (currentTitle != this.getTitle(parentUrl))
            console.log("Title-mismatch: "+currentTitle+" != "+this.getTitle(parentUrl));
            
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
                
                 // DCH: changed parentUrl -> currentUrl 11/11/14 -> changed back 1/3/15
	        	 this.createAd(rNode, loc.spec/*image-url*/, parentUrl/* page-url*/, currentTitle);
			}
        }
       	else {
       		
       		if (tag !== 'img' && tag !== 'link')
        	   Logger.log('UNHANDLED('+tag.toUpperCase()+"): "+(loc ? loc.spec : 'no url!'));
       	}
       	
        return abpResult; 
	},
    
    // returns an array of ads for page or all ads in lookup
    getAds : function(page) {

        var Util = require("./adnutil").AdnUtil;
        return page ? this.adlookup[page].ads : Util.toAdArray(this.adlookup);
    },
    
    getTitle : function(page) {
        
        var entry = this.adlookup[page];
        return entry ? entry.title : 'No Title';
    },
                
	validateLink : function(s) {
		
      return (s === '#') || LinkCheckRE.test(s);
   	},
    
	createAd : function(rNode, theUrl, pageUrl, pageTitle) {

		var link = rNode.getAttribute("href"), tries = 0;
		
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

		return this.makeAd(++this.count, pageTitle, pageUrl, link, { src: theUrl });
	},
    
    makeAd : function(adId, pageTitle, pageUrl, targetUrl, contentData, adTitle) {
        
        var ad = new Ad(adId, pageTitle, pageUrl, targetUrl, contentData, adTitle);
        
        var existing = this.inLookup(ad, pageUrl);
        if (!existing) {
            
            if (ad.contentType === 'text')
                Logger.log("TEXT-AD: #"+ad.id+" "+ad.hashKey);
            else
                Logger.log("FOUND-AD: #"+ad.id+" "+ad.contentData.src);
            
            if (!this.adlookup[pageUrl])
                throw Error("No entry for: "+pageUrl+"\n\t\t"+Object.keys(this.adlookup));
                
            this.adlookup[pageUrl].ads.push(ad);
            
            require("./uiman").UIManager.updateOnAdFound(ad);            
        }
        else { // is this still needed?? or just replace the whole thing?
            
            // STATE: ad already exists (perhaps visited or not) in lookup table
            // for this page, so just rest the foundTs
            existing.foundTs = +new Date(); 
            Logger.log("IGNORE: (ad-exists): "+ad.contentData);
        }
        
        return ad;
    },
    
	inLookup : function(theAd, thePage) {
		
		var Util = require("./adnutil").AdnUtil,
		  hash = Util.computeHashKey(theAd), ads, entry;
		  
		if (theAd) {
			
			entry = this.adlookup[thePage];
			if (entry) {
			    
    			ads = entry.ads;
    			
    			for (var i=0, j=ads.length; ads && i<j; i++) {
    				
    			  if (Util.computeHashKey(ads[i]) === hash) // && visitedTs != 1
    			  	return ads[i];
    			}
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

	pendingAds : function() { return this.getAds().filter(function(ad) { return ad.visitedTs === 0 } )},
	
	visitedAds : function() { return this.getAds().filter(function(ad) { return ad.visitedTs > 0 } )},
	
	failedAds : function() { return this.getAds().filter(function(ad) { return ad.visitedTs < 0 } )},
		
	isAdnWorker : function(win) {

		if (win) cHandler = win.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell)
			.chromeEventHandler;
			
		return (cHandler && cHandler.hasAttribute("ADN"));
	}
});

function Ad(adId, pageTitle, pageUrl, targetUrl, contentData, adTitle) {

    //console.log('AD: ', pageTitle);//arguments);

    this.id = adId;
    this.title = 'Pending';
    this.attempts = 0;
    this.visitedTs = 0;
    this.foundTs = +new Date();
    this.contentData = contentData;
    this.contentType = adTitle ? 'text' : 'img';
    this.hashKey = pageUrl + '/' + contentData.src; // JSON.stringfy(contentData);
    this.pageTitle = pageTitle;
    this.pageUrl = pageUrl;
    this.resolvedTargetUrl; 
    this.targetUrl = targetUrl;
    this.errors = []; 
    this.path = [];    // redirects
    
    if (this.contentType === 'text') {
        
        this.title = adTitle;
        this.contentType = 'text';
        this.hashKey = pageUrl + '/' + adTitle + '/' +
            contentData.site + '/' + contentData.text;
    }    
} 

function handleTestOptions() {
    
    // TMP: FOR TESTING UPDATES ONLY =============================================
    if (require('../config').PARSER_TEST_MODE==='update') {
        
        for (var i=0, j=ads.length; i< j; i++) {
            
            ads[i].attempts = 0;
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
 }
 
exports.AdParser = AdParser;
